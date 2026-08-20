import crypto from 'node:crypto';
import { query } from './db';

export function hashEntry(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

export async function appendAudit(user, action, resource, before = null, after = null, clinic = null) {
  const entry: any = {
    user_name: user.name,
    user_role: user.role,
    clinic: clinic || user.clinic || 'Tower',
    action,
    resource,
    before_val: before ? String(before) : null,
    after_val: after ? String(after) : null,
  };
  entry.hash = hashEntry(entry);
  await query(
    `INSERT INTO audit_log (user_name, user_role, clinic, action, resource, before_val, after_val, hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      entry.user_name,
      entry.user_role,
      entry.clinic,
      entry.action,
      entry.resource,
      entry.before_val,
      entry.after_val,
      entry.hash,
    ],
  );
}

export async function appendTimeline(patientId, user, eventType, event) {
  const h = hashEntry({ patientId, event, user: user.name, ts: Date.now() });
  await query(
    `INSERT INTO patient_timeline (patient_id, user_name, user_role, event_type, event, hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [patientId, user.name, user.role, eventType, event, h],
  );
}
