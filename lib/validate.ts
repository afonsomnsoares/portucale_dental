export function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''));
}

export function asString(v, { trim = true, max = 2000 } = {}) {
  if (v === undefined || v === null) return null;
  let s = String(v);
  if (trim) s = s.trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}

export function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function asInt(v, { min, max }: { min?: number; max?: number } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int !== n) return null;
  if (min !== undefined && int < min) return null;
  if (max !== undefined && int > max) return null;
  return int;
}

export function asDate(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function asTime(v) {
  if (!v) return null;
  const s = String(v).slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null;
}

export function asEmail(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

export function asPhone(v) {
  if (!v) return null;
  const s = String(v).trim();
  return s.length <= 30 ? s : null;
}

export function asEnum(v, values) {
  if (!v || !Array.isArray(values)) return null;
  const s = String(v).trim();
  return values.includes(s) ? s : null;
}

export function asFee(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 999999.99 ? Math.round(n * 100) / 100 : null;
}

export function requireFields(obj, fields) {
  const missing = [];
  for (const f of fields) {
    const v = obj?.[f];
    if (v === undefined || v === null || v === '') missing.push(f);
  }
  return missing;
}

export function validateAppointmentBody(body) {
  const errors = [];
  if (body.date && !asDate(body.date)) errors.push('Invalid date format (use YYYY-MM-DD)');
  if (body.startTime && !asTime(body.startTime)) errors.push('Invalid startTime format (use HH:MM)');
  if (body.duration !== undefined && asInt(body.duration, { min: 5, max: 480 }) === null)
    errors.push('duration must be between 5 and 480 minutes');
  if (body.chair !== undefined && asInt(body.chair, { min: 1, max: 99 }) === null)
    errors.push('chair must be between 1 and 99');
  if (body.type && String(body.type).length > 100) errors.push('type too long (max 100 chars)');
  if (body.patientName && String(body.patientName).length > 200) errors.push('patientName too long (max 200 chars)');
  return errors.length ? errors : null;
}

export function validatePatientBody(body) {
  const errors = [];
  if (!body.name || String(body.name).trim().length < 1) errors.push('name is required');
  if (String(body.name || '').length > 200) errors.push('name too long (max 200 chars)');
  if (body.dob && !asDate(body.dob)) errors.push('Invalid dob format (use YYYY-MM-DD)');
  if (body.email && !asEmail(body.email)) errors.push('Invalid email format');
  if (body.phone && String(body.phone).length > 30) errors.push('phone too long (max 30 chars)');
  if (body.insurance && String(body.insurance).length > 100) errors.push('insurance too long (max 100 chars)');
  return errors.length ? errors : null;
}

export function validateTreatmentBody(body) {
  const errors = [];
  if (!body.patientId) errors.push('patientId is required');
  if (!body.description || String(body.description).trim().length < 1) errors.push('description is required');
  if (body.toothNum !== undefined && body.toothNum !== null && asInt(body.toothNum, { min: 1, max: 32 }) === null)
    errors.push('toothNum must be 1-32');
  if (body.fee !== undefined && asFee(body.fee) === null) errors.push('Invalid fee value');
  return errors.length ? errors : null;
}

export function sanitizeString(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}
