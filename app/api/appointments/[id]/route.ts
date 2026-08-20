import { appendAudit, appendTimeline } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!(await hasPermission(user, 'appointments:update'))) return forbidden();

  const { id } = await params;
  const tenantId = user.role === 'admin' && !user.tenantId ? null : user.tenantId;
  if (!tenantId) return forbidden();

  const body = await request.json();
  const prev = await queryOne(`SELECT * FROM appointments WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
  if (!prev) return Response.json({ error: 'Not found' }, { status: 404 });

  const dentistId = body.dentistId ?? body.dentist_id ?? prev.dentist_id;
  if (dentistId) {
    const d = await queryOne(`SELECT id FROM users WHERE id=$1 AND role='dentist' AND active=TRUE AND tenant_id=$2`, [
      dentistId,
      tenantId,
    ]);
    if (!d) return Response.json({ error: 'Invalid dentist' }, { status: 400 });
  }

  const chair = body.chair ?? prev.chair;
  const duration = body.duration ?? prev.duration;
  const apptDate = body.date ?? body.appt_date ?? prev.appt_date;
  const startTime = body.startTime ?? body.start_time ?? prev.start_time;

  const [updated] = await query(
    `UPDATE appointments
     SET dentist_id=$1, chair=$2, appt_date=$3, start_time=$4, duration=$5, type=$6, notes=$7
     WHERE id=$8 AND tenant_id=$9
     RETURNING *`,
    [
      dentistId,
      Math.max(1, Number(chair || 1)),
      apptDate,
      startTime,
      Math.max(5, Number(duration || 30)),
      body.type ?? prev.type,
      body.notes ?? prev.notes,
      id,
      tenantId,
    ],
  );

  const full = await queryOne(
    `SELECT a.*, p.name as patient_name, d.name as dentist_name,
            ROUND((p.no_show_count::numeric / NULLIF(p.visit_count,0)) * 100) as risk_score
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users d ON d.id = a.dentist_id
     WHERE a.id=$1`,
    [updated.id],
  );

  await appendAudit(user, 'UPDATE', `Appointment — edit`, null, String(updated.id).slice(0, 8), user.clinic);
  if (updated.patient_id) {
    await appendTimeline(
      updated.patient_id,
      user,
      'admin',
      `Appointment updated: ${String(updated.appt_date).slice(0, 10)} ${String(updated.start_time).slice(0, 5)} · ${updated.type}`,
    );
  }

  return Response.json(full || updated);
}

export async function DELETE(request, { params }) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!(await hasPermission(user, 'appointments:cancel'))) return forbidden();

  const { id } = await params;
  const tenantId = user.role === 'admin' && !user.tenantId ? null : user.tenantId;
  const prev = await queryOne(`SELECT * FROM appointments WHERE id=$1 AND ($2::uuid IS NULL OR tenant_id=$2::uuid)`, [
    id,
    tenantId,
  ]);
  if (!prev) return Response.json({ error: 'Not found' }, { status: 404 });

  await query(`DELETE FROM appointments WHERE id=$1 AND ($2::uuid IS NULL OR tenant_id=$2::uuid)`, [id, tenantId]);
  await appendAudit(
    user,
    'DELETE',
    `Appointment: ${prev.patient_name || prev.patient_id} — ${prev.type}`,
    prev.status,
    null,
    user.clinic,
  );
  if (prev.patient_id) {
    await appendTimeline(
      prev.patient_id,
      user,
      'admin',
      `Appointment removed: ${prev.type} on ${String(prev.appt_date).slice(0, 10)} at ${String(prev.start_time).slice(0, 5)}`,
    );
  }

  return Response.json({ deleted: true });
}
