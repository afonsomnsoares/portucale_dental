'use client';
import { AlertTriangle, Check, Inbox, Info } from 'lucide-react';
import { useAuth } from '@/app/providers';

const FALLBACK_STATUS = {
  confirmed: { label: 'Confirmada', bg: 'var(--brand-bg)', color: 'var(--brand)' },
  registered: { label: 'Registada', bg: 'var(--surface-2)', color: 'var(--ink-2)' },
  waiting: { label: 'A aguardar', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  'in-operatory': { label: 'Em Consultório', bg: 'var(--brand-bg)', color: 'var(--brand)' },
  'procedure-active': { label: 'Procedimento Ativo', bg: 'var(--red-bg)', color: 'var(--red)' },
  'ready-dismissal': { label: 'Pronto para Saída', bg: 'var(--green-bg)', color: 'var(--green)' },
  departed: { label: 'Saiu', bg: 'var(--teal-bg)', color: 'var(--teal)' },
  'no-show': { label: 'Não Compareceu', bg: 'var(--red-bg)', color: 'var(--red)' },
  active: { label: 'Ativo', bg: 'var(--green-bg)', color: 'var(--green)' },
  provisioning: { label: 'A provisionar', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  suspended: { label: 'Suspenso', bg: 'var(--red-bg)', color: 'var(--red)' },
  completed: { label: 'Concluído', bg: 'var(--green-bg)', color: 'var(--green)' },
  accepted: { label: 'Aceite', bg: 'var(--brand-bg)', color: 'var(--brand)' },
  proposed: { label: 'Proposto', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  paid: { label: 'Pago', bg: 'var(--green-bg)', color: 'var(--green)' },
  partial: { label: 'Parcial', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  pending: { label: 'Pendente', bg: 'var(--red-bg)', color: 'var(--red)' },
  proposto: { label: 'Proposto', bg: 'var(--amber-bg)', color: 'var(--amber)' },
  aceite: { label: 'Aceite', bg: 'var(--brand-bg)', color: 'var(--brand)' },
  concluído: { label: 'Concluído', bg: 'var(--green-bg)', color: 'var(--green)' },
};

export function Badge({ s, label, color, bg }: any) {
  const { settings } = useAuth() || {};
  const STATUS = settings?.STATUS_META || FALLBACK_STATUS;
  const m = s ? STATUS[s] || { label: s, bg: 'var(--surface-2)', color: 'var(--ink-2)' } : { label, bg, color };
  return (
    <span className="badge" style={{ background: m.bg, color: m.color }}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: m.color,
          display: 'inline-block',
          marginRight: 5,
          flexShrink: 0,
        }}
      />
      {m.label}
    </span>
  );
}

export function RiskBadge({ score = 0 }) {
  const cfg =
    score >= 60
      ? ['var(--red-bg)', 'var(--red)', 'ALTO']
      : score >= 30
        ? ['var(--amber-bg)', 'var(--amber)', 'MÉDIO']
        : ['var(--green-bg)', 'var(--green)', 'BAIXO'];
  return (
    <span className="badge" style={{ background: cfg[0], color: cfg[1] }}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg[1],
          display: 'inline-block',
          marginRight: 5,
        }}
      />
      {score}% {cfg[2]}
    </span>
  );
}

