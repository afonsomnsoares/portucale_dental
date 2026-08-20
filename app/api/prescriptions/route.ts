import type { NextRequest } from 'next/server';
import { appendAudit, appendTimeline } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  let sql = `SELECT p.*, pat.name AS patient_name
             FROM prescriptions p
             JOIN patients pat ON pat.id = p.patient_id
             WHERE 1=1`;
  const vals = [];
  if (patientId) {
    vals.push(patientId);
    sql += ` AND p.patient_id=$${vals.length}`;
  }
  if (user.tenantId) {
    vals.push(user.tenantId);
    sql += ` AND p.tenant_id=$${vals.length}`;
  }
  sql += ' ORDER BY p.created_at DESC';

  const rows = await query(sql, vals);
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!user.tenantId) return forbidden();
  const body = await request.json();
  const { patientId, medication, dosage, frequency, route, duration, quantity, refills, instructions, notes } = body;

  if (!patientId || !medication) {
    return Response.json({ error: 'patientId and medication required' }, { status: 400 });
  }

  const [row] = await query(
    `INSERT INTO prescriptions
       (tenant_id, patient_id, medication, dosage, frequency, route, duration, quantity, refills, instructions, notes, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12)
     RETURNING *`,
    [
      user.tenantId,
      patientId,
      medication,
      dosage || '',
      frequency || '',
      route || '',
      duration || '',
      quantity || 0,
      refills || 0,
      instructions || '',
      notes || '',
      user.id,
    ],
  );

  await appendTimeline(patientId, user, 'clinical', `Prescription created: ${medication} ${dosage} ${frequency}`);
  await appendAudit(user, 'CREATE', `Prescription: ${medication}`, null, 'active', user.clinic);

  return Response.json(row, { status: 201 });
}
