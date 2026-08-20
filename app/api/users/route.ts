import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { appendAudit } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { query } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();
  if (!(await hasPermission(user, 'users:manage'))) return forbidden();

  const rows = await query(`
    SELECT u.id, u.email, u.name, u.role, u.clinic, u.active, u.created_at, u.tenant_id, t.name as tenant_name 
    FROM users u
    LEFT JOIN tenants t ON t.id = u.tenant_id
    ORDER BY u.created_at DESC
  `);
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();
  if (!(await hasPermission(user, 'users:manage'))) return forbidden();

  const { email, password, name, role, clinic, tenantId } = await request.json();

  if (!email || !password || !name || !role) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (role === 'admin') {
    return Response.json({ error: 'Cannot create Super Admin users here' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await query(
      `INSERT INTO users (email, password, name, role, clinic, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, clinic, active, tenant_id`,
      [email, hashedPassword, name, role, clinic || 'Main Clinic', tenantId || null],
    );

    await appendAudit(user, 'CREATE', `User — ${newUser.email}`, null, newUser.role, user.clinic);
    return Response.json(newUser, { status: 201 });
  } catch (err) {
    if (err.code === '23505') {
      // unique violation
      return Response.json({ error: 'Email already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
