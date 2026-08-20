import { forbidden, getAuth, requireRoles, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request, { params }) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'admin', 'dentist')) return forbidden();
  const { id } = await params;
  const rows = await query(
    `SELECT tooth_num, condition, surfaces, notes FROM teeth WHERE patient_id=$1 ORDER BY tooth_num`,
    [id],
  );
  // Return as object keyed by tooth number
  const map = {};
  for (let i = 1; i <= 32; i++) map[i] = { condition: 'healthy', surfaces: [], notes: '' };
  for (const r of rows) map[r.tooth_num] = { condition: r.condition, surfaces: r.surfaces, notes: r.notes };
  return Response.json(map);
}
