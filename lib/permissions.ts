import { query, queryOne } from './db';

export const PERMISSION_ACTIONS = [
  'patients:create',
  'patients:update',
  'appointments:create',
  'appointments:update',
  'appointments:cancel',
  'appointments:status',
  'treatments:create',
  'treatments:update',
  'treatments:delete',
  'uploads:create',
  'schema:manage',
  'users:manage',
  'tenants:manage',
  'audit:read',
  'reports:read',
  'permissions:manage',
  'jobs:run',
  'invoices:create',
  'invoices:read',
  'invoices:update',
  'invoices:pay',
  'finance:read',
];

const DEFAULT = {
  admin: new Set(PERMISSION_ACTIONS),
  receptionist: new Set([
    'patients:create',
    'patients:update',
    'appointments:create',
    'appointments:update',
    'appointments:cancel',
    'appointments:status',
    'reports:read',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:pay',
    'finance:read',
  ]),
  dentist: new Set([
    'appointments:status',
    'treatments:create',
    'treatments:update',
    'treatments:delete',
    'uploads:create',
    'reports:read',
  ]),
};

export function defaultAllows(role, action) {
  const set = DEFAULT[String(role || '')];
  return !!set?.has(action);
}

async function safeQueryOne(sql, params = []) {
  try {
    return await queryOne(sql, params);
  } catch (e) {
    if (e?.code === '42P01') return null;
    throw e;
  }
}

async function safeQuery(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (e) {
    if (e?.code === '42P01') return [];
    throw e;
  }
}

export async function permissionOverride(tenantId, role, action) {
  if (!tenantId) return null;
  const row = await safeQueryOne(`SELECT allowed FROM role_permissions WHERE tenant_id=$1 AND role=$2 AND action=$3`, [
    tenantId,
    role,
    action,
  ]);
  if (!row) return null;
  return !!row.allowed;
}

export async function hasPermission(user, action) {
  if (!user) return false;
  const role = String(user.role || '');
  if (role === 'admin' && !user.tenantId) return true;
  const tenantId = user.tenantId || null;
  const override = await permissionOverride(tenantId, role, action);
  if (override !== null) return override;
  return defaultAllows(role, action);
}

export async function getPermissionMatrix(tenantId) {
  const roles = ['receptionist', 'dentist', 'admin'];
  const rows = await safeQuery(`SELECT role, action, allowed FROM role_permissions WHERE tenant_id=$1`, [tenantId]);
  const map = new Map(rows.map((r) => [`${r.role}:${r.action}`, !!r.allowed]));
  const matrix = {};
  for (const role of roles) {
    matrix[role] = {};
    for (const action of PERMISSION_ACTIONS) {
      const key = `${role}:${action}`;
      const def = defaultAllows(role, action);
      const ovr = map.has(key) ? map.get(key) : null;
      matrix[role][action] = {
        default: def,
        override: ovr,
        effective: ovr === null ? def : ovr,
      };
    }
  }
  return { roles, actions: PERMISSION_ACTIONS, matrix };
}

export async function setPermissionOverrides(tenantId, updates) {
  for (const u of updates || []) {
    const role = String(u.role || '');
    const action = String(u.action || '');
    if (!role || !action) continue;
    if (!PERMISSION_ACTIONS.includes(action)) continue;
    if (u.allowed === null) {
      await safeQuery(`DELETE FROM role_permissions WHERE tenant_id=$1 AND role=$2 AND action=$3`, [
        tenantId,
        role,
        action,
      ]);
    } else {
      await safeQuery(
        `INSERT INTO role_permissions (tenant_id, role, action, allowed)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tenant_id, role, action)
         DO UPDATE SET allowed=EXCLUDED.allowed`,
        [tenantId, role, action, !!u.allowed],
      );
    }
  }
}
