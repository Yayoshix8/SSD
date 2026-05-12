import { useState } from 'react';
import { Supplier, PipelineStage, STAGE_LABELS } from '../types';
import { useApp } from '../context/AppContext';
import { getNextStage } from '../types';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DecisionGateModalProps {
  supplier: Supplier;
  targetStage?: PipelineStage;
  onClose: () => void;
}

const BLACKLIST_REASONS = [
  'Failed quality audit (IATF 16949 non-conformities)',
  'Unable to meet program timeline requirements',
  'Financial instability / credit risk',
  'Geopolitical risk / supply chain concerns',
  'Environmental or compliance violations',
  'Insufficient technical capability',
  'NDA refused to sign',
  'Other (specify below)',
];

export default function DecisionGateModal({ supplier, targetStage, onClose }: DecisionGateModalProps) {
  const { currentRole, advanceStage, blacklistSupplier } = useApp();
  const nextStage = targetStage ?? getNextStage(supplier.current_stage);
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);
  const [noAction, setNoAction] = useState<'blacklist' | 'parking_lot' | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleName = currentRole === 'ssd_team' ? 'SSD Team' : currentRole === 'commercial_team' ? 'Commercial Team' : 'Buyer';

  const blockingCheck = { allowed: true, reason: '' };

  const finalReason = selectedReason === 'Other (specify below)' ? customReason : selectedReason + (customReason ? ` — ${customReason}` : '');
  const reasonValid = finalReason.length >= 20;

  const handleSubmit = async () => {
    if (!nextStage) return;
    setSubmitting(true);
    try {
      if (decision === 'yes') {
        await advanceStage(supplier.id, nextStage, roleName);
      } else if (decision === 'no') {
        if (noAction === 'blacklist') {
          await blacklistSupplier(supplier.id, finalReason, roleName);
        } else if (noAction === 'parking_lot') {
          await advanceStage(supplier.id, 'parking_lot', roleName);
        }
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!nextStage) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#0D1B2E] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Decision Gate</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Supplier info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Supplier</p>
            <p className="font-semibold text-slate-900">{supplier.name}</p>
            <p className="text-sm text-slate-500 mt-0.5">{supplier.component_category} · {supplier.country}</p>
          </div>

          {/* Blocking check */}
          {!blockingCheck.allowed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Advancement Blocked</p>
                <p className="text-sm text-amber-700 mt-0.5">{blockingCheck.reason}</p>
              </div>
            </div>
          )}

          {/* Question */}
          <p className="text-slate-800 font-medium mb-4 text-sm">
            Is <span className="font-bold">{supplier.name}</span> eligible to advance to{' '}
            <span className="text-blue-700 font-bold">{STAGE_LABELS[nextStage]}</span>?
          </p>

          {/* Yes / No */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => { setDecision('yes'); setNoAction(null); }}
              disabled={!blockingCheck.allowed}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                decision === 'yes'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <CheckCircle size={16} />
              Yes, Advance
            </button>
            <button
              onClick={() => { setDecision('no'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                decision === 'no'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <XCircle size={16} />
              No, Reject
            </button>
          </div>

          {/* No — action selection */}
          {decision === 'no' && (
            <div className="space-y-3 mb-5">
              <p className="text-sm font-medium text-slate-700">Action for rejected supplier:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setNoAction('parking_lot')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    noAction === 'parking_lot'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-600 hover:border-amber-300'
                  }`}
                >
                  Return to Parking Lot
                </button>
                <button
                  onClick={() => setNoAction('blacklist')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    noAction === 'blacklist'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-600 hover:border-red-300'
                  }`}
                >
                  Blacklist Supplier
                </button>
              </div>

              {noAction === 'blacklist' && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Blacklist Reason (required)</p>
                  <div className="space-y-2">
                    {BLACKLIST_REASONS.map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value={r}
                          checked={selectedReason === r}
                          onChange={() => setSelectedReason(r)}
                          className="text-red-600"
                        />
                        <span className="text-sm text-slate-700">{r}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Add details or specify reason (min 20 characters total)..."
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 h-24"
                  />
                  {finalReason.length > 0 && finalReason.length < 20 && (
                    <p className="text-xs text-red-600">{20 - finalReason.length} more characters required.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                decision === null ||
                (decision === 'no' && noAction === null) ||
                (decision === 'no' && noAction === 'blacklist' && !reasonValid)
              }
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Confirm Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
