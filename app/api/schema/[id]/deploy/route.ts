import { appendAudit } from '@/lib/audit';
import { forbidden, getAuth, requireRoles, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'admin')) return forbidden();
  if (!(await hasPermission(user, 'schema:manage'))) return forbidden();
  const { id } = await params;
  const [f] = await query(`UPDATE schema_fields SET rollout=100, pushed_at=CURRENT_DATE WHERE id=$1 RETURNING *`, [id]);
  if (!f) return Response.json({ error: 'Not found' }, { status: 404 });
  await appendAudit(user, 'UPDATE', `Schema field: ${f.field_name} deployed`, '0%', '100%');
  return Response.json(f);
}
