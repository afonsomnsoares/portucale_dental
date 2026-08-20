import bcrypt from 'bcryptjs';
import { appendAudit } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const authUser = getAuth(request);
  if (!authUser) return unauthorized();
  if (authUser.role !== 'admin') return forbidden();
  if (!(await hasPermission(authUser, 'users:manage'))) return forbidden();

  const { id } = await params;
  const targetId = id;
  const { email, password, name, role, clinic, tenantId, active } = await request.json();

  if (!email || !name || !role) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const existing = await query(`SELECT id, role FROM users WHERE id=$1`, [targetId]);
    if (!existing.length) return Response.json({ error: 'User not found' }, { status: 404 });
    const existingRole = existing[0].role;
    if (existingRole !== 'admin' && role === 'admin') {
      return Response.json({ error: 'Cannot promote user to Super Admin' }, { status: 400 });
    }
    const roleToSave = existingRole === 'admin' ? 'admin' : role;

    let rows: Awaited<ReturnType<typeof query>>;
    const tId = tenantId || null;
    const cName = clinic || 'Main Clinic';
    const isActive = active !== false;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      rows = await query(
        `UPDATE users SET email=$1, name=$2, role=$3, clinic=$4, tenant_id=$5, active=$6, password=$7 
         WHERE id=$8 RETURNING id, email, name, role, clinic, active`,
        [email, name, roleToSave, cName, tId, isActive, hashedPassword, targetId],
      );
    } else {
      rows = await query(
        `UPDATE users SET email=$1, name=$2, role=$3, clinic=$4, tenant_id=$5, active=$6 
         WHERE id=$7 RETURNING id, email, name, role, clinic, active`,
        [email, name, roleToSave, cName, tId, isActive, targetId],
      );
    }

    if (!rows.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = rows[0];

    const [withTenant] = await query(
      `SELECT u.id, u.email, u.name, u.role, u.clinic, u.active, u.created_at, u.tenant_id, t.name as tenant_name 
       FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`,
      [updatedUser.id],
    );

    await appendAudit(
      authUser,
      'UPDATE',
      `User Profile — ${updatedUser.email}`,
      null,
      updatedUser.role,
      authUser.clinic,
    );
    return Response.json(withTenant, { status: 200 });
  } catch (err) {
    if (err.code === '23505') {
      // unique violation
      return Response.json({ error: 'Email already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
