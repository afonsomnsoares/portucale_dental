import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { appendAudit, appendTimeline } from '@/lib/audit';
import { forbidden, getAuth, requireRoles, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

function digitsOnly(v) {
  return String(v || '').replace(/[^\d]/g, '');
}

function computeNextRetry(attempts) {
  const base = 5 * 60 * 1000;
  const delay = base * Math.min(64, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + delay).toISOString();
}

async function sendWhatsAppTemplate({ to, template, lang, params }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp provider not configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).' };
  }
  if (!template) {
    return { ok: false, error: 'Missing WHATSAPP_TEMPLATE_NAME.' };
  }
  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: lang || 'en_US' },
        components: [
          {
            type: 'body',
            parameters: (params || []).map((t) => ({ type: 'text', text: String(t ?? '') })),
          },
        ],
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || data?.message || `WhatsApp error (${res.status})` };
  }
  const msgId = data?.messages?.[0]?.id || null;
  return { ok: true, id: msgId };
}

async function logJobRun(jobName, status, details) {
  const [row] = await query(`INSERT INTO job_runs (job_name, status, details) VALUES ($1,$2,$3::jsonb) RETURNING *`, [
    jobName,
    status,
    JSON.stringify(details || {}),
  ]);
  return row;
}

async function queueAppointmentReminders(tenantId) {
  const template = process.env.WHATSAPP_TEMPLATE_NAME || 'appointment_reminder';
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';
  const rows = await query(
    `SELECT a.id as appointment_id, a.patient_id, a.appt_date, a.start_time, a.type,
            p.name as patient_name, p.phone as patient_phone,
            t.name as tenant_name
     FROM appointments a
     JOIN patients p ON p.id=a.patient_id
     JOIN tenants t ON t.id=a.tenant_id
     WHERE a.tenant_id=$1
       AND a.appt_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '2 days')::date
       AND a.status IN ('confirmed','registered','waiting')`,
    [tenantId],
  );

  let queued = 0;
  for (const r of rows) {
    const phone = digitsOnly(r.patient_phone);
    if (!phone) continue;
    const exists = await queryOne(
      `SELECT 1 FROM notifications
       WHERE tenant_id=$1 AND appointment_id=$2 AND channel='whatsapp'
         AND payload->>'kind'='appointment_reminder'
       LIMIT 1`,
      [tenantId, r.appointment_id],
    );
    if (exists) continue;

    const date = String(r.appt_date).slice(0, 10);
    const time = String(r.start_time).slice(0, 5);
    const params = [r.patient_name, r.tenant_name, date, time, r.type];
    await query(
      `INSERT INTO notifications
         (tenant_id, patient_id, appointment_id, channel, to_addr, payload, status, next_retry_at)
       VALUES ($1,$2,$3,'whatsapp',$4,$5::jsonb,'queued',NOW())`,
      [
        tenantId,
        r.patient_id,
        r.appointment_id,
        phone,
        JSON.stringify({ kind: 'appointment_reminder', template, lang, params }),
      ],
    );
    queued += 1;
  }
  return { queued, scanned: rows.length };
}

async function sendDueNotifications(tenantId, limit = 25) {
  const rows = await query(
    `SELECT * FROM notifications
     WHERE tenant_id=$1
       AND status IN ('queued','retry')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER BY created_at
     LIMIT $2`,
    [tenantId, limit],
  );

  let sent = 0;
  let failed = 0;
  for (const n of rows) {
    const payload = n.payload || {};
    const phone = String(n.to_addr || '');
    const template = payload.template;
    const lang = payload.lang;
    const params = payload.params || [];

    const result = await sendWhatsAppTemplate({ to: phone, template, lang, params });
    if (result.ok) {
      await query(
        `UPDATE notifications
         SET status='sent', provider_id=$1, sent_at=NOW(), attempts=attempts+1, last_error=NULL
         WHERE id=$2`,
        [result.id, n.id],
      );
      await appendTimeline(
        n.patient_id,
        { name: 'System', role: 'admin' },
        'admin',
        `Notification sent (WhatsApp): ${payload.kind || 'unknown'}`,
      );
      sent += 1;
    } else {
      const nextRetry = computeNextRetry(Number(n.attempts || 0) + 1);
      const nextStatus = Number(n.attempts || 0) + 1 >= 5 ? 'failed' : 'retry';
      await query(
        `UPDATE notifications
         SET status=$1, attempts=attempts+1, last_error=$2, next_retry_at=$3::timestamptz
         WHERE id=$4`,
        [nextStatus, result.error || 'Send failed', nextRetry, n.id],
      );
      failed += 1;
    }
  }
  return { processed: rows.length, sent, failed };
}

