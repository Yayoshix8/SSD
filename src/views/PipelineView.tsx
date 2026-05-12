import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { STAGE_ORDER, STAGE_LABELS, PipelineStage, COMMODITIES, COMMODITY_COLORS, Supplier } from '../types';
import { STAGE_HEADER_COLORS } from '../lib/utils';
import SupplierCard from '../components/SupplierCard';
import { Filter, X, Inbox, CheckCircle, UserPlus, MapPin, Tag, MessageSquare, Clock } from 'lucide-react';

const PIPELINE_STAGES = STAGE_ORDER.filter(s => s !== 'blacklisted' && s !== 'form_submitted');

export default function PipelineView() {
  const { suppliers, setSelectedSupplierId, currentRole } = useApp();
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const incoming = useMemo(() => suppliers.filter(s => s.current_stage === 'form_submitted'), [suppliers]);

  const activeCommodities = useMemo(() => {
    const set = new Set(suppliers.filter(s => s.current_stage !== 'form_submitted').map(s => s.commodity).filter(Boolean));
    return COMMODITIES.filter(c => set.has(c));
  }, [suppliers]);

  const activeCountries = useMemo(() => {
    return [...new Set(suppliers.filter(s => s.current_stage !== 'form_submitted').map(s => s.country).filter(Boolean))].sort();
  }, [suppliers]);

  const pipelineSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (s.current_stage === 'form_submitted' || s.current_stage === 'blacklisted') return false;
      if (selectedCommodity && s.commodity !== selectedCommodity) return false;
      if (selectedCountry && s.country !== selectedCountry) return false;
      return true;
    });
  }, [suppliers, selectedCommodity, selectedCountry]);

  const hasFilters = selectedCommodity || selectedCountry;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Filter bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
          <Filter size={12} /> Filter
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {activeCommodities.map(c => {
            const clr = COMMODITY_COLORS[c] ?? COMMODITY_COLORS['Other'];
            const active = selectedCommodity === c;
            return (
              <button
                key={c}
                onClick={() => setSelectedCommodity(active ? null : c)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? `${clr.bg} ${clr.text} ${clr.border} shadow-sm` : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? clr.dot : 'bg-slate-400'}`} />
                {c}
              </button>
            );
          })}
        </div>

        {activeCountries.length > 0 && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <select
              value={selectedCountry ?? ''}
              onChange={e => setSelectedCountry(e.target.value || null)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option value="">All Countries</option>
              {activeCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSelectedCommodity(null); setSelectedCountry(null); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors ml-1"
          >
            <X size={11} /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {incoming.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 animate-pulse">
              <Inbox size={11} /> {incoming.length} incoming
            </span>
          )}
          <span className="text-xs text-slate-400">
            {hasFilters ? (
              <span className="text-blue-700 font-medium">{pipelineSuppliers.length} matching</span>
            ) : (
              <span>{pipelineSuppliers.length} in pipeline</span>
            )}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full" style={{ minWidth: `${(PIPELINE_STAGES.length + (incoming.length > 0 ? 1 : 0)) * 224}px` }}>

          {/* Incoming Requests column — always first, only shown when there are entries */}
          {incoming.length > 0 && (
            <IncomingColumn
              suppliers={incoming}
              onView={id => setSelectedSupplierId(id)}
              onAccept={id => setAcceptingId(id)}
            />
          )}

          {/* Pipeline columns */}
          {PIPELINE_STAGES.map(stage => {
            const stageSuppliers = pipelineSuppliers.filter(s => s.current_stage === stage);
            const total = suppliers.filter(s => s.current_stage === stage).length;
            return (
              <KanbanColumn key={stage} stage={stage} count={stageSuppliers.length} total={total} filtered={!!hasFilters}>
                {stageSuppliers.map(s => (
                  <SupplierCard key={s.id} supplier={s} currentRole={currentRole} onClick={() => setSelectedSupplierId(s.id)} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>

      {/* Accept modal */}
      {acceptingId && (
        <AcceptModal
          supplier={suppliers.find(s => s.id === acceptingId)!}
          onClose={() => setAcceptingId(null)}
        />
      )}
    </div>
  );
}

// ─── Incoming Requests Column ─────────────────────────────────────────────────

function IncomingColumn({ suppliers, onView, onAccept }: {
  suppliers: Supplier[];
  onView: (id: string) => void;
  onAccept: (id: string) => void;
}) {
  return (
    <div className="flex flex-col w-56 flex-shrink-0 bg-violet-50 rounded-xl overflow-hidden border-2 border-violet-300 h-full shadow-md">
      <div className="bg-violet-600 px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Inbox size={13} className="text-violet-200" />
          <span className="text-white text-xs font-semibold uppercase tracking-wide">Incoming</span>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
          {suppliers.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-0">
        {suppliers.map(s => (
          <IncomingCard key={s.id} supplier={s} onView={() => onView(s.id)} onAccept={() => onAccept(s.id)} />
        ))}
      </div>
    </div>
  );
}

function IncomingCard({ supplier: s, onView, onAccept }: { supplier: Supplier; onView: () => void; onAccept: () => void }) {
  const clr = COMMODITY_COLORS[s.commodity] ?? COMMODITY_COLORS['Other'];
  const submitted = s.self_registered_at
    ? new Date(s.self_registered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div className="bg-white rounded-xl border border-violet-200 shadow-sm p-3 space-y-2">
      <div>
        <p className="text-xs font-bold text-slate-900 leading-tight truncate">{s.name}</p>
        <p className="text-xs text-slate-500 flex items-center gap-0.5 mt-0.5"><MapPin size={9} />{s.country}</p>
      </div>

      {s.commodity && (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${clr.bg} ${clr.text} ${clr.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${clr.dot}`} />
          {s.commodity}
        </span>
      )}

      {s.component_category && (
        <p className="text-xs text-slate-500 truncate flex items-center gap-1"><Tag size={9} />{s.component_category}</p>
      )}

      {s.notes_from_supplier && (
        <p className="text-xs text-slate-400 italic line-clamp-2 flex gap-1">
          <MessageSquare size={9} className="flex-shrink-0 mt-0.5" />{s.notes_from_supplier}
        </p>
      )}

      <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={9} />Submitted {submitted}</p>

      <div className="flex gap-1.5 pt-1">
        <button
          onClick={onView}
          className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
        >
          View
        </button>
        <button
          onClick={onAccept}
          className="flex-1 text-xs py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors font-semibold flex items-center justify-center gap-1"
        >
          <CheckCircle size={10} /> Accept
        </button>
      </div>
    </div>
  );
}

