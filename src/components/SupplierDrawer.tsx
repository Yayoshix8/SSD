import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  STAGE_LABELS, ROLE_LABELS, ROLE_COLORS, UserRole,
  canCompleteActivity, canApproveActivity, canConsult,
  getNextStage, STAGE_ACTIVITIES, COMMODITIES, COMMODITY_COLORS,
} from '../types';
import { daysSince, getTrafficLight, formatDateTime, getDualApprovalStatus, isNdaSigned } from '../lib/utils';
import {
  X, ChevronRight, Clock, Shield, MapPin, Phone, Mail, User,
  CheckCircle2, Circle, AlertTriangle, Lock, CheckCheck, MessageSquare,
  GitBranch, Zap, Users, ClipboardList, FileText, Download, Paperclip,
} from 'lucide-react';
import { exportSingleSupplier } from '../lib/export';
import FilesTab from './FilesTab';

const TABS = ['Overview', 'RASIC Checklist', 'Files', 'Timeline', 'Consultation Log', 'Notes'] as const;
type Tab = typeof TABS[number];

const ROLE_NAME: Record<UserRole, string> = {
  ssd: 'SSD Team Member',
  pm: 'Purchasing Manager',
  buyer: 'Buyer',
  sqd: 'SQD Engineer',
};

export default function SupplierDrawer() {
  const { selectedSupplier, setSelectedSupplierId, currentRole, advanceStage, blacklistSupplier } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!selectedSupplier) return null;
  const s = selectedSupplier;
  const light = getTrafficLight(s);
  const days = daysSince(s.stage_entered_at);
  const nextStage = getNextStage(s.current_stage);
  const actorName = ROLE_NAME[currentRole];

  const lightColors = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500' };
  const lightTextColors = { green: 'text-emerald-700 bg-emerald-50 border-emerald-200', amber: 'text-amber-700 bg-amber-50 border-amber-200', red: 'text-red-700 bg-red-50 border-red-200' };

  const canAdvance = currentRole === 'pm' || currentRole === 'buyer' || currentRole === 'ssd';
  const ndaSigned = isNdaSigned(s.activities ?? []);
  const advanceBlocked = s.current_stage === 'b2b_evaluation' && !ndaSigned;

  const handleAdvance = async () => {
    if (!nextStage) return;
    setSubmitting(true);
    await advanceStage(s.id, nextStage, actorName);
    setSubmitting(false);
    setShowAdvanceConfirm(false);
  };

  const handleBlacklist = async () => {
    if (blacklistReason.length < 20) return;
    setSubmitting(true);
    await blacklistSupplier(s.id, blacklistReason, actorName);
    setSubmitting(false);
    setSelectedSupplierId(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex" onClick={() => setSelectedSupplierId(null)}>
      <div className="flex-1" />
      <div
        className="w-[620px] bg-white shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F172A] px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{s.name}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{s.component_category} · {s.country}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={() => exportSingleSupplier(s)}
                title="Export supplier to Excel"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <Download size={12} /> XLS
              </button>
              <button onClick={() => setSelectedSupplierId(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${lightTextColors[light]}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${lightColors[light]}`} />
              {light.toUpperCase()}
            </span>
            <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full">{STAGE_LABELS[s.current_stage]}</span>
            <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={11} />{days}d in stage</span>
          </div>

          {/* Action buttons */}
          {s.current_stage !== 'blacklisted' && (
            <div className="flex gap-2 mt-3">
              {nextStage && canAdvance && (
                <button
                  onClick={() => setShowAdvanceConfirm(true)}
                  disabled={advanceBlocked}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  title={advanceBlocked ? 'NDA must be signed before advancing' : undefined}
                >
                  {advanceBlocked && <Lock size={11} />}
                  Advance to {STAGE_LABELS[nextStage]}
                  {!advanceBlocked && <ChevronRight size={12} />}
                </button>
              )}
              {!canAdvance && nextStage && (
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 text-slate-400 text-xs py-2 rounded-lg">
                  <Lock size={11} /> Requires PM or Buyer
                </div>
              )}
              <button
                onClick={() => setShowBlacklist(true)}
                className="px-3 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 text-xs font-medium rounded-lg transition-colors border border-red-800/50"
              >
                Blacklist
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex-shrink-0">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => {
              const fileCount = tab === 'Files' ? (s.files?.length ?? 0) : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'Files' && <Paperclip size={11} />}
                  {tab}
                  {fileCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold">
                      {fileCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'Overview' && <OverviewTab />}
          {activeTab === 'RASIC Checklist' && <RasicTab />}
          {activeTab === 'Files' && <FilesTab supplierId={s.id} currentStage={s.current_stage} />}
          {activeTab === 'Timeline' && <TimelineTab />}
          {activeTab === 'Consultation Log' && <ConsultationTab />}
          {activeTab === 'Notes' && <NotesTab />}
        </div>

        {/* Advance confirm */}
        {showAdvanceConfirm && nextStage && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Confirm Stage Advancement</h3>
              <p className="text-sm text-slate-600 mb-4">
                Advance <strong>{s.name}</strong> to <strong>{STAGE_LABELS[nextStage]}</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdvanceConfirm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                <button onClick={handleAdvance} disabled={submitting} className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors">
                  {submitting ? 'Advancing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blacklist modal */}
        {showBlacklist && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm">
              <h3 className="font-semibold text-red-700 mb-2">Blacklist Supplier</h3>
              <p className="text-sm text-slate-600 mb-3">Provide a written reason (min 20 characters). This action is permanent.</p>
              <textarea
                value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="Reason for blacklisting..."
              />
              {blacklistReason.length > 0 && blacklistReason.length < 20 && (
                <p className="text-xs text-red-600 mt-1">{20 - blacklistReason.length} more characters required</p>
              )}
              <div className="flex gap-2 justify-end mt-3">
                <button onClick={() => setShowBlacklist(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button
                  onClick={handleBlacklist}
                  disabled={blacklistReason.length < 20 || submitting}
                  className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-40 transition-colors"
                >
                  {submitting ? 'Blacklisting...' : 'Blacklist'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { selectedSupplier: s, validateDuns, currentRole, updateSupplierCommodity } = useApp();
  const [editCommodity, setEditCommodity] = useState(false);
  const [comForm, setComForm] = useState({ commodity: s?.commodity ?? '', subcategory: s?.commodity_subcategory ?? '' });
  const [saving, setSaving] = useState(false);

  if (!s) return null;

  const handleSaveCommodity = async () => {
    setSaving(true);
    await updateSupplierCommodity(s.id, comForm.commodity, comForm.subcategory);
    setSaving(false);
    setEditCommodity(false);
  };

  const comClr = COMMODITY_COLORS[s.commodity] ?? COMMODITY_COLORS['Other'];

  return (
    <div className="p-5 space-y-5">
      {/* Commodity card */}
      <div className={`rounded-xl border p-4 ${comClr.bg} ${comClr.border}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold uppercase tracking-wider ${comClr.text}`}>Commodity</p>
          <button
            onClick={() => { setEditCommodity(!editCommodity); setComForm({ commodity: s.commodity, subcategory: s.commodity_subcategory }); }}
            className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${comClr.text} ${comClr.border} bg-white/60 hover:bg-white`}
          >
            {editCommodity ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editCommodity ? (
          <div className="space-y-2">
            <select
              value={comForm.commodity}
              onChange={e => setComForm(f => ({ ...f, commodity: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">Select commodity...</option>
              {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={comForm.subcategory}
              onChange={e => setComForm(f => ({ ...f, subcategory: e.target.value }))}
              placeholder="Subcategory (optional)"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveCommodity}
                disabled={saving}
                className="px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${comClr.text}`}>{s.commodity || 'Not assigned'}</span>
            {s.commodity_subcategory && <span className={`text-sm ${comClr.text} opacity-70`}>· {s.commodity_subcategory}</span>}
          </div>
        )}
      </div>

      <Section title="Supplier Details">
        <InfoRow icon={<FileText size={13} />} label="Legal Entity" value={s.legal_entity || '—'} />
        <InfoRow icon={<MapPin size={13} />} label="Location" value={`${s.facility_location || '—'}`} />
        <InfoRow icon={<MapPin size={13} />} label="Country" value={s.country} />
        <InfoRow
          icon={<Shield size={13} />}
          label="DUNS"
          value={
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{s.duns_number || '—'}</span>
              {s.duns_validated ? (
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCheck size={10} /> Validated
                </span>
              ) : (currentRole === 'buyer' || currentRole === 'ssd') ? (
                <button onClick={() => validateDuns(s.id)} className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 font-medium">
                  Validate
                </button>
              ) : (
                <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Pending</span>
              )}
            </div>
          }
        />
        {s.elm_score && <InfoRow icon={<Zap size={13} />} label="ELM Score" value={s.elm_score} />}
      </Section>

      <Section title="Programs">
        {s.programs.length > 0 ? (
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {s.programs.map(p => (
              <span key={p} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200 font-medium">{p}</span>
            ))}
          </div>
        ) : <InfoRow icon={<></>} label="" value="No programs assigned" />}
      </Section>

      <Section title="Contact">
        <InfoRow icon={<User size={13} />} label="Name" value={s.contact_name || '—'} />
        <InfoRow icon={<Mail size={13} />} label="Email" value={s.contact_email ? <a href={`mailto:${s.contact_email}`} className="text-blue-600 hover:underline text-xs">{s.contact_email}</a> : '—'} />
        <InfoRow icon={<Phone size={13} />} label="Phone" value={s.contact_phone || '—'} />
      </Section>

      <Section title="Assignment">
        <InfoRow icon={<User size={13} />} label="SSD Member" value={s.assigned_ssd_member || '—'} />
        <InfoRow icon={<GitBranch size={13} />} label="Stage" value={STAGE_LABELS[s.current_stage]} />
        <InfoRow icon={<Clock size={13} />} label="Since" value={formatDateTime(s.stage_entered_at)} />
      </Section>

      {s.current_stage === 'blacklisted' && s.blacklist_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-1"><AlertTriangle size={13} />Blacklisted</p>
          <p className="text-sm text-red-700">{s.blacklist_reason}</p>
          <p className="text-xs text-red-400 mt-1">By {s.blacklisted_by} · {s.blacklisted_at ? formatDateTime(s.blacklisted_at) : ''}</p>
        </div>
      )}
    </div>
  );
}

function RasicTab() {
  const { selectedSupplier: s, currentRole, completeActivity, submitApproval } = useApp();
  const [showApprovalModal, setShowApprovalModal] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!s) return null;
  const allActivities = s.activities ?? [];
  const allApprovals = s.approvals ?? [];
  const actorName = ROLE_NAME[currentRole];

  const groupedByStage = Object.entries(STAGE_ACTIVITIES).filter(([, defs]) => defs.length > 0);

  const handleComplete = async (actId: string) => {
    setSubmitting(true);
    await completeActivity(actId, s.id, actorName);
    setSubmitting(false);
  };

  const handleApproval = async (approved: boolean) => {
    if (!showApprovalModal) return;
    setSubmitting(true);
    await submitApproval(showApprovalModal, s.id, approved, approvalNote, actorName);
    setSubmitting(false);
    setShowApprovalModal(null);
    setApprovalNote('');
  };

  return (
    <div className="p-5 space-y-6">
      {groupedByStage.map(([stage, defs]) => {
        const stageActs = allActivities.filter(a => a.stage === stage);
        if (!stageActs.length) return null;
        const completed = stageActs.filter(a => a.is_complete).length;
        return (
          <div key={stage}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{STAGE_LABELS[stage as never]}</h4>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${completed === stageActs.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {completed}/{stageActs.length}
              </span>
            </div>
            <div className="space-y-2">
              {stageActs.map(activity => {
                const def = defs.find(d => d.key === activity.activity_key);
                if (!def) return null;
                const canDo = canCompleteActivity(currentRole, def);
                const canApprove = canApproveActivity(currentRole, def);
                const dualStatus = activity.requires_dual_approval ? getDualApprovalStatus(activity, allApprovals) : null;
                const myApproval = dualStatus ? (currentRole === 'pm' ? dualStatus.pm : dualStatus.buyer) : null;

                return (
                  <div key={activity.id} className={`rounded-lg border p-3 transition-all ${
                    activity.is_complete ? 'bg-slate-50 border-slate-100' :
                    activity.is_gate ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.is_complete ? (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        ) : activity.is_gate ? (
                          <Lock size={15} className="text-amber-500" />
                        ) : (
                          <Circle size={15} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${activity.is_complete ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {activity.activity_label}
                        </p>

                        {/* Role badges */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {def.responsible_roles.map(r => (
                            <RoleBadge key={r} role={r} prefix="R" />
                          ))}
                          {def.accountable_roles.map(r => (
                            <RoleBadge key={r} role={r} prefix="A" />
                          ))}
                          {def.support_roles.map(r => (
                            <RoleBadge key={r} role={r} prefix="S" />
                          ))}
                          {def.consulted_roles.map(r => (
                            <RoleBadge key={r} role={r} prefix="C" />
                          ))}
                        </div>

                        {/* Completion info */}
                        {activity.is_complete && activity.completed_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDateTime(activity.completed_at)} · {activity.completed_by}
                          </p>
                        )}

                        {/* Dual approval status */}
                        {activity.requires_dual_approval && dualStatus && !activity.is_complete && (
                          <div className="mt-2 flex items-center gap-2">
                            <ApprovalBadge role="pm" approved={dualStatus.pm} />
                            <ApprovalBadge role="buyer" approved={dualStatus.buyer} />
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      {!activity.is_complete && (
                        <div className="flex-shrink-0">
                          {activity.requires_dual_approval && canApprove ? (
                            myApproval === null ? (
                              <button
                                onClick={() => setShowApprovalModal(activity.id)}
                                className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-1"
                              >
                                <Users size={10} /> Vote
                              </button>
                            ) : (
                              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${myApproval ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {myApproval ? 'Approved' : 'Rejected'}
                              </span>
                            )
                          ) : !activity.requires_dual_approval && canDo ? (
                            <button
                              onClick={() => handleComplete(activity.id)}
                              disabled={submitting}
                              className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Complete
                            </button>
                          ) : !canDo && !canApprove ? (
                            <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg" title={`Requires ${def.responsible_roles.map(r => ROLE_LABELS[r]).join(' or ')} role`}>
                              <Lock size={10} />
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Approval modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-1">Cast Your Approval</h3>
            <p className="text-sm text-slate-500 mb-3">As <strong>{ROLE_LABELS[currentRole]}</strong>, submit your vote for this dual-approval activity.</p>
            <textarea
              value={approvalNote}
              onChange={e => setApprovalNote(e.target.value)}
              placeholder="Optional note..."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowApprovalModal(null)} className="px-3 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => handleApproval(false)} disabled={submitting} className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                Reject
              </button>
              <button onClick={() => handleApproval(true)} disabled={submitting} className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultationTab() {
  const { selectedSupplier: s, currentRole, submitConsultation } = useApp();
  const [consultInputs, setConsultInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (!s) return null;
  const allActivities = s.activities ?? [];
  const allConsultations = s.consultations ?? [];
  const actorName = ROLE_NAME[currentRole];

  const consultableActivities = allActivities.filter(a => a.consulted_roles?.includes(currentRole) && !a.is_complete);
  const allConsultableActivities = allActivities.filter(a => (a.consulted_roles?.length ?? 0) > 0);

  const handleSubmit = async (actId: string) => {
    const input = consultInputs[actId]?.trim();
    if (!input) return;
    setSubmitting(actId);
    await submitConsultation(actId, s.id, input, actorName);
    setConsultInputs(prev => ({ ...prev, [actId]: '' }));
    setSubmitting(null);
  };

  return (
    <div className="p-5 space-y-5">
      {consultableActivities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Awaiting Your Input
          </h4>
          <div className="space-y-3">
            {consultableActivities.map(activity => {
              const existing = allConsultations.filter(c => c.activity_id === activity.id && c.role === currentRole);
              return (
                <div key={activity.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">{activity.activity_label}</p>
                  {existing.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {existing.map(c => (
                        <div key={c.id} className="bg-white rounded-lg p-2 border border-orange-100 text-xs text-slate-700">
                          <p>{c.input_text}</p>
                          <p className="text-slate-400 mt-0.5">{formatDateTime(c.submitted_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={consultInputs[activity.id] ?? ''}
                    onChange={e => setConsultInputs(prev => ({ ...prev, [activity.id]: e.target.value }))}
                    placeholder="Enter your consultation input..."
                    className="w-full border border-orange-200 rounded-lg p-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={() => handleSubmit(activity.id)}
                      disabled={!consultInputs[activity.id]?.trim() || submitting === activity.id}
                      className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-40 font-medium"
                    >
                      {submitting === activity.id ? 'Submitting...' : 'Submit Input'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allConsultableActivities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Consultation Records</h4>
          <div className="space-y-3">
            {allConsultableActivities.map(activity => {
              const consultations = allConsultations.filter(c => c.activity_id === activity.id);
              if (!consultations.length) return null;
              return (
                <div key={activity.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">{activity.activity_label}</p>
                  <div className="space-y-2">
                    {consultations.map(c => {
                      const rc = ROLE_COLORS[c.role];
                      return (
                        <div key={c.id} className="flex gap-2">
                          <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${rc.bg} ${rc.text}`}>
                            {ROLE_LABELS[c.role]}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-700">{c.input_text}</p>
                            <p className="text-xs text-slate-400">{c.consultant_name} · {formatDateTime(c.submitted_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {consultableActivities.length === 0 && allConsultations.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-10">No consultation inputs yet.</p>
      )}
    </div>
  );
}

function TimelineTab() {
  const { selectedSupplier: s } = useApp();
  if (!s) return null;
  const timeline = [...(s.timeline ?? [])].reverse();
  if (!timeline.length) return <p className="text-center text-slate-400 text-sm py-10 p-5">No timeline entries yet.</p>;

  return (
    <div className="p-5">
      <div className="space-y-0">
        {timeline.map((entry, idx) => {
          const rc = ROLE_COLORS[entry.performed_by_role];
          return (
            <div key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                  entry.event_type === 'blacklisted' ? 'bg-red-500' :
                  entry.event_type === 'stage_change' ? 'bg-blue-500' :
                  entry.event_type === 'dual_approval_complete' ? 'bg-emerald-500' :
                  'bg-slate-400'
                }`} />
                {idx < timeline.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1" />}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-sm text-slate-800 leading-snug">{entry.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${rc.bg} ${rc.text}`}>
                    {ROLE_LABELS[entry.performed_by_role]}
                  </span>
                  <span className="text-xs text-slate-400">{entry.performed_by_name}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{formatDateTime(entry.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotesTab() {
  const { selectedSupplier: s, addNote, currentRole } = useApp();
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  if (!s) return null;

  const notes = [...(s.notes ?? [])].reverse();
  const actorName = ROLE_NAME[currentRole];

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await addNote(s.id, s.current_stage, noteText.trim(), actorName);
    setNoteText('');
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Add Note</p>
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Enter note..."
          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white h-20"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            disabled={!noteText.trim() || saving}
            className="px-4 py-1.5 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare size={12} /> {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">No notes yet.</p>
      ) : notes.map(note => {
        const rc = ROLE_COLORS[note.author_role];
        return (
          <div key={note.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                {STAGE_LABELS[note.stage as never]}
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(note.created_at)}</span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
            <p className="text-xs text-slate-400 mt-1.5">— {note.author_name} ({ROLE_LABELS[note.author_role]})</p>
          </div>
        );
      })}
    </div>
  );
}

function RoleBadge({ role, prefix }: { role: UserRole; prefix: string }) {
  const c = ROLE_COLORS[role];
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className="opacity-60 text-xs">{prefix}:</span>{ROLE_LABELS[role]}
    </span>
  );
}

function ApprovalBadge({ role, approved }: { role: 'pm' | 'buyer'; approved: boolean | null }) {
  const c = ROLE_COLORS[role];
  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
      approved === true ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      approved === false ? 'bg-red-50 text-red-700 border-red-200' :
      `${c.bg} ${c.text} ${c.border} opacity-60`
    }`}>
      <span>{ROLE_LABELS[role]}:</span>
      <span>{approved === true ? '✓ Approved' : approved === false ? '✗ Rejected' : 'Pending'}</span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-slate-400 flex-shrink-0 w-4">{icon}</span>
      <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 flex-1 min-w-0">{value}</span>
    </div>
  );
}
