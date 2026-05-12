import { Supplier, ROLE_COLORS, UserRole, COMMODITY_COLORS } from '../types';
import { daysSince, getTrafficLight, getActivityCompletion, getDualApprovalStatus } from '../lib/utils';
import { MapPin, Clock, Lock, AlertTriangle, CheckCheck, Users } from 'lucide-react';

interface Props {
  supplier: Supplier;
  currentRole: UserRole;
  onClick: () => void;
}

export default function SupplierCard({ supplier, currentRole, onClick }: Props) {
  const light = getTrafficLight(supplier);
  const days = daysSince(supplier.stage_entered_at);
  const acts = supplier.activities ?? [];
  const approvals = supplier.approvals ?? [];
  const docPct = getActivityCompletion(acts);

  const pendingDualApprovals = acts.filter(a =>
    a.requires_dual_approval && !a.is_complete
  );

  const myPendingApprovals = pendingDualApprovals.filter(a => {
    const status = getDualApprovalStatus(a, approvals);
    if (currentRole === 'pm') return status.pm === null;
    if (currentRole === 'buyer') return status.buyer === null;
    return false;
  });

  const pendingConsultations = acts.filter(a =>
    a.requires_consultation &&
    !a.is_complete &&
    a.consulted_roles?.includes(currentRole)
  );

  const isNdaBlocked = supplier.current_stage === 'b2b_evaluation' &&
    acts.find(a => a.activity_key === 'b2b_nda_signed' && !a.is_complete);

  const lightRing = {
    green: 'border-l-emerald-400',
    amber: 'border-l-amber-400',
    red: 'border-l-red-500',
  }[light];

  const lightDot = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-red-500 animate-pulse',
  }[light];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${lightRing} p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors leading-tight">
            {supplier.name}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{supplier.component_category}</p>
        </div>
        <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full mt-0.5 ${lightDot}`} />
      </div>

      {/* Commodity badge */}
      {supplier.commodity && (() => {
        const clr = COMMODITY_COLORS[supplier.commodity] ?? COMMODITY_COLORS['Other'];
        return (
          <div className="mt-1.5">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${clr.bg} ${clr.text} ${clr.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${clr.dot}`} />
              {supplier.commodity}
            </span>
          </div>
        );
      })()}

      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1"><MapPin size={10} />{supplier.country}</span>
        <span className="flex items-center gap-1"><Clock size={10} />{days}d</span>
        {supplier.assigned_ssd_member && (
          <span className="text-slate-300">·</span>
        )}
        {supplier.assigned_ssd_member && (
          <span className="truncate max-w-[80px]">{supplier.assigned_ssd_member.split(' ')[0]}</span>
        )}
      </div>

      {/* Activity progress bar */}
      {acts.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Activities</span>
            <span className="text-xs font-medium text-slate-600">{docPct}%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${docPct === 100 ? 'bg-emerald-500' : docPct > 60 ? 'bg-blue-500' : 'bg-amber-400'}`}
              style={{ width: `${docPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Programs */}
      {supplier.programs.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {supplier.programs.slice(0, 2).map(p => (
            <span key={p} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {p}
            </span>
          ))}
          {supplier.programs.length > 2 && (
            <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">+{supplier.programs.length - 2}</span>
          )}
        </div>
      )}

      {/* Badges row */}
      <div className="mt-2 flex flex-wrap gap-1">
        {isNdaBlocked && (
          <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
            <Lock size={9} /> NDA Pending
          </span>
        )}
        {myPendingApprovals.length > 0 && (
          <span className="flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded font-medium">
            <Users size={9} /> {myPendingApprovals.length} approval{myPendingApprovals.length > 1 ? 's' : ''}
          </span>
        )}
        {pendingConsultations.length > 0 && (
          <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-medium">
            <AlertTriangle size={9} /> Consult needed
          </span>
        )}
        {light === 'red' && supplier.current_stage === 'parking_lot' && (
          <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
            {days}/30d overdue
          </span>
        )}
        {light === 'red' && supplier.current_stage === 'preliminary_evaluation' && (
          <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
            {days}/60d overdue
          </span>
        )}
        {supplier.duns_validated && (
          <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
            <CheckCheck size={9} /> DUNS
          </span>
        )}
      </div>
    </div>
  );
}