// ─── Accept Modal ─────────────────────────────────────────────────────────────

function AcceptModal({ supplier: s, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { acceptSupplier, currentRole } = useApp();
  const [actorName, setActorName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ROLE_NAME: Record<string, string> = {
    ssd: 'SSD Team Member', pm: 'Purchasing Manager', buyer: 'Buyer', sqd: 'SQD Engineer',
  };

  const handleAccept = async () => {
    if (!actorName.trim()) { setError('Your name is required'); return; }
    setSaving(true);
    await acceptSupplier(s.id, assignedTo, actorName || ROLE_NAME[currentRole]);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-violet-600 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <CheckCircle size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Accept Supplier Registration</p>
            <p className="text-violet-200 text-xs">Move to pipeline as New Supplier Identified</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Supplier summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
            <p className="font-bold text-slate-900">{s.name}</p>
            <p className="text-slate-500 text-xs">{s.country} · {s.component_category}</p>
            {s.commodity && (
              <p className="text-xs text-slate-600">
                Commodity: <span className="font-semibold">{s.commodity}</span>
                {s.commodity_subcategory && ` — ${s.commodity_subcategory}`}
              </p>
            )}
            <p className="text-xs text-slate-600">Contact: {s.contact_name} · {s.contact_email}</p>
            {s.notes_from_supplier && (
              <p className="text-xs text-slate-500 italic border-t border-slate-200 pt-1.5 mt-1.5">"{s.notes_from_supplier}"</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Assign to SSD Member <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <UserPlus size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="Responsible SSD team member"
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              value={actorName}
              onChange={e => { setActorName(e.target.value); setError(''); }}
              placeholder="Your full name for the audit trail"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between bg-slate-50">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
          <button
            onClick={handleAccept}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Accepting...</> : <><CheckCircle size={14} /> Accept into Pipeline</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, count, total, filtered, children }: {
  stage: PipelineStage; count: number; total: number; filtered: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-52 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-full">
      <div className={`${STAGE_HEADER_COLORS[stage]} px-3 py-2 flex items-center justify-between flex-shrink-0`}>
        <span className="text-white text-xs font-semibold uppercase tracking-wide leading-tight">
          {STAGE_LABELS[stage]}
        </span>
        <span className="bg-white/20 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
          {filtered && count !== total ? `${count}/${total}` : count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-0">
        {children}
        {count === 0 && (
          <p className="text-center py-8 text-slate-400 text-xs">
            {filtered ? 'No match' : 'No suppliers'}
          </p>
        )}
      </div>
    </div>
  );
}
