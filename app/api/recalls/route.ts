import type { NextRequest } from 'next/server';
import { appendAudit, appendTimeline } from '@/lib/audit';
import { getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const dueBefore = searchParams.get('dueBefore');

  let sql = `SELECT r.*, p.name AS patient_name
             FROM recalls r
             JOIN patients p ON p.id = r.patient_id
             WHERE 1=1`;
  const vals = [];
  if (patientId) {
    vals.push(patientId);
    sql += ` AND r.patient_id=$${vals.length}`;
  }
  if (dueBefore) {
    vals.push(dueBefore);
    sql += ` AND r.active=TRUE AND r.next_due <= $${vals.length}::date`;
  }
  if (user.tenantId) {
    vals.push(user.tenantId);
    sql += ` AND r.tenant_id=$${vals.length}`;
  }
  sql += ' ORDER BY r.next_due';

  const rows = await query(sql, vals);
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!user.tenantId) return unauthorized();
  const body = await request.json();
  const { patientId, recallType, intervalMonths, lastDone, nextDue, notes } = body;

  if (!patientId || !recallType) {
    return Response.json({ error: 'patientId and recallType required' }, { status: 400 });
  }

  const [row] = await query(
    `INSERT INTO recalls
       (tenant_id, patient_id, recall_type, interval_months, last_done, next_due, notes, active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8)
     RETURNING *`,
    [
      user.tenantId,
      patientId,
      recallType,
      intervalMonths || 6,
      lastDone || null,
      nextDue || null,
      notes || '',
      user.id,
    ],
  );

  await appendTimeline(patientId, user, 'admin', `Recall set: ${recallType} every ${intervalMonths || 6} months`);
  await appendAudit(user, 'CREATE', `Recall: ${recallType}`, null, `patient:${patientId}`, user.clinic);

  return Response.json(row, { status: 201 });
}
