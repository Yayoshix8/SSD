import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { COMMODITIES, COMMODITY_COLORS } from '../types';
import {
  Building2, MapPin, User, Mail, Phone, Hash, Layers,
  Tag, Plus, X, CheckCircle, AlertCircle, ChevronRight,
  FileText, MessageSquare, Zap,
} from 'lucide-react';

type Step = 'identity' | 'commodity' | 'contact' | 'message' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'identity',  label: 'Company' },
  { id: 'commodity', label: 'Commodity' },
  { id: 'contact',   label: 'Contact' },
  { id: 'message',   label: 'Message' },
];

interface FormData {
  name: string;
  legal_entity: string;
  country: string;
  facility_location: string;
  commodity: string;
  commodity_subcategory: string;
  component_category: string;
  programs: string[];
  duns_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  elm_score: string;
  notes_from_supplier: string;
}

const EMPTY: FormData = {
  name: '', legal_entity: '', country: '', facility_location: '',
  commodity: '', commodity_subcategory: '', component_category: '',
  programs: [], duns_number: '', contact_name: '', contact_email: '',
  contact_phone: '', elm_score: '', notes_from_supplier: '',
};

export default function SupplierRegistrationForm() {
  const [step, setStep] = useState<Step>('identity');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [programInput, setProgramInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (field: keyof FormData, value: string | string[]) => {
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

  const validateStep = (s: Step): boolean => {
    const errs: typeof errors = {};
    if (s === 'identity') {
      if (!form.name.trim())    errs.name = 'Company name is required';
      if (!form.country.trim()) errs.country = 'Country is required';
    }
    if (s === 'commodity') {
      if (!form.commodity) errs.commodity = 'Please select a commodity family';
      if (!form.component_category.trim()) errs.component_category = 'Component description is required';
    }
    if (s === 'contact') {
      if (!form.contact_name.trim())  errs.contact_name = 'Contact name is required';
      if (!form.contact_email.trim()) errs.contact_email = 'Contact email is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    const order: Step[] = ['identity', 'commodity', 'contact', 'message'];
    const idx = order.indexOf(step);
    if (!validateStep(step)) return;
    if (idx < order.length - 1) setStep(order[idx + 1]);
    else handleSubmit();
  };

  const goBack = () => {
    const order: Step[] = ['identity', 'commodity', 'contact', 'message'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const handleSubmit = async () => {
    if (!validateStep('contact')) { setStep('contact'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { error } = await supabase.from('suppliers').insert({
        name:                   form.name,
        legal_entity:           form.legal_entity || form.name,
        country:                form.country,
        facility_location:      form.facility_location,
        commodity:              form.commodity,
        commodity_subcategory:  form.commodity_subcategory,
        component_category:     form.component_category,
        programs:               form.programs,
        duns_number:            form.duns_number,
        contact_name:           form.contact_name,
        contact_email:          form.contact_email,
        contact_phone:          form.contact_phone,
        elm_score:              form.elm_score,
        notes_from_supplier:    form.notes_from_supplier,
        current_stage:          'form_submitted',
        source:                 'self_registered',
        pending_review:         true,
        self_registered_at:     new Date().toISOString(),
        stage_entered_at:       new Date().toISOString(),
        assigned_ssd_member:    '',
        blacklist_reason:       '',
        blacklisted_by:         '',
        duns_validated:         false,
        updated_at:             new Date().toISOString(),
      });
      if (error) { setSubmitError(error.message); setSubmitting(false); return; }
      setStep('done');
    } catch (e) {
      setSubmitError(String(e));
      setSubmitting(false);
    }
  };

  const stepOrder: Step[] = ['identity', 'commodity', 'contact', 'message'];
  const stepIdx = stepOrder.indexOf(step);

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Submitted!</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Thank you, <span className="font-semibold">{form.contact_name}</span>. Your company <span className="font-semibold">{form.name}</span> has been registered and our Supplier Scouting & Development team will review your information shortly.
          </p>
          <p className="text-slate-400 text-xs">You will be contacted at <span className="font-medium text-slate-600">{form.contact_email}</span>.</p>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            Reference: <span className="font-mono font-semibold">{form.name.slice(0, 3).toUpperCase()}-{Date.now().toString().slice(-6)}</span>
          </div>
        </div>
      </div>
    );
  }

  const isLastStep = step === 'message';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-base leading-none">Nexteer Automotive</p>
              <p className="text-blue-300 text-xs">Supplier Scouting & Development</p>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-1">Supplier Registration Form</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step progress */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending';
                return (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className={`flex items-center gap-1.5 flex-1 justify-center`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        state === 'done' ? 'bg-emerald-500 text-white' :
                        state === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {state === 'done' ? <CheckCircle size={11} /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        state === 'active' ? 'text-blue-700' : state === 'done' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`h-px w-4 flex-shrink-0 ${i < stepIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form body */}
          <div className="p-5 space-y-4">

            {/* ── Identity ── */}
            {step === 'identity' && (
              <>
                <SectionTitle icon={<Building2 size={14} />} title="Company Information" />
                <Field label="Company Name" required error={errors.name}>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. ZF Friedrichshafen AG" className={inputCls(!!errors.name)} />
                </Field>
                <Field label="Legal Entity Name" hint="if different">
                  <input value={form.legal_entity} onChange={e => set('legal_entity', e.target.value)}
                    placeholder="Full registered legal name" className={inputCls(false)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country" required error={errors.country}>
                    <input value={form.country} onChange={e => set('country', e.target.value)}
                      placeholder="e.g. Germany" className={inputCls(!!errors.country)} />
                  </Field>
                  <Field label="City / Location">
                    <div className="relative">
                      <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={form.facility_location} onChange={e => set('facility_location', e.target.value)}
                        placeholder="City" className={inputCls(false) + ' pl-7'} />
                    </div>
                  </Field>
                </div>
                <Field label="D-U-N-S Number" hint="optional">
                  <div className="relative">
                    <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.duns_number} onChange={e => set('duns_number', e.target.value)}
                      placeholder="XX-XXX-XXXX" className={inputCls(false) + ' pl-7'} />
                  </div>
                </Field>
              </>
            )}

            {/* ── Commodity ── */}
            {step === 'commodity' && (
              <>
                <SectionTitle icon={<Layers size={14} />} title="Commodity & Products" />
                <Field label="Commodity Family" required error={errors.commodity}>
                  <div className="grid grid-cols-3 gap-2">
                    {COMMODITIES.map(c => {
                      const clr = COMMODITY_COLORS[c] ?? COMMODITY_COLORS['Other'];
                      const sel = form.commodity === c;
                      return (
                        <button key={c} type="button" onClick={() => set('commodity', c)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                            sel ? `${clr.bg} ${clr.text} ${clr.border}` : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                          }`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sel ? clr.dot : 'bg-slate-300'}`} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Subcategory / Product Line" hint="optional">
                  <input value={form.commodity_subcategory} onChange={e => set('commodity_subcategory', e.target.value)}
                    placeholder="e.g. EPS Motors, Seat Structures" className={inputCls(false)} />
                </Field>
                <Field label="Component / Product Description" required error={errors.component_category}>
                  <input value={form.component_category} onChange={e => set('component_category', e.target.value)}
                    placeholder="Describe the components you manufacture" className={inputCls(!!errors.component_category)} />
                </Field>
                <Field label="Programs / Vehicle Platforms" hint="if known">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={programInput}
                        onChange={e => setProgramInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProgram())}
                        placeholder="e.g. ALFA EVO" className={inputCls(false) + ' pl-7'} />
                    </div>
                    <button type="button" onClick={addProgram}
                      className="px-3 py-2 bg-blue-700 text-white rounded-xl text-xs font-medium hover:bg-blue-800">
                      <Plus size={13} />
                    </button>
                  </div>
                  {form.programs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.programs.map(p => (
                        <span key={p} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                          {p}
                          <button onClick={() => removeProgram(p)} className="text-blue-400 hover:text-blue-700"><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </>
            )}

            {/* ── Contact ── */}
            {step === 'contact' && (
              <>
                <SectionTitle icon={<User size={14} />} title="Contact Person" />
                <Field label="Full Name" required error={errors.contact_name}>
                  <div className="relative">
                    <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                      placeholder="Your full name" className={inputCls(!!errors.contact_name) + ' pl-7'} />
                  </div>
                </Field>
                <Field label="Business Email" required error={errors.contact_email}>
                  <div className="relative">
                    <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                      placeholder="your.name@company.com" className={inputCls(!!errors.contact_email) + ' pl-7'} />
                  </div>
                </Field>
                <Field label="Phone Number">
                  <div className="relative">
                    <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                      placeholder="+1 555 000 0000" className={inputCls(false) + ' pl-7'} />
                  </div>
                </Field>
                <Field label="Self-Assessment Score" hint="optional quality/capability score">
                  <div className="relative">
                    <Zap size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.elm_score} onChange={e => set('elm_score', e.target.value)}
                      placeholder="e.g. 85/100" className={inputCls(false) + ' pl-7'} />
                  </div>
                </Field>
              </>
            )}

            {/* ── Message ── */}
            {step === 'message' && (
              <>
                <SectionTitle icon={<MessageSquare size={14} />} title="Additional Information" />
                <Field label="Message to Nexteer SSD Team" hint="optional">
                  <textarea
                    value={form.notes_from_supplier}
                    onChange={e => set('notes_from_supplier', e.target.value)}
                    rows={5}
                    placeholder="Describe your capabilities, certifications (IATF 16949, ISO 9001), capacity, or any relevant information that would help our team evaluate your company..."
                    className={inputCls(false) + ' resize-none'}
                  />
                </Field>

                {/* Review summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                  <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FileText size={12} /> Summary</p>
                  <Row label="Company" value={form.name} />
                  <Row label="Country" value={form.country} />
                  <Row label="Commodity" value={form.commodity || '—'} />
                  <Row label="Component" value={form.component_category} />
                  <Row label="Contact" value={`${form.contact_name} · ${form.contact_email}`} />
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle size={13} /> {submitError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between bg-slate-50">
            <button
              onClick={goBack}
              disabled={step === 'identity'}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-0"
            >
              Back
            </button>
            <button
              onClick={goNext}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : isLastStep ? (
                <><CheckCircle size={14} /> Submit Registration</>
              ) : (
                <>Next <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Your information is handled securely and will only be used for supplier evaluation purposes.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm border-b border-slate-100 pb-2">
      <span className="text-blue-600">{icon}</span>{title}
    </div>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-slate-400 font-normal">— {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={9} /> {error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 justify-between">
      <span className="text-slate-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right truncate">{value}</span>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400 bg-white'
  }`;
}
