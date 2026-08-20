import type { NextRequest } from 'next/server';
import { forbidden, getAuth, unauthorized } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

function clampDate(s) {
  const v = String(s || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function GET(request: NextRequest) {
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!(await hasPermission(user, 'reports:read'))) return forbidden();

  const { searchParams } = new URL(request.url);
  const from = clampDate(searchParams.get('from')) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const to = clampDate(searchParams.get('to')) || new Date().toISOString().slice(0, 10);

  const requestedTenantId = searchParams.get('tenantId');
  const tenantId = user.role === 'admin' && !user.tenantId ? requestedTenantId : user.tenantId;
  if (!tenantId) return forbidden();

  const tenant = await queryOne(`SELECT id, name, operatories FROM tenants WHERE id=$1`, [tenantId]);
  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 });

  const apptCounts = await queryOne(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status='no-show')::int AS no_show
     FROM appointments
     WHERE tenant_id=$1
       AND appt_date BETWEEN $2::date AND $3::date`,
    [tenantId, from, to],
  );

  const txCounts = await queryOne(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status='completed')::int AS completed,
       COALESCE(SUM(fee) FILTER (WHERE status='completed'),0)::numeric AS completed_value
     FROM treatments
     WHERE tenant_id=$1
       AND created_at::date BETWEEN $2::date AND $3::date`,
    [tenantId, from, to],
  );

  const minutesRow = await queryOne(
    `SELECT COALESCE(SUM(duration),0)::int AS minutes
     FROM appointments
     WHERE tenant_id=$1
       AND appt_date BETWEEN $2::date AND $3::date
       AND status <> 'no-show'`,
    [tenantId, from, to],
  );

  const balanceRow = await queryOne(
    `SELECT COALESCE(SUM(balance),0)::numeric AS balance
     FROM patients
     WHERE tenant_id=$1`,
    [tenantId],
  );

  const ops = Math.max(1, Number(tenant.operatories || 1));
  const dayCount = Math.max(
    1,
    Math.floor((Number(new Date(`${to}T12:00:00Z`)) - Number(new Date(`${from}T12:00:00Z`))) / 86400000) + 1,
  );
  const workMinutes = 8 * 60;
  const utilization = Number(minutesRow.minutes || 0) / (ops * workMinutes * dayCount);

  const noShowRate = Number(apptCounts.no_show || 0) / Math.max(1, Number(apptCounts.total || 0));
  const conversionRate = Number(txCounts.completed || 0) / Math.max(1, Number(txCounts.total || 0));
  const completedValue = Number(txCounts.completed_value || 0);

  const dailyRevenue = await query(
    `SELECT updated_at::date AS day, COALESCE(SUM(fee),0)::numeric AS revenue
     FROM treatments
     WHERE tenant_id=$1
       AND status='completed'
       AND updated_at::date BETWEEN $2::date AND $3::date
     GROUP BY day
     ORDER BY day`,
    [tenantId, from, to],
  );

  return Response.json({
    tenant: { id: tenant.id, name: tenant.name, operatories: ops },
    range: { from, to, dayCount },
    metrics: {
      appointmentsTotal: Number(apptCounts.total || 0),
      noShows: Number(apptCounts.no_show || 0),
      noShowRate,
      treatmentsTotal: Number(txCounts.total || 0),
      treatmentsCompleted: Number(txCounts.completed || 0),
      conversionRate,
      completedValue,
      chairMinutes: Number(minutesRow.minutes || 0),
      chairUtilization: utilization,
      outstandingBalance: Number(balanceRow.balance || 0),
    },
    dailyRevenue,
  });
}