export function Card({ children, className = '', style = {}, onClick }: any) {
  return (
    <div className={`card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sub, color = 'var(--brand)', icon }: any) {
  return (
    <div className="card p-5" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="section-label mb-2">{label}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
              lineHeight: 1.05,
              fontFamily: '"Plus Jakarta Sans",sans-serif',
            }}
          >
            {value ?? '—'}
          </div>
          {sub && (
            <div className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
              {sub}
            </div>
          )}
        </div>
        {icon && <div style={{ fontSize: 22, opacity: 0.28 }}>{icon}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, action, onAction, children }: any) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--ink)',
            lineHeight: 1.15,
            fontFamily: '"Plus Jakarta Sans",sans-serif',
          }}
        >
          {title}
        </h1>
        {sub && (
          <p className="text-sm mt-1.5" style={{ color: 'var(--ink-2)' }}>
            {sub}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {children}
        {action && (
          <button className="btn btn-primary" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

export function TH({ children, right }: any) {
  return (
    <th className="data-th" style={{ textAlign: right ? 'right' : 'left' }}>
      {children}
    </th>
  );
}
export function TD({ children, bold, color, mono, right, nowrap, muted }: any) {
  return (
    <td
      className="data-td"
      style={{
        fontWeight: bold ? 600 : 400,
        color: muted ? 'var(--ink-2)' : color || 'var(--ink)',
        fontFamily: mono ? '"JetBrains Mono",monospace' : 'inherit',
        textAlign: right ? 'right' : 'left',
        fontSize: mono ? 12 : 13,
        whiteSpace: nowrap ? 'nowrap' : 'normal',
      }}
    >
      {children}
    </td>
  );
}
export function DataTable({ cols = [], rows = [] }) {
  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className="data-th">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function PrimaryBtn({ children, onClick, disabled, className = '', style = {} }: any) {
  return (
    <button className={`btn btn-primary ${className}`} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}
export function GhostBtn({ children, onClick, className = '', style = {} }: any) {
  return (
    <button className={`btn btn-ghost ${className}`} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
export function SecondaryBtn({ children, onClick, className = '', style = {} }: any) {
  return (
    <button className={`btn btn-secondary ${className}`} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
export function DangerBtn({ children, onClick, className = '', style = {} }: any) {
  return (
    <button className={`btn btn-danger ${className}`} onClick={onClick} style={style}>
      {children}
    </button>
  );
}

export function Inp({ style = {}, className = '', ...props }) {
  return <input className={`input ${className}`} style={style} {...props} />;
}
export function Sel({ children, style = {}, className = '', ...props }) {
  return (
    <select className={`select ${className}`} style={style} {...props}>
      {children}
    </select>
  );
}
export function Textarea({ style = {}, className = '', ...props }) {
  return (
    <textarea className={`input ${className}`} style={{ resize: 'vertical', minHeight: 80, ...style }} {...props} />
  );
}
export function FormField({ label, children, hint }: any) {
  return (
    <div className="mb-4">
      <label className="section-label block mb-1.5">{label}</label>
      {children}
      {hint && (
        <p className="text-xs mt-1" style={{ color: '#97A0AF' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, width = 480 }: any) {
  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.54)' }}
    >
      <div
        className="modal-content bg-white rounded-lg w-full overflow-y-auto"
        style={{
          maxWidth: width,
          maxHeight: '90vh',
          borderRadius: 'var(--radius)',
          boxShadow: '0 30px 80px rgba(2,6,23,0.22)',
          border: '1px solid rgba(226,232,240,0.7)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(226,232,240,0.9)' }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 750, color: 'var(--ink)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              color: 'var(--ink-3)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div
        style={{
          width: 18,
          height: 18,
          border: '2.5px solid var(--border)',
          borderTopColor: 'var(--brand)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
        A carregar…
      </span>
    </div>
  );
}

export function Empty({ message = 'Sem dados', icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon ? <div style={{ fontSize: 32, opacity: 0.3 }}>{icon}</div> : <Inbox size={32} opacity={0.3} />}
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        {message}
      </p>
    </div>
  );
}

const BANNER_ICONS = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

export function AlertBanner({ type = 'info', children }) {
  const t =
    {
      info: { bg: 'var(--brand-bg)', color: 'var(--brand)', border: 'rgba(37,99,235,0.30)' },
      success: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'rgba(15,118,110,0.22)' },
      warning: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'rgba(217,119,6,0.22)' },
      danger: { bg: 'var(--red-bg)', color: 'var(--red)', border: 'rgba(220,38,38,0.22)' },
    }[type] || {};
  const IconComp = BANNER_ICONS[type] || Info;
  return (
    <div
      className="rounded px-4 py-3 flex gap-3 text-sm mb-4"
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
    >
      <IconComp size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

export function AppLogo({ size = 32, className = '', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#0B0B0D" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 22H80L66 38H42V62H66L80 78H22V22ZM32 32H54L48 40V60L54 68H32V32Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function Timeline({ events = [] }) {
  if (!events.length) return <Empty message="Sem eventos na cronologia." />;
  const COL = { clinical: 'var(--brand)', admin: 'var(--ink-2)', financial: 'var(--green)', note: 'var(--purple)' };
  return (
    <div className="relative" style={{ paddingLeft: 28 }}>
      <div className="absolute" style={{ left: 7, top: 6, bottom: 0, width: 2, background: 'var(--border)' }} />
      {events.map((e, i) => {
        const col = COL[e.event_type] || 'var(--ink-2)';
        return (
          <div key={i} className="relative mb-5">
            <div
              className="absolute"
              style={{
                left: -21,
                top: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: col,
                border: '2px solid white',
                boxShadow: `0 0 0 2px ${col}30`,
              }}
            />
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)', lineHeight: 1.4 }}>
              {e.event}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {new Date(e.created_at).toLocaleString('pt-PT', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span style={{ color: '#C1C7D0', fontSize: 10 }}>·</span>
              <span className="text-xs font-semibold" style={{ color: col }}>
                {e.user_name}
              </span>
              <span className="badge" style={{ background: `${col}15`, color: col, fontSize: 10, padding: '1px 6px' }}>
                {e.event_type}
              </span>
            </div>
            {e.hash && (
              <div
                className="text-xs mt-1"
                style={{ fontFamily: '"JetBrains Mono",monospace', color: 'var(--ink-3)', opacity: 0.6 }}
              >
                #{e.hash}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Avatar({ name = '', size = 40, color = '#0052CC' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold select-none"
      style={{
        width: size,
        height: size,
        background: `${color}18`,
        color,
        fontSize: size * 0.36,
        fontFamily: '"Plus Jakarta Sans",sans-serif',
      }}
    >
      {initials}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: any) {
  return (
    <div
      className="flex gap-1 mb-5 p-1"
      style={{ background: 'var(--surface-2)', display: 'inline-flex', borderRadius: 'var(--radius)' }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: active === t.key ? 650 : 550,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid transparent',
            cursor: 'pointer',
            background: active === t.key ? 'var(--surface)' : 'transparent',
            color: active === t.key ? 'var(--brand)' : 'var(--ink-2)',
            boxShadow: active === t.key ? '0 6px 18px rgba(2,6,23,0.06)' : 'none',
            fontFamily: 'inherit',
            borderColor: active === t.key ? 'rgba(226,232,240,0.9)' : 'transparent',
          }}
        >
          {t.label}
          {t.count != null && (
            <span
              className="ml-1.5 px-1.5 py-0.5 rounded text-xs"
              style={{
                background: active === t.key ? 'var(--brand-bg)' : 'rgba(226,232,240,0.9)',
                color: active === t.key ? 'var(--brand)' : 'var(--ink-2)',
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
