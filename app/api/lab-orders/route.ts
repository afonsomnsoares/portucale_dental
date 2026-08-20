import type { NextRequest } from 'next/server';
import { appendAudit, appendTimeline } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const status = searchParams.get('status');

  let sql = `SELECT l.*, p.name AS patient_name
             FROM lab_orders l
             JOIN patients p ON p.id = l.patient_id
             WHERE 1=1`;
  const vals = [];
  if (patientId) {
    vals.push(patientId);
    sql += ` AND l.patient_id=$${vals.length}`;
  }
  if (status) {
    vals.push(status);
    sql += ` AND l.status=$${vals.length}`;
  }
  if (user.tenantId) {
    vals.push(user.tenantId);
    sql += ` AND l.tenant_id=$${vals.length}`;
  }
  sql += ' ORDER BY l.created_at DESC';

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
  const { patientId, labName, caseType, toothNums, description, instructions, dueDate, fee } = body;

  if (!patientId || !labName) {
    return Response.json({ error: 'patientId and labName required' }, { status: 400 });
  }

  const [row] = await query(
    `INSERT INTO lab_orders
       (tenant_id, patient_id, lab_name, case_type, tooth_nums, description, instructions, due_date, fee, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ordered',$10)
     RETURNING *`,
    [
      user.tenantId,
      patientId,
      labName,
      caseType || '',
      toothNums || '',
      description || '',
      instructions || '',
      dueDate || null,
      fee || 0,
      user.id,
    ],
  );

  await appendTimeline(patientId, user, 'clinical', `Lab order created: ${caseType || labName} — ${labName}`);
  await appendAudit(user, 'CREATE', `Lab order: ${labName} — ${caseType || 'N/A'}`, null, 'ordered', user.clinic);

  return Response.json(row, { status: 201 });
}
