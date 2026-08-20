'use client';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import {
  AlertBanner,
  Badge,
  FormField,
  GhostBtn,
  Inp,
  Modal,
  PageHeader,
  PrimaryBtn,
  Sel,
  Spinner,
} from '@/components/ui';

const PT_PATIENT_FIELDS = [
  {
    fieldName: 'sex',
    label: 'Sexo',
    fieldType: 'enum',
    enumValues: ['Masculino', 'Feminino', 'Outro'],
    required: false,
    rollout: 100,
  },
  {
    fieldName: 'id_type',
    label: 'Documento',
    description: 'Cartão de Cidadão / Passaporte',
    fieldType: 'enum',
    enumValues: ['Cartão de Cidadão', 'Passaporte', 'Outro'],
    required: false,
    rollout: 100,
  },
  { fieldName: 'id_number', label: 'Nº de Identificação', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'nif', label: 'NIF', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'sns_number', label: 'Nº Utente SNS', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'address', label: 'Morada', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'postal_code', label: 'Código Postal', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'city', label: 'Cidade', fieldType: 'string', required: false, rollout: 100 },
  {
    fieldName: 'emergency_contact_name',
    label: 'Contacto de Emergência (Nome)',
    fieldType: 'string',
    required: false,
    rollout: 100,
  },
  {
    fieldName: 'emergency_contact_phone',
    label: 'Contacto de Emergência (Telefone)',
    fieldType: 'string',
    required: false,
    rollout: 100,
  },
  { fieldName: 'consent_rgpd', label: 'Consentimento RGPD', fieldType: 'boolean', required: false, rollout: 100 },
  {
    fieldName: 'consent_treatment',
    label: 'Consentimento Tratamento',
    fieldType: 'boolean',
    required: false,
    rollout: 100,
  },
  {
    fieldName: 'consent_imaging',
    label: 'Consentimento Imagens/RX',
    fieldType: 'boolean',
    required: false,
    rollout: 100,
  },
  {
    fieldName: 'consent_contact',
    label: 'Consentimento SMS/Email',
    fieldType: 'boolean',
    required: false,
    rollout: 100,
  },
  { fieldName: 'medical_allergies', label: 'Alergias', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'medical_medications', label: 'Medicação', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'medical_pregnant', label: 'Gravidez', fieldType: 'boolean', required: false, rollout: 100 },
  { fieldName: 'medical_heart', label: 'Problemas Cardíacos', fieldType: 'boolean', required: false, rollout: 100 },
  { fieldName: 'medical_diabetes', label: 'Diabetes', fieldType: 'boolean', required: false, rollout: 100 },
  { fieldName: 'medical_hypertension', label: 'Hipertensão', fieldType: 'boolean', required: false, rollout: 100 },
  {
    fieldName: 'medical_infectious',
    label: 'Doenças Infeciosas Relevantes',
    fieldType: 'string',
    required: false,
    rollout: 100,
  },
  { fieldName: 'medical_surgeries', label: 'Cirurgias Anteriores', fieldType: 'string', required: false, rollout: 100 },
  {
    fieldName: 'alcohol_use',
    label: 'Álcool',
    fieldType: 'enum',
    enumValues: ['Nunca', 'Ocasionalmente', 'Frequentemente'],
    required: false,
    rollout: 100,
  },
  { fieldName: 'reason_for_visit', label: 'Motivo da Consulta', fieldType: 'string', required: false, rollout: 100 },
  { fieldName: 'symptoms', label: 'Dores/Sintomas', fieldType: 'string', required: false, rollout: 100 },
  {
    fieldName: 'dental_anxiety',
    label: 'Ansiedade Dentária (0-10)',
    fieldType: 'integer',
    required: false,
    rollout: 100,
  },
  {
    fieldName: 'oral_hygiene_frequency',
    label: 'Higiene Oral',
    fieldType: 'enum',
    enumValues: ['1x/dia', '2x/dia', '3x/dia', 'Irregular'],
    required: false,
    rollout: 100,
  },
];

