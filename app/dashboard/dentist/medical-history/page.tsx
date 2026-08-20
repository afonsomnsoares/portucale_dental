'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import {
  AlertBanner,
  Badge,
  DangerBtn,
  Empty,
  FormField,
  GhostBtn,
  Inp,
  PageHeader,
  PrimaryBtn,
  Sel,
  Spinner,
  Textarea,
} from '@/components/ui';

export default function MedicalHistoryPage() {
  const { api } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    allergies: [],
    medications: [],
    conditions: [],
    family_history: '',
    smoking: 'never',
    pregnancy: 'no',
    notes: '',
  });
  const [newAllergy, setNewAllergy] = useState({ name: '', notes: '' });
  const [newMed, setNewMed] = useState({ name: '', notes: '' });
  const [newCond, setNewCond] = useState({ name: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const pts = await api('/patients').catch(() => []);
    setPatients(pts || []);
    if (!selected && pts?.length) select(pts[0]);
    setLoading(false);
  }, [api, selected, select]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function select(p) {
    setSelected(p);
    setError(null);
    const mh = await api(`/patients/${p.id}/medical-history`).catch(() => null);
    setForm({
      allergies: mh?.allergies || [],
      medications: mh?.medications || [],
      conditions: mh?.conditions || [],
      family_history: mh?.family_history || '',
      smoking: mh?.smoking || 'never',
      pregnancy: mh?.pregnancy || 'no',
      notes: mh?.notes || '',
    });
  }

  function addListItem(list, _setList, item, setItem) {
    if (!item.name) return;
    setForm((prev) => ({ ...prev, [list]: [...(prev[list] || []), item] }));
    setItem({ name: '', notes: '' });
  }

  function removeListItem(list, idx) {
    setForm((prev) => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }));
  }

  function renderListEditor(label, listKey, item, setItem, placeholder) {
    return (
      <div
        className="card"
        style={{ padding: '12px 16px', boxShadow: 'none', border: '1px solid #DFE1E6', marginBottom: 12 }}
      >
        <div className="section-label mb-2">{label}</div>
        {(form[listKey] || []).map((it, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid #F4F7FA',
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>{it.name}</span>
              {it.notes && <span style={{ fontSize: 11, color: '#97A0AF', marginLeft: 8 }}>— {it.notes}</span>}
            </div>
            <DangerBtn style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => removeListItem(listKey, i)}>
              Remove
            </DangerBtn>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Inp
            placeholder={placeholder || 'Name'}
            value={item.name}
            onChange={(e) => setItem((p) => ({ ...p, name: e.target.value }))}
            style={{ flex: 1 }}
          />
          <Inp
            placeholder="Notes"
            value={item.notes}
            onChange={(e) => setItem((p) => ({ ...p, notes: e.target.value }))}
            style={{ flex: 1 }}
          />
          <GhostBtn onClick={() => addListItem(listKey, setForm, item, setItem)}>+ Add</GhostBtn>
        </div>
      </div>
    );
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const res = await api(`/patients/${selected.id}/medical-history`, {
      method: 'PUT',
      body: form,
    }).catch(() => null);
    if (res) {
      setForm({
        allergies: res.allergies || [],
        medications: res.medications || [],
        conditions: res.conditions || [],
        family_history: res.family_history || '',
        smoking: res.smoking || 'never',
        pregnancy: res.pregnancy || 'no',
        notes: res.notes || '',
      });
    } else {
      setError('Failed to save medical history');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Medical History" sub="Patient medical history — allergies, medications, conditions" />
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#172B4D' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#97A0AF' }}>
                    #{p.global_seq} · <Badge s={p.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selected ? (
          <div>
            {error && <AlertBanner type="danger">{error}</AlertBanner>}
            {renderListEditor('Allergies', 'allergies', newAllergy, setNewAllergy, 'Allergen')}
            {renderListEditor('Medications', 'medications', newMed, setNewMed, 'Medication')}
            {renderListEditor('Conditions', 'conditions', newCond, setNewCond, 'Condition')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Smoking">
                <Sel value={form.smoking} onChange={(e) => setForm((p) => ({ ...p, smoking: e.target.value }))}>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                </Sel>
              </FormField>
              <FormField label="Pregnancy">
                <Sel value={form.pregnancy} onChange={(e) => setForm((p) => ({ ...p, pregnancy: e.target.value }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="not-applicable">Not Applicable</option>
                </Sel>
              </FormField>
            </div>
            <FormField label="Family History">
              <Textarea
                value={form.family_history}
                onChange={(e) => setForm((p) => ({ ...p, family_history: e.target.value }))}
                placeholder="Family medical history…"
              />
            </FormField>
            <FormField label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes…"
              />
            </FormField>
            <div className="flex gap-3 mt-2">
              <PrimaryBtn onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Medical History'}
              </PrimaryBtn>
            </div>
          </div>
        ) : (
          <Empty message="Select a patient to view their medical history" />
        )}
      </div>
    </div>
  );
}
