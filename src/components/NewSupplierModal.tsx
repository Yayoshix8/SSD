import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { COMMODITIES, COMMODITY_COLORS, NewSupplierInput } from '../types';
import {
  X, Building2, MapPin, User, Mail, Phone, Hash, Layers,
  Tag, Users, Zap, Plus, CheckCircle, AlertCircle, ChevronRight,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

type Step = 'identity' | 'commodity' | 'contact' | 'assignment' | 'review';

const STEPS: { id: Step; label: string; desc: string }[] = [
  { id: 'identity',   label: 'Identity',   desc: 'Company info & location' },
  { id: 'commodity',  label: 'Commodity',  desc: 'Category & component' },
  { id: 'contact',    label: 'Contact',    desc: 'Contact person' },
  { id: 'assignment', label: 'Assignment', desc: 'SSD member & programs' },
  { id: 'review',     label: 'Review',     desc: 'Confirm & register' },
];

const EMPTY: NewSupplierInput = {
  name: '', legal_entity: '', country: '', facility_location: '',
  commodity: '', commodity_subcategory: '', component_category: '',
  programs: [], duns_number: '', assigned_ssd_member: '',
  contact_name: '', contact_email: '', contact_phone: '', elm_score: '',
};

export default function NewSupplierModal({ onClose, onCreated }: Props) {
  const { createSupplier, currentRole } = useApp();
  const [step, setStep] = useState<Step>('identity');
  const [form, setForm] = useState<NewSupplierInput>(EMPTY);
  const [actorName, setActorName] = useState('');
  const [programInput, setProgramInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof NewSupplierInput | 'actorName', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof NewSupplierInput, value: string | string[]) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const addProgram = () => {
    const p = programInput.trim();
    if (p && !form.programs.includes(p)) {
      set('programs', [...form.programs, p]);
      setProgramInput('');
    }
  };

  const removeProgram = (p: string) => set('programs', form.programs.filter(x => x !== p));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.name.trim())            errs.name = 'Supplier name is required';
    if (!form.country.trim())         errs.country = 'Country is required';
    if (!form.commodity)              errs.commodity = 'Commodity is required';
    if (!form.component_category.trim()) errs.component_category = 'Component category is required';
    if (!actorName.trim())            errs.actorName = 'Your name is required to register';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Jump to the first step with an error
      if (errors.name || errors.country || errors.legal_entity) setStep('identity');
      else if (errors.commodity || errors.component_category)   setStep('commodity');
      else if (errors.actorName)                                setStep('review');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const id = await createSupplier(form, actorName);
      if (!id) { setSubmitError('Failed to create supplier. Please try again.'); setSubmitting(false); return; }
      setDone(id);
    } catch (e) {
      setSubmitError(String(e));
      setSubmitting(false);
    }
  };

  const stepIdx = STEPS.findIndex(s => s.id === step);

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Supplier Registered</h2>
          <p className="text-slate-500 text-sm mb-2">{form.name} has been added to the pipeline at <span className="font-semibold">New Supplier Identified</span>.</p>
          <p className="text-xs text-slate-400 mb-6">Checklist activities have been seeded automatically.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => { onCreated?.(done); onClose(); }}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              View Supplier
            </button>
            <button
              onClick={() => { setForm(EMPTY); setDone(null); setStep('identity'); setActorName(''); }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-[#0F172A] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Register New Supplier</h2>
              <p className="text-slate-400 text-xs">Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {/* Step progress */}
        <div className="flex border-b border-slate-100 flex-shrink-0 bg-slate-50">
          {STEPS.map((s, i) => {
            const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending';
            return (
              <button
                key={s.id}
                onClick={() => i <= stepIdx && setStep(s.id)}
                className={`flex-1 py-2.5 px-1 text-center transition-all ${state === 'active' ? 'border-b-2 border-blue-600' : ''} ${i <= stepIdx ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`flex items-center justify-center gap-1 mx-auto text-xs font-medium ${state === 'done' ? 'text-emerald-600' : state === 'active' ? 'text-blue-700' : 'text-slate-400'}`}>
                  {state === 'done' ? <CheckCircle size={11} /> : <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${state === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>}
                  <span className="hidden sm:block">{s.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Step 1: Identity ── */}
          {step === 'identity' && (
            <div className="space-y-4">
              <Field label="Supplier Name" required error={errors.name}>
                <input
                  ref={nameRef}
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. ZF Friedrichshafen AG"
                  className={inputCls(!!errors.name)}
                />
              </Field>
              <Field label="Legal Entity Name" hint="If different from trading name">
                <input
                  value={form.legal_entity}
                  onChange={e => set('legal_entity', e.target.value)}
                  placeholder="Full legal entity name"
                  className={inputCls(false)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" required error={errors.country}>
                  <input
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                    placeholder="e.g. Germany"
                    className={inputCls(!!errors.country)}
                  />
                </Field>
                <Field label="Facility Location">
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.facility_location}
                      onChange={e => set('facility_location', e.target.value)}
                      placeholder="City, Country"
                      className={inputCls(false) + ' pl-8'}
                    />
                  </div>
                </Field>
              </div>
              <Field label="D-U-N-S Number" hint="Format: XX-XXX-XXXX">
                <div className="relative">
                  <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.duns_number}
                    onChange={e => set('duns_number', e.target.value)}
                    placeholder="e.g. 33-180-5562"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 2: Commodity ── */}
          {step === 'commodity' && (
            <div className="space-y-4">
              <Field label="Commodity Family" required error={errors.commodity}>
                <div className="grid grid-cols-3 gap-2">
                  {COMMODITIES.map(c => {
                    const clr = COMMODITY_COLORS[c] ?? COMMODITY_COLORS['Other'];
                    const sel = form.commodity === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set('commodity', c)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${sel ? `${clr.bg} ${clr.text} ${clr.border} shadow-sm` : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sel ? clr.dot : 'bg-slate-300'}`} />
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Subcategory" hint="Optional finer classification">
                <input
                  value={form.commodity_subcategory}
                  onChange={e => set('commodity_subcategory', e.target.value)}
                  placeholder="e.g. EPS Motors, Seat Structures"
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Component Category" required error={errors.component_category}>
                <input
                  value={form.component_category}
                  onChange={e => set('component_category', e.target.value)}
                  placeholder="e.g. Electric Power Steering (EPS) Motors"
                  className={inputCls(!!errors.component_category)}
                />
              </Field>
              <Field label="ELM Score" hint="Optional initial assessment score">
                <div className="relative">
                  <Zap size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.elm_score}
                    onChange={e => set('elm_score', e.target.value)}
                    placeholder="e.g. 82/100"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 3: Contact ── */}
          {step === 'contact' && (
            <div className="space-y-4">
              <Field label="Contact Person Name">
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.contact_name}
                    onChange={e => set('contact_name', e.target.value)}
                    placeholder="Full name"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
              <Field label="Contact Email">
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)}
                    placeholder="name@company.com"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
              <Field label="Contact Phone">
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.contact_phone}
                    onChange={e => set('contact_phone', e.target.value)}
                    placeholder="+49 911 555 0102"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 4: Assignment ── */}
          {step === 'assignment' && (
            <div className="space-y-4">
              <Field label="Assigned SSD Member">
                <div className="relative">
                  <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.assigned_ssd_member}
                    onChange={e => set('assigned_ssd_member', e.target.value)}
                    placeholder="Full name of responsible SSD member"
                    className={inputCls(false) + ' pl-8'}
                  />
                </div>
              </Field>
              <Field label="Programs" hint="Vehicle programs this supplier is evaluated for">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={programInput}
                      onChange={e => setProgramInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProgram())}
                      placeholder="Type and press Enter or Add"
                      className={inputCls(false) + ' pl-8'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addProgram}
                    className="px-3 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                {form.programs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.programs.map(p => (
                      <span key={p} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                        {p}
                        <button onClick={() => removeProgram(p)} className="text-blue-400 hover:text-blue-700"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <ReviewSection title="Identity">
                  <ReviewRow label="Supplier Name" value={form.name} />
                  {form.legal_entity && <ReviewRow label="Legal Entity" value={form.legal_entity} />}
                  <ReviewRow label="Country" value={form.country} />
                  {form.facility_location && <ReviewRow label="Location" value={form.facility_location} />}
                  {form.duns_number && <ReviewRow label="DUNS" value={form.duns_number} />}
                </ReviewSection>
                <ReviewSection title="Commodity">
                  <ReviewRow label="Commodity" value={form.commodity || '—'} valueClass={COMMODITY_COLORS[form.commodity]?.text} />
                  {form.commodity_subcategory && <ReviewRow label="Subcategory" value={form.commodity_subcategory} />}
                  <ReviewRow label="Component" value={form.component_category || '—'} />
                  {form.elm_score && <ReviewRow label="ELM Score" value={form.elm_score} />}
                </ReviewSection>
                <ReviewSection title="Contact">
                  <ReviewRow label="Name" value={form.contact_name || '—'} />
                  <ReviewRow label="Email" value={form.contact_email || '—'} />
                  <ReviewRow label="Phone" value={form.contact_phone || '—'} />
                </ReviewSection>
                <ReviewSection title="Assignment">
                  <ReviewRow label="SSD Member" value={form.assigned_ssd_member || '—'} />
                  <ReviewRow label="Programs" value={form.programs.join(', ') || '—'} />
                </ReviewSection>
              </div>

              <Field label="Your Name (Registered By)" required error={errors.actorName}>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={actorName}
                    onChange={e => { setActorName(e.target.value); setErrors(err => ({ ...err, actorName: undefined })); }}
                    placeholder="Your full name for the audit trail"
                    className={inputCls(!!errors.actorName) + ' pl-8'}
                  />
                </div>
              </Field>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                The supplier will be added to the pipeline at <span className="font-semibold">New Supplier Identified</span> stage and checklist activities will be seeded automatically.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div>
            {stepIdx > 0 && (
              <button
                onClick={() => setStep(STEPS[stepIdx - 1].id)}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div>
            {step !== 'review' ? (
              <button
                onClick={() => setStep(STEPS[stepIdx + 1].id)}
                disabled={step === 'identity' && !form.name.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Registering...</> : <><CheckCircle size={14} /> Register Supplier</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-slate-400 font-normal">— {hint}</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>
      )}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 flex-shrink-0 w-28">{label}</span>
      <span className={`text-xs font-medium text-right truncate ${valueClass ?? 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 focus:ring-red-200 bg-red-50'
      : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400 bg-white'
  }`;
}
