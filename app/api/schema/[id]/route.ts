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
  const { label, description, required, enumValues, fieldType } = await request.json();
  const ev = Array.isArray(enumValues) ? enumValues.filter(Boolean).map(String) : null;
  const allowedTypes = new Set(['string', 'boolean', 'integer', 'decimal', 'enum', 'uuid_ref']);
  const nextType = fieldType && allowedTypes.has(String(fieldType)) ? String(fieldType) : null;
  const nextEnum = nextType && nextType !== 'enum' ? null : ev ? JSON.stringify(ev) : null;

  const [updated] = await query(
    `UPDATE schema_fields
     SET label=$1, description=$2, required=$3,
         field_type=COALESCE($4, field_type),
         enum_values=$5::jsonb
     WHERE id=$6
     RETURNING *`,
    [label || null, description || null, !!required, nextType, nextEnum, id],
  );

  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  await appendAudit(user, 'UPDATE', `Schema field: ${updated.field_name}`, null, 'updated');
  return Response.json(updated);
}
