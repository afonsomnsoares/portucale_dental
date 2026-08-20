import type { NextRequest } from 'next/server';
import { appendAudit } from '@/lib/audit';
import { forbidden, getAuth, requireRoles, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'admin')) return forbidden();
  if (!(await hasPermission(user, 'tenants:manage'))) return forbidden();
  const rows = await query(
    `SELECT t.*, (SELECT COUNT(*) FROM patients p WHERE p.tenant_id=t.id)::int as patients
     FROM tenants t ORDER BY t.created_at`,
  );
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!requireRoles(user, 'admin')) return forbidden();
  if (!(await hasPermission(user, 'tenants:manage'))) return forbidden();
  const { name, city, operatories } = await request.json();
  const ops = Math.max(1, Math.min(20, Number(operatories || 3)));
  const [t] = await query(
    `INSERT INTO tenants (name, city, operatories, status) VALUES ($1,$2,$3,'provisioning') RETURNING *`,
    [name, city, ops],
  );
  await appendAudit(user, 'PROVISION', `Tenant: ${name}`, null, 'provisioning');
  return Response.json(t, { status: 201 });
}