export default function SchemaPage() {
  const { api, user } = useAuth();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    fieldName: '',
    label: '',
    description: '',
    fieldType: 'string',
    enumText: '',
    required: false,
  });
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(user?.tenantId || '');

  useEffect(() => {
    if (user?.tenantId) setTenantId(user.tenantId);
  }, [user?.tenantId]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api('/tenants')
      .then(setTenants)
      .catch(() => {});
  }, [api, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!tenantId) {
          setFields([]);
          return;
        }
        const res = await api(`/schema?tenantId=${encodeURIComponent(tenantId)}`);
        if (!cancelled) setFields(res?.rows || res || []);
      } catch {
        if (!cancelled) setFields([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, tenantId]);

  async function deploy(id) {
    const f = await api(`/schema/${id}/deploy`, { method: 'PUT' }).catch(() => null);
    if (f) setFields((prev) => prev.map((x) => (x.id === id ? f : x)));
  }

  async function addField() {
    setSaving(true);
    const enumValues =
      form.fieldType === 'enum'
        ? form.enumText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;
    const payload = {
      fieldName: form.fieldName,
      label: form.label,
      description: form.description,
      fieldType: form.fieldType,
      enumValues,
      required: form.required,
      tenantId,
    };
    const res = await api('/schema', { method: 'POST', body: payload }).catch(() => null);
    const created = res?.rows?.[0] || null;
    if (created) {
      setFields((p) => [...p, created]);
      setModal(false);
      setEditingId(null);
      setForm({ fieldName: '', label: '', description: '', fieldType: 'string', enumText: '', required: false });
    }
    setSaving(false);
  }

  async function saveField() {
    setSaving(true);
    const enumValues =
      form.fieldType === 'enum'
        ? form.enumText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;
    const payload = {
      label: form.label,
      description: form.description,
      fieldType: form.fieldType,
      enumValues,
      required: form.required,
    };
    const f = await api(`/schema/${editingId}`, { method: 'PUT', body: payload }).catch(() => null);
    if (f) {
      setFields((prev) => prev.map((x) => (x.id === f.id ? f : x)));
      setModal(false);
      setEditingId(null);
      setForm({ fieldName: '', label: '', description: '', fieldType: 'string', enumText: '', required: false });
    }
    setSaving(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ fieldName: '', label: '', description: '', fieldType: 'string', enumText: '', required: false });
    setModal(true);
  }

  function openEdit(f) {
    setEditingId(f.id);
    const ev = Array.isArray(f.enum_values) ? f.enum_values : f.enum_values ? Object.values(f.enum_values) : [];
    setForm({
      fieldName: f.field_name,
      label: f.label || '',
      description: f.description || '',
      fieldType: f.field_type,
      enumText: (ev || []).join(', '),
      required: !!f.required,
    });
    setModal(true);
  }

  async function addPtPreset() {
    if (!tenantId) {
      return;
    }
    setSaving(true);
    try {
      await api('/schema', { method: 'POST', body: { tenantId, fields: PT_PATIENT_FIELDS } });
      const res = await api(`/schema?tenantId=${encodeURIComponent(tenantId)}`).catch(() => null);
      setFields(res?.rows || res || []);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Schema Fields"
        sub="Define extra fields that appear on patient registration"
        action={tenantId ? '+ Add Field' : null}
        onAction={openAdd}
      >
        {!user?.tenantId && (
          <Sel value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ width: 260 }}>
            <option value="">Select clinic…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.city}
              </option>
            ))}
          </Sel>
        )}
        {tenantId && (
          <GhostBtn onClick={addPtPreset} style={{ padding: '8px 12px' }} disabled={saving}>
            {saving ? 'Adding…' : 'Adicionar Campos PT'}
          </GhostBtn>
        )}
      </PageHeader>
      <AlertBanner type="warning">
        Fields are configured per clinic. Use Publish to activate a field for the selected clinic.
      </AlertBanner>
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <Spinner />
        ) : !tenantId ? (
          <div style={{ padding: 18, fontSize: 13, color: '#97A0AF' }}>
            Select a clinic to manage its schema fields.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="data-th">Field</th>
                <th className="data-th">Type</th>
                <th className="data-th">Rollout</th>
                <th className="data-th">Required</th>
                <th className="data-th">Published</th>
                <th className="data-th"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id}>
                  <td className="data-td">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#172B4D' }}>{f.label || f.field_name}</div>
                      <code
                        style={{
                          background: '#EAE6FF',
                          color: '#5243AA',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontFamily: '"JetBrains Mono",monospace',
                          fontWeight: 600,
                          width: 'fit-content',
                        }}
                      >
                        {f.field_name}
                      </code>
                      {f.description && <div style={{ fontSize: 11, color: '#97A0AF' }}>{f.description}</div>}
                    </div>
                  </td>
                  <td className="data-td" style={{ color: '#5E6C84' }}>
                    {f.field_type}
                  </td>
                  <td className="data-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 80, height: 5, background: '#F4F7FA', borderRadius: 3 }}>
                        <div
                          style={{
                            width: `${f.rollout}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: f.rollout === 100 ? '#00875A' : '#FF8B00',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: '#5E6C84', fontFamily: '"JetBrains Mono",monospace' }}>
                        {f.rollout}%
                      </span>
                    </div>
                  </td>
                  <td className="data-td">
                    <Badge s={f.required ? 'completed' : 'proposed'} label={f.required ? 'Required' : 'Optional'} />
                  </td>
                  <td className="data-td" style={{ color: '#97A0AF' }}>
                    {f.pushed_at?.slice(0, 10) || '—'}
                  </td>
                  <td className="data-td">
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => openEdit(f)} className="btn btn-secondary btn-sm">
                        Edit
                      </button>
                      {f.rollout < 100 ? (
                        <button onClick={() => deploy(f.id)} className="btn btn-primary btn-sm">
                          Publish
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#00875A', fontWeight: 700 }}>
                          <Check size={12} style={{ display: 'inline' }} /> Live
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={editingId ? 'Edit Field' : 'Add Field'} onClose={() => setModal(false)}>
          <FormField label="Field Name (snake_case)">
            <Inp
              placeholder="tobacco_use"
              value={form.fieldName}
              onChange={(e) => setForm((p) => ({ ...p, fieldName: e.target.value }))}
              disabled={!!editingId}
            />
          </FormField>
          <FormField label="Label">
            <Inp
              placeholder="Tobacco Use"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            />
          </FormField>
          <FormField label="Description">
            <Inp
              placeholder="Shows on patient registration"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </FormField>
          <FormField label="Type">
            <Sel
              value={form.fieldType}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  fieldType: e.target.value,
                  enumText: e.target.value === 'enum' ? p.enumText : '',
                }))
              }
            >
              {['string', 'boolean', 'integer', 'decimal', 'enum', 'uuid_ref'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Sel>
          </FormField>
          {form.fieldType === 'enum' && (
            <FormField label="Options (comma separated)">
              <Inp
                placeholder="Never, Sometimes, Daily"
                value={form.enumText}
                onChange={(e) => setForm((p) => ({ ...p, enumText: e.target.value }))}
              />
            </FormField>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
            <input
              type="checkbox"
              id="req"
              checked={form.required}
              onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="req" style={{ fontSize: 13, color: '#172B4D', cursor: 'pointer' }}>
              Required
            </label>
          </div>
          <div className="flex gap-3">
            <PrimaryBtn onClick={editingId ? saveField : addField} disabled={saving || !form.fieldName}>
              {saving ? 'Saving…' : editingId ? 'Save' : 'Add'}
            </PrimaryBtn>
            <GhostBtn onClick={() => setModal(false)}>Cancel</GhostBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}
