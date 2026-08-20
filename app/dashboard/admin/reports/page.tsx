'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import { GhostBtn, MetricCard, PageHeader, Sel, Spinner } from '@/components/ui';

function pct(v) {
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

export default function ReportsPage() {
  const { api } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/tenants')
      .then((t) => {
        setTenants(t || []);
        if ((t || []).length) setTenantId(t[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  async function load() {
    if (!tenantId) return;
    setErr('');
    setData(null);
    const params = new URLSearchParams();
    params.set('tenantId', tenantId);
    params.set('from', from);
    params.set('to', to);
    const res = await api(`/reports/summary?${params.toString()}`).catch((e) => {
      setErr(e?.message || 'Failed to load');
      return null;
    });
    setData(res);
  }

  useEffect(() => {
    if (tenantId) load();
  }, [tenantId, load]);

  return (
    <div>
      <PageHeader title="Reports" sub="Clinic performance summary">
        {loading ? (
          <Spinner />
        ) : (
          <Sel value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ maxWidth: 320 }}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Sel>
        )}
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="input"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="input"
          style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}
        />
        <GhostBtn onClick={load} style={{ padding: '8px 12px' }}>
          Refresh
        </GhostBtn>
      </PageHeader>

      {err && (
        <div
          className="card p-4"
          style={{ border: '1px solid #FFBDAD', background: '#FFEBE6', color: '#DE350B', fontWeight: 700 }}
        >
          {err}
        </div>
      )}

      {!data ? (
        <div className="card p-5">
          {loading ? <Spinner /> : <div style={{ color: '#97A0AF' }}>Select a tenant to load reports.</div>}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
            <MetricCard
              label="No-show rate"
              value={pct(data.metrics.noShowRate)}
              sub={`${data.metrics.noShows} / ${data.metrics.appointmentsTotal} appointments`}
              color="#DE350B"
            />
            <MetricCard
              label="Treatment conversion"
              value={pct(data.metrics.conversionRate)}
              sub={`${data.metrics.treatmentsCompleted} / ${data.metrics.treatmentsTotal} treatments`}
              color="#0052CC"
            />
            <MetricCard
              label="Chair utilization"
              value={pct(data.metrics.chairUtilization)}
              sub={`${data.tenant.operatories} operatories · ${data.metrics.chairMinutes} min`}
              color="#00875A"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <MetricCard
              label="Outstanding balance"
              value={`$${Number(data.metrics.outstandingBalance).toLocaleString()}`}
              sub="All patients"
              color="#FF8B00"
            />
            <MetricCard
              label="Completed value"
              value={`$${Number(data.metrics.completedValue || 0).toLocaleString()}`}
              sub={`${data.range.from} → ${data.range.to}`}
              color="#5243AA"
            />
          </div>
        </>
      )}
    </div>
  );
}
