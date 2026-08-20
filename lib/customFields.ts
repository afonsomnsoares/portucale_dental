import { isUuid } from './validate';

export function normalizeCustomFields(schemaRows, customFields) {
  const live: any[] = (schemaRows || []).filter((f: any) => Number(f.rollout || 0) === 100);
  const allowed = new Map(live.map((f: any) => [f.field_name, f]));
  const required = live.filter((f: any) => f.required).map((f: any) => f.field_name);
  const incoming = customFields && typeof customFields === 'object' ? customFields : {};
  const filtered: Record<string, any> = {};

  for (const [k, v] of Object.entries(incoming)) {
    const def = allowed.get(k);
    if (!def) continue;
    const t = String(def.field_type || 'string');
    if (t === 'boolean') filtered[k] = !!v;
    else if (t === 'integer') {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      filtered[k] = Math.trunc(n);
    } else if (t === 'decimal') {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      filtered[k] = n;
    } else if (t === 'uuid_ref') {
      if (!isUuid(v)) continue;
      filtered[k] = String(v);
    } else if (t === 'enum') {
      const opts = Array.isArray(def.enum_values)
        ? def.enum_values
        : def.enum_values
          ? Object.values(def.enum_values)
          : [];
      const sv = String(v || '');
      if (opts.length && !opts.includes(sv)) continue;
      filtered[k] = sv;
    } else {
      filtered[k] = String(v ?? '');
    }
  }

  for (const k of required) {
    if (filtered[k] === undefined || filtered[k] === null || filtered[k] === '') {
      return { error: `Missing required field: ${k}` };
    }
  }

  return { value: filtered };
}
