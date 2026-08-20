'use client';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import PatientNotesTab from '@/components/dentist/PatientNotesTab';
import { Avatar, Badge, Empty, Inp, PageHeader, RiskBadge, Sel, Spinner, Tabs, Timeline } from '@/components/ui';

export default function DentistPatientsPage() {
  const { api, user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [schemaFields, setSchemaFields] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api(`/patients?q=${encodeURIComponent(search)}`).catch(() => []);
    setPatients(d || []);
    if (!selected && d?.length) select(d[0]);
    setLoading(false);
  }, [api, search, selected, select]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    api('/schema')
      .then((d) => setSchemaFields((d || []).filter((f) => Number(f.rollout || 0) === 100)))
      .catch(() => {});
  }, [api]);

  async function select(p) {
    setSelected(p);
    setTab('overview');
    const [tl, tr, n] = await Promise.all([
      api(`/patients/${p.id}/timeline`).catch(() => []),
      api(`/treatments?patientId=${p.id}`).catch(() => []),
      api(`/notes?patientId=${p.id}`).catch(() => []),
    ]);
    setTimeline(tl || []);
    setTreatments(tr || []);
    setNotes(n || []);
  }

  function _fieldLabel(f) {
    return f.label || f.field_name;
  }

  function fieldOptions(f) {
    if (!f.enum_values) return [];
    if (Array.isArray(f.enum_values)) return f.enum_values;
    if (typeof f.enum_values === 'object') return Object.values(f.enum_values);
    return [];
  }

  function _renderFieldInput(f, value, onChange) {
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

  async function refreshTimeline() {
    if (!selected) return;
    const tl = await api(`/patients/${selected.id}/timeline`).catch(() => null);
    if (tl) setTimeline(tl || []);
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'treatments', label: `Treatments (${treatments.length})` },
    { key: 'notes', label: `Notes (${notes.length})` },
    { key: 'timeline', label: 'Timeline' },
  ];

  return (
    <div>
      <PageHeader title="Patients" sub="Clinical patient records — full history and chart data" />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
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
              <Empty message="No patients" />
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
                    <RiskBadge score={p.no_show_score || 0} />
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

        {selected ? (
          <div>
            <div className="card p-5 mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Avatar name={selected.name} size={50} color="#0052CC" />
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
                      #{selected.global_seq} · {selected.dob?.slice(0, 10) || '—'} · {selected.insurance || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Badge s={selected.status} />
                      <RiskBadge score={selected.no_show_score || 0} />
                      <span style={{ fontSize: 11, color: '#97A0AF' }}>{selected.visit_count || 0} visits</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: Number(selected.balance) > 0 ? '#FF8B00' : '#00875A',
                      fontFamily: '"Plus Jakarta Sans",sans-serif',
                    }}
                  >
                    ${Number(selected.balance || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#97A0AF' }}>Balance</div>
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

            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Phone', selected.phone || '—'],
                  ['Email', selected.email || '—'],
                  ['Last Visit', selected.last_visit?.slice(0, 10) || '—'],
                  ['Insurance', selected.insurance || '—'],
                  ['DOB', selected.dob?.slice(0, 10) || '—'],
                  ['No-Show Count', `${selected.no_show_count || 0} of ${selected.visit_count || 0}`],
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
            )}

            {tab === 'treatments' && (
              <div className="card p-5">
                <div className="section-label mb-4">TREATMENT HISTORY</div>
                {!treatments.length ? (
                  <Empty message="No treatments recorded." />
                ) : (
                  treatments.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid #F4F7FA',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#DEEBFF',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#0052CC',
                        }}
                      >
                        {t.tooth_num ? `#${t.tooth_num}` : '—'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>{t.description}</div>
                        <div style={{ fontSize: 11, color: '#97A0AF' }}>
                          {t.treatment_code || '—'} · Phase {t.phase}
                        </div>
                      </div>
                      <Badge s={t.status} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>
                        ${Number(t.fee).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'timeline' && (
              <div className="card p-5">
                <div className="section-label mb-4">MASTER PATIENT TIMELINE — IMMUTABLE · SHA-256 HASHED</div>
                <Timeline events={timeline} />
              </div>
            )}

            {tab === 'notes' && (
              <PatientNotesTab
                api={api}
                user={user}
                patientId={selected.id}
                notes={notes}
                setNotes={setNotes}
                refreshTimeline={refreshTimeline}
              />
            )}
          </div>
        ) : (
          <Empty message="Select a patient to view their clinical record" />
        )}
      </div>
    </div>
  );
}