async function cleanupUploads() {
  const expired = await query(
    `SELECT id, storage, storage_key FROM uploads
     WHERE storage='local' AND expires_at IS NOT NULL AND expires_at < NOW()
     ORDER BY expires_at
     LIMIT 500`,
  );
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  let removed = 0;
  for (const u of expired) {
    try {
      await unlink(path.join(uploadsDir, u.storage_key));
    } catch {}
    await query(`DELETE FROM uploads WHERE id=$1`, [u.id]);
    removed += 1;
  }

  const days = Number(process.env.UPLOAD_RETENTION_DAYS || 90);
  const cutoff = Date.now() - (Number.isFinite(days) && days > 0 ? days * 86400000 : 90 * 86400000);
  let scanned = 0;
  let swept = 0;
  try {
    const files = await readdir(uploadsDir).catch(() => []);
    for (const f of files) {
      scanned += 1;
      const full = path.join(uploadsDir, f);
      const st = await stat(full).catch(() => null);
      if (!st) continue;
      if (st.isFile() && st.mtimeMs < cutoff) {
        await unlink(full).catch(() => {});
        swept += 1;
      }
    }
  } catch {}

  return { removed, scanned, swept };
}

async function nightlySummary(tenantId) {
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const apptCounts = await queryOne(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status='no-show')::int AS no_show
     FROM appointments WHERE tenant_id=$1 AND appt_date=$2::date`,
    [tenantId, y],
  );
  const revenue = await queryOne(
    `SELECT COALESCE(SUM(paid),0)::numeric AS revenue
     FROM invoices WHERE tenant_id=$1 AND invoice_date=$2::date`,
    [tenantId, y],
  );
  return {
    day: y,
    appointments: Number(apptCounts.total || 0),
    noShows: Number(apptCounts.no_show || 0),
    revenue: Number(revenue.revenue || 0),
  };
}

export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'admin')) return forbidden();
  if (!(await hasPermission(user, 'jobs:run'))) return forbidden();

  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job') || 'all';
  const requestedTenantId = searchParams.get('tenantId');
  const tenantId = user.role === 'admin' && !user.tenantId ? requestedTenantId : user.tenantId;
  if (!tenantId) return forbidden();

  const details: Record<string, unknown> = {};
  try {
    if (job === 'all' || job === 'reminders') {
      details.appointmentReminders = await queueAppointmentReminders(tenantId);
    }
    if (job === 'all' || job === 'send') {
      details.send = await sendDueNotifications(tenantId, 50);
    }
    if (job === 'all' || job === 'retention') {
      details.retention = await cleanupUploads();
    }
    if (job === 'all' || job === 'summary') {
      details.summary = await nightlySummary(tenantId);
    }
    await logJobRun(job, 'completed', details);
    await appendAudit(user, 'UPDATE', `Jobs run: ${job}`, null, 'completed', user.clinic);
    return Response.json({ ok: true, job, tenantId, details });
  } catch (e) {
    await logJobRun(job, 'failed', { error: e?.message || String(e) });
    return Response.json({ ok: false, error: e?.message || 'Job failed' }, { status: 500 });
  }
}
