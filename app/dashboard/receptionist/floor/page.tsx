'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/providers';
import { Badge, GhostBtn, PageHeader, RiskBadge, Spinner } from '@/components/ui';

const CHAIR_COLORS = ['#0052CC', '#00875A', '#FF8B00'];
const WAITING_SEATS = 8;

function toMins(t = '00:00') {
  const p = String(t).slice(0, 5).split(':');
  return (+p[0] || 0) * 60 + (+p[1] || 0);
}

function ChairGraphic({ color, occupied }) {
  return (
    <div style={{ width: 64, height: 64, position: 'relative', opacity: occupied ? 1 : 0.45 }}>
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          top: 6,
          height: 24,
          borderRadius: 10,
          background: occupied ? `${color}1A` : '#F4F7FA',
          border: `2px solid ${occupied ? `${color}55` : '#DFE1E6'}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          top: 30,
          height: 18,
          borderRadius: 10,
          background: occupied ? `${color}22` : '#F4F7FA',
          border: `2px solid ${occupied ? `${color}66` : '#DFE1E6'}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 6,
          width: 10,
          height: 16,
          borderRadius: 6,
          background: occupied ? `${color}66` : '#DFE1E6',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 14,
          bottom: 6,
          width: 10,
          height: 16,
          borderRadius: 6,
          background: occupied ? `${color}66` : '#DFE1E6',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 28,
          width: 8,
          height: 18,
          borderRadius: 6,
          background: occupied ? `${color}55` : '#DFE1E6',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 6,
          top: 28,
          width: 8,
          height: 18,
          borderRadius: 6,
          background: occupied ? `${color}55` : '#DFE1E6',
        }}
      />
    </div>
  );
}

