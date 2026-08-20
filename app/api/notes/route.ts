import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { appendAudit } from '@/lib/audit';
import { forbidden, getAuth, requireRoles, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/notes?patientId=
export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  // Query clinical notes from patient_timeline (event_type = 'note')
  const rows = patientId
    ? await query(
        `SELECT * FROM patient_timeline
         WHERE patient_id=$1 AND event_type='note'
         ORDER BY created_at DESC`,
        [patientId],
      )
    : [];

  return Response.json(rows);
}

// POST /api/notes — save a signed progress note
export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'dentist', 'admin')) return forbidden();

  const { patientId, noteText } = await request.json();
  if (!patientId || !noteText) {
    return Response.json({ error: 'patientId and noteText required' }, { status: 400 });
  }

  const hash = crypto
    .createHash('sha256')
    .update(noteText + user.name + Date.now())
    .digest('hex')
    .slice(0, 12);

  // Store note as a timeline event with type 'note'
  const [row] = await query(
    `INSERT INTO patient_timeline
       (patient_id, user_name, user_role, event_type, event, hash)
     VALUES ($1,$2,$3,'note',$4,$5)
     RETURNING *`,
    [patientId, user.name, user.role, noteText, hash],
  );

  await appendAudit(user, 'CREATE', `Progress Note for patient`, null, 'signed', user.clinic);

  return Response.json(row, { status: 201 });
}
