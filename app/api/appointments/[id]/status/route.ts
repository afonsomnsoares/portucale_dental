import { appendAudit, appendTimeline } from '@/lib/audit';
import { forbidden, getAuth, requireSameOrigin, unauthorized } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
  const originCheck = requireSameOrigin(request);
  if (originCheck) return originCheck;
  const user = getAuth(request);
  if (!user) return unauthorized();
  if (!(await hasPermission(user, 'appointments:status'))) return forbidden();
  const { id } = await params;
  const { status } = await request.json();

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM appointments WHERE id=$1 FOR UPDATE`, [id]);
    const apt = rows[0];
    if (!apt) return { error: 'Not found', status: 404 };

    const { rows: statusRows } = await client.query(`SELECT transitions FROM statuses WHERE key=$1`, [apt.status]);
    const allowed = statusRows[0]?.transitions || [];

    if (!allowed.includes(status)) return { error: `Cannot transition ${apt.status} → ${status}`, status: 400 };

    const { rows: updatedRows } = await client.query(`UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *`, [
      status,
      id,
    ]);
    const updated = updatedRows[0];

    const ptStatusMap = {
      waiting: 'waiting',
      'in-operatory': 'in-operatory',
      'procedure-active': 'in-operatory',
      'ready-dismissal': 'ready-dismissal',
      departed: 'departed',
    };
    if (ptStatusMap[status]) {
      await client.query(`UPDATE patients SET status=$1 WHERE id=$2`, [ptStatusMap[status], apt.patient_id]);
    }
    if (status === 'departed') {
      await client.query(`UPDATE patients SET visit_count = visit_count + 1, last_visit = CURRENT_DATE WHERE id=$1`, [
        apt.patient_id,
      ]);
    } else if (status === 'no-show') {
      await client.query(`UPDATE patients SET no_show_count = no_show_count + 1 WHERE id=$1`, [apt.patient_id]);
    }

    return { apt, updated };
  });

  if (result.error) return Response.json({ error: result.error }, { status: result.status });

  const msgs = {
    waiting: 'Checked in — status: Waiting',
    'in-operatory': 'Record opened — In Operatory',
    'procedure-active': 'Procedure Active on tooth map',
    'ready-dismissal': 'Dentist finished — Ready for Dismissal',
    departed: 'Patient departed',
    'no-show': 'Marked as no-show',
  };
  await appendTimeline(
    result.apt.patient_id,
    user,
    status === 'ready-dismissal' ? 'clinical' : 'admin',
    msgs[status] || `Status → ${status}`,
  );
  await appendAudit(user, 'UPDATE', `Appointment — status`, result.apt.status, status, user.clinic);
  return Response.json(result.updated);
}