export default function LiveFloorPage() {
  const { api, settings, user } = useAuth() || {};
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  const load = useCallback(async () => {
    const isInitial = syncedAt == null;
    if (isInitial) setLoading(true);
    const a = await api('/appointments').catch(() => []);
    setAppts(a || []);
    setSyncedAt(new Date());
    if (isInitial) setLoading(false);
  }, [api, syncedAt]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => {
      load();
    }, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function setStatus(apt, nextStatus) {
    setUpdatingId(apt.id);
    try {
      const updated = await api(`/appointments/${apt.id}/status`, {
        method: 'PUT',
        body: { status: nextStatus },
      }).catch(() => null);
      if (updated) {
        setAppts((prev) => prev.map((a) => (a.id === apt.id ? { ...a, ...updated } : a)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const STATUS_TRANSITIONS = settings?.STATUS_TRANSITIONS || {};
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const syncedLabel = syncedAt ? syncedAt.toTimeString().slice(0, 5) : '';

  const todays = useMemo(() => {
    return (appts || []).slice().sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
  }, [appts]);

  const active = useMemo(() => {
    return todays.filter((a) => !['departed', 'no-show'].includes(a.status));
  }, [todays]);

  const waiting = useMemo(() => {
    return todays.filter((a) => ['registered', 'waiting'].includes(a.status));
  }, [todays]);

  const chairs = useMemo(() => {
    const n = Math.max(1, Number(user?.operatories || 3));
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [user?.operatories]);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Live Floor"
        sub={`${active.length} appointment${active.length !== 1 ? 's' : ''} active · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}${syncedLabel ? ` · synced ${syncedLabel}` : ''}`}
      >
        <GhostBtn onClick={load} style={{ padding: '8px 12px' }}>
          Refresh
        </GhostBtn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card" style={{ padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#172B4D' }}>Operatory</div>
                <div style={{ fontSize: 12, color: '#97A0AF' }}>Treatment chairs in real time</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {chairs.slice(0, 6).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: CHAIR_COLORS[i % CHAIR_COLORS.length],
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {chairs.map((chair, index) => {
                const color = CHAIR_COLORS[index % CHAIR_COLORS.length];
                const chairAppts = todays.filter((a) => Number(a.chair) === chair);
                const current =
                  chairAppts.find((a) => ['in-operatory', 'procedure-active', 'ready-dismissal'].includes(a.status)) ||
                  null;
                const nextScheduled =
                  chairAppts.find(
                    (a) => ['confirmed', 'registered', 'waiting'].includes(a.status) && toMins(a.start_time) >= nowMins,
                  ) || null;

                return (
                  <div
                    key={chair}
                    style={{
                      border: '1px solid #EBECF0',
                      borderRadius: 14,
                      padding: '14px 14px 12px',
                      background: 'white',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ChairGraphic color={color} occupied={!!current} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#172B4D' }}>
                            {current ? current.patient_name || '—' : 'Available'}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#97A0AF',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 170,
                            }}
                          >
                            {current
                              ? `${String(current.start_time || '').slice(0, 5)} · ${current.type}`
                              : nextScheduled
                                ? `Next ${String(nextScheduled.start_time || '').slice(0, 5)} · ${nextScheduled.patient_name || '—'}`
                                : 'No next'}
                          </div>
                          {current?.dentist_name && (
                            <div
                              style={{
                                fontSize: 11,
                                color: '#97A0AF',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 170,
                              }}
                            >
                              {current.dentist_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{ width: 10, height: 10, borderRadius: 999, background: current ? color : '#DFE1E6' }}
                      />
                    </div>

                    {current && (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <Badge s={current.status} />
                          {(current.risk_score || 0) >= 30 && <RiskBadge score={current.risk_score} />}
                        </div>

                        {(() => {
                          const transitions = STATUS_TRANSITIONS[current.status] || [];
                          const next = transitions[0] || null;
                          const canNoShow = transitions.includes('no-show');
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <button
                                disabled={!next || updatingId === current.id}
                                onClick={() => next && setStatus(current, next)}
                                style={{
                                  width: '100%',
                                  background: next ? color : '#EBECF0',
                                  color: next ? 'white' : '#97A0AF',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '9px 0',
                                  fontSize: 11,
                                  fontWeight: 900,
                                  cursor: !next || updatingId === current.id ? 'not-allowed' : 'pointer',
                                  fontFamily: 'inherit',
                                  opacity: updatingId === current.id ? 0.7 : 1,
                                }}
                              >
                                {updatingId === current.id ? 'Updating…' : next ? `→ ${next.replace(/-/g, ' ')}` : '—'}
                              </button>
                              <button
                                disabled={!canNoShow || updatingId === current.id}
                                onClick={() => canNoShow && setStatus(current, 'no-show')}
                                style={{
                                  width: '100%',
                                  background: canNoShow ? '#FFEBE6' : '#F4F7FA',
                                  color: canNoShow ? '#DE350B' : '#C1C7D0',
                                  border: `1px solid ${canNoShow ? '#FFBDAD' : '#EBECF0'}`,
                                  borderRadius: 8,
                                  padding: '9px 0',
                                  fontSize: 11,
                                  fontWeight: 900,
                                  cursor: !canNoShow || updatingId === current.id ? 'not-allowed' : 'pointer',
                                  fontFamily: 'inherit',
                                  opacity: updatingId === current.id ? 0.7 : 1,
                                }}
                              >
                                No-show
                              </button>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#172B4D' }}>Waiting Room</div>
                <div style={{ fontSize: 12, color: '#97A0AF' }}>
                  {waiting.length} patient{waiting.length !== 1 ? 's' : ''} waiting
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {Array.from({ length: WAITING_SEATS }).map((_, i) => {
                const apt = waiting[i] || null;
                const color = CHAIR_COLORS[(Number(apt?.chair || 1) - 1) % CHAIR_COLORS.length] || CHAIR_COLORS[0];
                const occupied = !!apt;
                return (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #EBECF0',
                      borderRadius: 14,
                      padding: '12px 12px 10px',
                      background: 'white',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <ChairGraphic color={color} occupied={occupied} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: occupied ? '#172B4D' : '#97A0AF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {occupied ? apt.patient_name || '—' : 'Available'}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#97A0AF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {occupied ? `${String(apt.start_time || '').slice(0, 5)} · ${apt.type}` : '—'}
                      </div>
                      {occupied && apt.dentist_name && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#97A0AF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {apt.dentist_name}
                        </div>
                      )}
                      {occupied && (
                        <div
                          style={{
                            marginTop: 6,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Badge s={apt.status} />
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {waiting.length > WAITING_SEATS && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#97A0AF', fontWeight: 700 }}>
                +{waiting.length - WAITING_SEATS} waiting (not shown)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
