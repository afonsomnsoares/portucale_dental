'use client';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import {
  Avatar,
  Badge,
  Empty,
  FormField,
  GhostBtn,
  Inp,
  Modal,
  PageHeader,
  PrimaryBtn,
  RiskBadge,
  Sel,
  Spinner,
  Tabs,
  Timeline,
} from '@/components/ui';

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function stripBom(s) {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function detectDelimiter(line) {
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

function parseCsv(text, delimiter) {
  const out = [];
  const s = stripBom(String(text || ''))
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cur);
      cur = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cur);
      cur = '';
      const isAllEmpty = row.every((v) => String(v || '').trim() === '');
      if (!isAllEmpty) out.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (!row.every((v) => String(v || '').trim() === '')) out.push(row);
  return out;
}

export default function ReceptionPatientsPage() {
  const { api } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState('profile');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tlLoad, setTlLoad] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', dob: '', phone: '', email: '', insurance: '', alerts: '' });
  const [saving, setSaving] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [schemaFields, setSchemaFields] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [editExtra, setEditExtra] = useState(false);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraForm, setExtraForm] = useState({});
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importHeaders, setImportHeaders] = useState([]);
  const [importDelimiter, setImportDelimiter] = useState(',');
  const [importMapping, setImportMapping] = useState({
    name: '',
    dob: '',
    phone: '',
    email: '',
    insurance: '',
    alerts: '',
  });
  const [importCreateExtraFields, setImportCreateExtraFields] = useState(true);
  const [importUnmappedAsExtra, setImportUnmappedAsExtra] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState('');
  const [importRes, setImportRes] = useState(null);

  const loadPts = useCallback(async () => {
    setLoading(true);
    const d = await api(`/patients?q=${encodeURIComponent(search)}`).catch(() => []);
    setPatients(d || []);
    if (!selected && d?.length) select(d[0]);
    setLoading(false);
  }, [api, search, selected, select]);

  useEffect(() => {
    const t = setTimeout(loadPts, 300);
    return () => clearTimeout(t);
  }, [loadPts]);
  useEffect(() => {
    api('/schema')
      .then((d) => setSchemaFields((d || []).filter((f) => Number(f.rollout || 0) === 100)))
      .catch(() => {});
  }, [api]);

  async function select(p) {
    setSelected(p);
    setTab('profile');
    setTlLoad(true);
    const tl = await api(`/patients/${p.id}/timeline`).catch(() => []);
    setTimeline(tl || []);
    setTlLoad(false);
  }

  function fieldLabel(f) {
    return f.label || f.field_name;
  }

  function fieldOptions(f) {
    if (!f.enum_values) return [];
    if (Array.isArray(f.enum_values)) return f.enum_values;
    if (typeof f.enum_values === 'object') return Object.values(f.enum_values);
    return [];
  }

  function renderFieldInput(f, value, onChange) {
    const t = String(f.field_type || 'string');
    if (t === 'boolean') {
      return (
        <Sel value={String(!!value)} onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </Sel>
      );
    }
    if (t === 'enum') {
      const opts = fieldOptions(f);
      return (
        <Sel value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Sel>
      );
    }
    if (t === 'integer') {
      return (
        <Inp
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    }
    if (t === 'decimal') {
      return (
        <Inp
          type="number"
          step="0.01"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    }
    return <Inp value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={t} />;
  }

  async function create() {
    setCreateErr('');
    const required = (schemaFields || []).filter((f) => !!f.required);
    const payloadCustom = { ...(customFields || {}) };
    const missing = [];

    for (const f of required) {
      const key = f.field_name;
      const t = String(f.field_type || 'string');
      const v = payloadCustom[key];
      if (v === undefined || v === null || v === '') {
        if (t === 'boolean') payloadCustom[key] = false;
        else missing.push(fieldLabel(f));
      }
    }

    if (!form.name?.trim()) {
      setCreateErr('Patient name is required.');
      return;
    }
    if (missing.length) {
      setCreateErr(`Fill the required fields: ${missing.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const alerts = form.alerts
        ? form.alerts
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [];
      const p = await api('/patients', { method: 'POST', body: { ...form, alerts, customFields: payloadCustom } });
      setPatients((prev) => [p, ...prev]);
      setModal(false);
      setForm({ name: '', dob: '', phone: '', email: '', insurance: '', alerts: '' });
      setCustomFields({});
      select(p);
    } catch (e) {
      setCreateErr(e?.message || 'Failed to register patient.');
    } finally {
      setSaving(false);
    }
  }

  function openEditExtra() {
    const current = selected?.custom_fields && typeof selected.custom_fields === 'object' ? selected.custom_fields : {};
    setExtraForm({ ...current });
    setEditExtra(true);
  }

  async function saveExtra() {
    if (!selected) return;
    setExtraSaving(true);
    const updated = await api(`/patients/${selected.id}`, {
      method: 'PUT',
      body: { ...selected, customFields: extraForm },
    }).catch(() => null);
    if (updated) {
      setSelected(updated);
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setEditExtra(false);
    }
    setExtraSaving(false);
  }

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'timeline', label: 'Timeline' },
  ];

  function autoMap(headers) {
    const list = (headers || []).map((h) => ({ raw: h, key: normalizeKey(h) }));
    const pick = (syn) => {
      const synSet = new Set(syn.map(normalizeKey));
      const exact = list.find((h) => synSet.has(h.key));
      if (exact) return exact.raw;
      const contains = list.find((h) => syn.some((s) => h.key.includes(normalizeKey(s))));
      return contains?.raw || '';
    };
    return {
      name: pick(['name', 'nome', 'nome completo', 'paciente', 'patient']),
      dob: pick(['dob', 'data de nascimento', 'nascimento', 'birth date']),
      phone: pick(['phone', 'telefone', 'telemovel', 'telemóvel', 'tlm', 'mobile']),
      email: pick(['email', 'e-mail']),
      insurance: pick(['insurance', 'seguro', 'subsistema', 'adse', 'multicare', 'medis', 'médis']),
      alerts: pick(['alerts', 'alertas', 'alergias', 'alergia', 'allergies']),
    };
  }

  async function onPickImportFile(file) {
    setImportErr('');
    setImportRes(null);
    if (!file) return;
    const text: string = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('Failed to read file.'));
      r.readAsText(file);
    }).catch((e) => {
      setImportErr(e?.message || 'Failed to read file.');
      return '';
    });
    if (!text) return;
    const firstLine = stripBom(text).split(/\r?\n/)[0] || '';
    const delim = detectDelimiter(firstLine);
    const rows = parseCsv(text, delim);
    const headers = (rows[0] || []).map((h) => String(h || '').trim()).filter(Boolean);
    setImportCsv(text);
    setImportDelimiter(delim);
    setImportHeaders(headers);
    setImportMapping(autoMap(headers));
  }

  async function runImport() {
    setImportErr('');
    setImportRes(null);
    if (!importCsv.trim()) {
      setImportErr('Upload a CSV file first.');
      return;
    }
    if (!importMapping.name) {
      setImportErr('Map the Name column.');
      return;
    }
    setImportBusy(true);
    try {
      const res = await api('/patients/import', {
        method: 'POST',
        body: {
          csv: importCsv,
          delimiter: importDelimiter,
          mapping: importMapping,
          createMissingSchemaFields: importCreateExtraFields,
          importUnmappedAsCustom: importUnmappedAsExtra,
        },
      });
      setImportRes(res || null);
      await api('/schema')
        .then((d) => setSchemaFields((d || []).filter((f) => Number(f.rollout || 0) === 100)))
        .catch(() => {});
      await loadPts();
    } catch (e) {
      setImportErr(e?.message || 'Import failed.');
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Patient Registrar"
        sub="Global Identity Registry — search and manage all patients"
        action="+ Register Patient"
        onAction={() => setModal(true)}
      >
        <GhostBtn
          onClick={() => {
            setImportOpen(true);
            setImportErr('');
            setImportRes(null);
          }}
          style={{ padding: '8px 12px' }}
        >
          Import CSV
        </GhostBtn>
      </PageHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* List */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #EBECF0' }}>
            <input
              className="input"
              placeholder="Search name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {loading ? (
              <Spinner />
            ) : !patients.length ? (
              <Empty message="No patients found" />
            ) : (
              patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => select(p)}
                  style={{
                    padding: '11px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F4F7FA',
                    background: selected?.id === p.id ? '#DEEBFF' : 'white',
                    borderLeft: `3px solid ${selected?.id === p.id ? '#0052CC' : 'transparent'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>{p.name}</div>
                    {(p.no_show_score || 0) >= 30 && <RiskBadge score={p.no_show_score} />}
                  </div>
                  <div style={{ fontSize: 11, color: '#97A0AF', marginBottom: 3 }}>
                    #{p.global_seq} · <Badge s={p.status} />
                  </div>
                  {p.alerts?.filter(Boolean).length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#DE350B',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <AlertTriangle size={11} />
                      {p.alerts[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <div>
            {/* Header card */}
            <div className="card p-5 mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Avatar name={selected.name} size={48} color="#0052CC" />
                  <div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#172B4D',
                        fontFamily: '"Plus Jakarta Sans",sans-serif',
                      }}
                    >
                      {selected.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#97A0AF', marginBottom: 6 }}>
                      Global ID #{selected.global_seq} · {selected.dob?.slice(0, 10) || '—'} ·{' '}
                      {selected.insurance || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge s={selected.status} />
                      <RiskBadge score={selected.no_show_score || 0} />
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: Number(selected.balance) > 0 ? '#FF8B00' : '#00875A',
                      fontFamily: '"Plus Jakarta Sans",sans-serif',
                    }}
                  >
                    ${Number(selected.balance || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#97A0AF' }}>Outstanding balance</div>
                </div>
              </div>
              {selected.alerts?.filter(Boolean).length > 0 && (
                <div
                  style={{
                    background: '#FFEBE6',
                    border: '1px solid #FFBDAD',
                    borderRadius: 6,
                    padding: '8px 14px',
                    marginTop: 12,
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  {selected.alerts.filter(Boolean).map((a) => (
                    <span
                      key={a}
                      style={{
                        fontSize: 12,
                        color: '#DE350B',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <AlertTriangle size={12} />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Tabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === 'profile' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Phone', selected.phone || '—'],
                  ['Email', selected.email || '—'],
                  ['Last Visit', selected.last_visit?.slice(0, 10) || '—'],
                  ['Insurance', selected.insurance || '—'],
                  ['DOB', selected.dob?.slice(0, 10) || '—'],
                  ['Total Visits', selected.visit_count || 0],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="card"
                    style={{ padding: '14px 18px', boxShadow: 'none', border: '1px solid #DFE1E6' }}
                  >
                    <div className="section-label mb-1">{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#172B4D' }}>{v}</div>
                  </div>
                ))}
                {selected.custom_fields && Object.keys(selected.custom_fields).length > 0 && (
                  <div
                    className="card"
                    style={{
                      padding: '14px 18px',
                      boxShadow: 'none',
                      border: '1px solid #DFE1E6',
                      gridColumn: '1 / -1',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div className="section-label">Extra Fields</div>
                      <GhostBtn onClick={openEditExtra} style={{ padding: '6px 10px', fontSize: 12 }}>
                        Edit
                      </GhostBtn>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {Object.entries(selected.custom_fields).map(([k, v]) => {
                        const def = schemaFields.find((s) => s.field_name === k);
                        return (
                          <div key={k} style={{ border: '1px solid #F4F7FA', borderRadius: 8, padding: '10px 12px' }}>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#97A0AF',
                                fontWeight: 800,
                                letterSpacing: '.06em',
                                textTransform: 'uppercase',
                                marginBottom: 4,
                              }}
                            >
                              {def?.label || k}
                            </div>
                            <div style={{ fontSize: 13, color: '#172B4D', fontWeight: 600 }}>{String(v)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-5">
                <div className="section-label mb-4">MASTER PATIENT TIMELINE — IMMUTABLE · SHA-256 HASHED</div>
                {tlLoad ? <Spinner /> : <Timeline events={timeline} />}
              </div>
            )}
          </div>
        ) : (
          <Empty message="Select a patient to view their record" />
        )}
      </div>

      {modal && (
        <Modal title="Register New Patient" onClose={() => setModal(false)} width={520}>
          {createErr && (
            <div
              style={{
                background: '#FFEBE6',
                border: '1px solid #FFBDAD',
                color: '#DE350B',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              {createErr}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Full Name *">
              <Inp
                value={form.name}
                placeholder="John Doe"
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Date of Birth">
              <input
                type="date"
                className="input"
                value={form.dob}
                onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
              />
            </FormField>
            <FormField label="Phone">
              <Inp
                value={form.phone}
                placeholder="(212) 555-0000"
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </FormField>
            <FormField label="Email">
              <Inp
                type="email"
                value={form.email}
                placeholder="patient@email.com"
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Insurance">
            <Inp
              value={form.insurance}
              placeholder="BlueCross PPO"
              onChange={(e) => setForm((p) => ({ ...p, insurance: e.target.value }))}
            />
          </FormField>
          <FormField label="Medical Alerts" hint="Separate multiple alerts with commas">
            <Inp
              value={form.alerts}
              placeholder="Penicillin Allergy, Diabetes T2"
              onChange={(e) => setForm((p) => ({ ...p, alerts: e.target.value }))}
            />
          </FormField>

          {schemaFields.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EBECF0' }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#172B4D', marginBottom: 10 }}>Extra Fields</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {schemaFields.map((f) => (
                  <FormField key={f.id} label={`${fieldLabel(f)}${f.required ? ' *' : ''}`}>
                    {renderFieldInput(f, customFields[f.field_name], (v) =>
                      setCustomFields((prev) => ({ ...prev, [f.field_name]: v })),
                    )}
                  </FormField>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#97A0AF' }}>Configured by Admin in Schema Fields.</div>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <PrimaryBtn onClick={create} disabled={saving || !form.name}>
              {saving ? 'Registering…' : 'Register Patient'}
            </PrimaryBtn>
            <GhostBtn onClick={() => setModal(false)}>Cancel</GhostBtn>
          </div>
        </Modal>
      )}

      {editExtra && (
        <Modal title="Edit Extra Fields" onClose={() => setEditExtra(false)} width={560}>
          {schemaFields.length === 0 ? (
            <div style={{ fontSize: 13, color: '#97A0AF' }}>No extra fields configured.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {schemaFields.map((f) => (
                <FormField key={f.id} label={`${fieldLabel(f)}${f.required ? ' *' : ''}`}>
                  {renderFieldInput(f, extraForm[f.field_name], (v) =>
                    setExtraForm((prev) => ({ ...prev, [f.field_name]: v })),
                  )}
                </FormField>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-3">
            <PrimaryBtn onClick={saveExtra} disabled={extraSaving} style={{ justifyContent: 'center' }}>
              {extraSaving ? 'Saving…' : 'Save'}
            </PrimaryBtn>
            <GhostBtn onClick={() => setEditExtra(false)}>Cancel</GhostBtn>
          </div>
        </Modal>
      )}

      {importOpen && (
        <Modal title="Import Patients (CSV)" onClose={() => setImportOpen(false)} width={640}>
          {importErr && (
            <div
              style={{
                background: '#FFEBE6',
                border: '1px solid #FFBDAD',
                color: '#DE350B',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              {importErr}
            </div>
          )}

          <FormField label="CSV file" hint="Export from Excel as CSV (UTF-8). Semicolon-separated CSV is supported.">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onPickImportFile(e.target.files?.[0])} />
          </FormField>

          {importHeaders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Name column *">
                <Sel
                  value={importMapping.name}
                  onChange={(e) => setImportMapping((p) => ({ ...p, name: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
              <FormField label="DOB column">
                <Sel
                  value={importMapping.dob}
                  onChange={(e) => setImportMapping((p) => ({ ...p, dob: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
              <FormField label="Phone column">
                <Sel
                  value={importMapping.phone}
                  onChange={(e) => setImportMapping((p) => ({ ...p, phone: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
              <FormField label="Email column">
                <Sel
                  value={importMapping.email}
                  onChange={(e) => setImportMapping((p) => ({ ...p, email: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
              <FormField label="Insurance column">
                <Sel
                  value={importMapping.insurance}
                  onChange={(e) => setImportMapping((p) => ({ ...p, insurance: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
              <FormField label="Alerts column">
                <Sel
                  value={importMapping.alerts}
                  onChange={(e) => setImportMapping((p) => ({ ...p, alerts: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Sel>
              </FormField>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#172B4D' }}>
              <input
                type="checkbox"
                checked={importCreateExtraFields}
                onChange={(e) => setImportCreateExtraFields(e.target.checked)}
              />
              Auto-create extra fields for this clinic
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#172B4D' }}>
              <input
                type="checkbox"
                checked={importUnmappedAsExtra}
                onChange={(e) => setImportUnmappedAsExtra(e.target.checked)}
              />
              Import unmapped columns as extra fields
            </label>
          </div>

          {importRes && (
            <div
              style={{
                marginTop: 12,
                background: '#E3FCEF',
                border: '1px solid #ABF5D1',
                color: '#00875A',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Imported: {importRes.created} · Skipped: {importRes.skipped}
              {importRes.errors?.length ? ` · Errors: ${importRes.errors.length}` : ''}
            </div>
          )}

          <div className="flex gap-3 mt-3">
            <PrimaryBtn
              onClick={runImport}
              disabled={importBusy || !importCsv.trim()}
              style={{ justifyContent: 'center' }}
            >
              {importBusy ? 'Importing…' : 'Import'}
            </PrimaryBtn>
            <GhostBtn onClick={() => setImportOpen(false)}>Close</GhostBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}
