'use client';
import { GhostBtn, Inp, Modal, PrimaryBtn, Sel, Textarea } from '@/components/ui';

function FormRow({ label, children }) {
  return (
    <div className="mb-4">
      <label className="section-label block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function AppointmentEditModal({ open, onClose, dentists, value, onChange, onSave, saving, error }) {
  if (!open) return null;
  return (
    <Modal title="Edit appointment" onClose={onClose} width={560}>
      {error && (
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
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormRow label="Date">
          <Inp type="date" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </FormRow>
        <FormRow label="Time">
          <Inp
            type="time"
            value={value.startTime}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          />
        </FormRow>
        <FormRow label="Duration (min)">
          <Inp
            type="number"
            min={5}
            step={5}
            value={value.duration}
            onChange={(e) => onChange({ ...value, duration: e.target.value })}
          />
        </FormRow>
        <FormRow label="Chair">
          <Inp
            type="number"
            min={1}
            value={value.chair}
            onChange={(e) => onChange({ ...value, chair: e.target.value })}
          />
        </FormRow>
      </div>

      <FormRow label="Dentist">
        <Sel value={value.dentistId || ''} onChange={(e) => onChange({ ...value, dentistId: e.target.value })}>
          <option value="">— Select —</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Sel>
      </FormRow>

      <FormRow label="Type">
        <Inp value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })} />
      </FormRow>

      <FormRow label="Notes">
        <Textarea value={value.notes || ''} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </FormRow>

      <div className="flex gap-3 mt-3">
        <PrimaryBtn onClick={onSave} disabled={saving} style={{ justifyContent: 'center' }}>
          {saving ? 'Saving…' : 'Save'}
        </PrimaryBtn>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
  );
}
