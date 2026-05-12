import { useApp } from '../context/AppContext';
import { STAGE_LABELS, ROLE_LABELS, UserRole, ROLE_COLORS } from '../types';
import { daysSince, isNdaSigned, getDualApprovalStatus } from '../lib/utils';
import { AlertTriangle, Clock, Users, Shield, CheckCircle, TrendingUp, ClipboardList, Zap } from 'lucide-react';

export default function WeeklyReviewView() {
  const { suppliers, setSelectedSupplierId, currentRole } = useApp();

  const active = suppliers.filter(s => s.current_stage !== 'blacklisted');
  const parkingLot = suppliers.filter(s => s.current_stage === 'parking_lot');
  const prelimEval = suppliers.filter(s => s.current_stage === 'preliminary_evaluation');
  const blacklisted = suppliers.filter(s => s.current_stage === 'blacklisted');
  const rfq = suppliers.filter(s => s.current_stage === 'rfq');

  const parkingOverdue = parkingLot.filter(s => daysSince(s.stage_entered_at) >= 30);
  const parkingAmber = parkingLot.filter(s => { const d = daysSince(s.stage_entered_at); return d >= 25 && d < 30; });
  const prelimOverdue = prelimEval.filter(s => daysSince(s.stage_entered_at) >= 60);
  const prelimAmber = prelimEval.filter(s => { const d = daysSince(s.stage_entered_at); return d >= 50 && d < 60; });

  const ndaBlocked = suppliers.filter(s => s.current_stage === 'b2b_evaluation' && !isNdaSigned(s.activities ?? []));

  const pendingDualApprovals = active.flatMap(s =>
    (s.activities ?? [])
      .filter(a => a.requires_dual_approval && !a.is_complete)
      .map(a => ({ supplier: s, activity: a, approvals: s.approvals ?? [] }))
  );

  const myPendingApprovals = pendingDualApprovals.filter(({ activity, approvals }) => {
    const status = getDualApprovalStatus(activity, approvals);
    if (currentRole === 'pm') return status.pm === null;
    if (currentRole === 'buyer') return status.buyer === null;
    return false;
  });

  const pendingConsultations = active.flatMap(s =>
    (s.activities ?? [])
      .filter(a => a.requires_consultation && !a.is_complete && a.consulted_roles?.includes(currentRole))
      .map(a => ({ supplier: s, activity: a }))
  );

  const pendingQualityAssessments = active.flatMap(s =>
    (s.activities ?? [])
      .filter(a => (a.activity_key === 'pe_quality_assessment' || a.activity_key === 'pe_quality_feedback') && !a.is_complete)
      .map(a => ({ supplier: s, activity: a }))
  );

  const kpis = [
    { label: 'Total Active', value: active.length, color: 'bg-blue-600', icon: TrendingUp },
    { label: 'Parking Lot', value: parkingLot.length, color: 'bg-amber-500', icon: Clock },
    { label: 'Prelim Eval', value: prelimEval.length, color: 'bg-orange-500', icon: ClipboardList },
    { label: 'Blacklisted', value: blacklisted.length, color: 'bg-red-600', icon: Shield },
    { label: 'RFQ Stage', value: rfq.length, color: 'bg-emerald-600', icon: CheckCircle },
  ];

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto p-5">
      <div className="max-w-7xl mx-auto">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Weekly Review Dashboard</h1>
            <RolePill role={currentRole} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className={`w-9 h-9 ${kpi.color} rounded-lg flex items-center justify-center mb-2.5`}>
                  <Icon size={16} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Role-specific sections */}
        <div className="grid grid-cols-2 gap-4">

          {/* Parking Lot Overdue — all roles see this */}
          <FlagCard title="Parking Lot Overdue" subtitle="≥ 30 days" icon={<AlertTriangle size={14} className="text-red-600" />} color="red" count={parkingOverdue.length}>
            {parkingOverdue.map(s => (
              <FlagRow key={s.id} name={s.name} sub={`${STAGE_LABELS[s.current_stage]} · ${s.country}`} badge={`${daysSince(s.stage_entered_at)}d`} badgeColor="red" onClick={() => setSelectedSupplierId(s.id)} />
            ))}
          </FlagCard>

          {/* Parking Lot Approaching */}
          <FlagCard title="Parking Lot Approaching Limit" subtitle="25–29 days" icon={<Clock size={14} className="text-amber-600" />} color="amber" count={parkingAmber.length}>
            {parkingAmber.map(s => (
              <FlagRow key={s.id} name={s.name} sub={`${s.country} · ${s.component_category}`} badge={`${daysSince(s.stage_entered_at)}d`} badgeColor="amber" onClick={() => setSelectedSupplierId(s.id)} />
            ))}
          </FlagCard>

          {/* Prelim Eval Overdue */}
          <FlagCard title="Preliminary Eval Overdue" subtitle="≥ 60 days" icon={<AlertTriangle size={14} className="text-red-600" />} color="red" count={prelimOverdue.length}>
            {prelimOverdue.map(s => (
              <FlagRow key={s.id} name={s.name} sub={`${s.country} · ${s.component_category}`} badge={`${daysSince(s.stage_entered_at)}d`} badgeColor="red" onClick={() => setSelectedSupplierId(s.id)} />
            ))}
          </FlagCard>

          {/* NDA Blocked */}
          <FlagCard title="NDA Not Signed" subtitle="Blocking B2B advancement" icon={<Shield size={14} className="text-red-600" />} color="red" count={ndaBlocked.length}>
            {ndaBlocked.map(s => (
              <FlagRow key={s.id} name={s.name} sub={`B2B Evaluation · ${s.country}`} badge="NDA Pending" badgeColor="red" onClick={() => setSelectedSupplierId(s.id)} />
            ))}
          </FlagCard>

          {/* PM/Buyer dual approvals */}
          {(currentRole === 'pm' || currentRole === 'buyer') && (
            <FlagCard title="Pending Your Approval" subtitle="Dual-approval activities awaiting your vote" icon={<Users size={14} className="text-violet-600" />} color="violet" count={myPendingApprovals.length}>
              {myPendingApprovals.map(({ supplier, activity }) => (
                <FlagRow
                  key={`${supplier.id}-${activity.id}`}
                  name={supplier.name}
                  sub={activity.activity_label}
                  badge="Vote needed"
                  badgeColor="violet"
                  onClick={() => setSelectedSupplierId(supplier.id)}
                />
              ))}
            </FlagCard>
          )}

          {/* SQD consultations */}
          {currentRole === 'sqd' && (
            <FlagCard title="Consultation Requests" subtitle="Activities requiring your input" icon={<AlertTriangle size={14} className="text-orange-600" />} color="orange" count={pendingConsultations.length}>
              {pendingConsultations.map(({ supplier, activity }) => (
                <FlagRow key={`${supplier.id}-${activity.id}`} name={supplier.name} sub={activity.activity_label} badge="Input needed" badgeColor="orange" onClick={() => setSelectedSupplierId(supplier.id)} />
              ))}
            </FlagCard>
          )}

          {currentRole === 'sqd' && (
            <FlagCard title="Quality Assessments Due" subtitle="SQD exclusive activities pending" icon={<Zap size={14} className="text-orange-600" />} color="orange" count={pendingQualityAssessments.length}>
              {pendingQualityAssessments.map(({ supplier, activity }) => (
                <FlagRow key={`${supplier.id}-${activity.id}`} name={supplier.name} sub={activity.activity_label} badge="Due" badgeColor="orange" onClick={() => setSelectedSupplierId(supplier.id)} />
              ))}
            </FlagCard>
          )}

          {/* SSD all pending activities */}
          {currentRole === 'ssd' && (
            <FlagCard title="Your Pending Activities" subtitle="Activities you need to complete" icon={<ClipboardList size={14} className="text-blue-600" />} color="blue" count={
              active.filter(s => (s.activities ?? []).some(a => a.responsible_roles?.includes('ssd') && !a.is_complete)).length
            }>
              {active.filter(s => (s.activities ?? []).some(a => a.responsible_roles?.includes('ssd') && !a.is_complete)).map(s => {
                const pending = (s.activities ?? []).filter(a => a.responsible_roles?.includes('ssd') && !a.is_complete).length;
                return (
                  <FlagRow key={s.id} name={s.name} sub={`${STAGE_LABELS[s.current_stage]} · ${pending} pending`} badge={`${pending} tasks`} badgeColor="blue" onClick={() => setSelectedSupplierId(s.id)} />
                );
              })}
            </FlagCard>
          )}

          {/* All pending dual approvals overview */}
          <FlagCard title="All Pending Dual Approvals" subtitle="PM + Buyer sign-off required" icon={<Users size={14} className="text-violet-600" />} color="violet" count={pendingDualApprovals.length}>
            {pendingDualApprovals.slice(0, 8).map(({ supplier, activity, approvals }) => {
              const status = getDualApprovalStatus(activity, approvals);
              return (
                <div
                  key={`${supplier.id}-${activity.id}`}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                  onClick={() => setSelectedSupplierId(supplier.id)}
                >
                  <p className="text-sm font-medium text-slate-900 truncate">{supplier.name}</p>
                  <p className="text-xs text-slate-500 truncate mb-1">{activity.activity_label}</p>
                  <div className="flex gap-1.5">
                    <MiniApprovalBadge role="pm" approved={status.pm} />
                    <MiniApprovalBadge role="buyer" approved={status.buyer} />
                  </div>
                </div>
              );
            })}
          </FlagCard>

        </div>
      </div>
    </div>
  );
}

function RolePill({ role }: { role: UserRole }) {
  const c = ROLE_COLORS[role];
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
      {ROLE_LABELS[role]} view
    </span>
  );
}

function FlagCard({ title, subtitle, icon, color, count, children }: {
  title: string; subtitle: string; icon: React.ReactNode; color: string; count: number; children: React.ReactNode;
}) {
  const borders: Record<string, string> = {
    red: 'border-red-200', amber: 'border-amber-200', violet: 'border-violet-200',
    orange: 'border-orange-200', blue: 'border-blue-200'
  };
  const bgs: Record<string, string> = {
    red: 'bg-red-50', amber: 'bg-amber-50', violet: 'bg-violet-50',
    orange: 'bg-orange-50', blue: 'bg-blue-50'
  };
  const countBg: Record<string, string> = {
    red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700', orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className={`bg-white rounded-xl border ${borders[color] ?? 'border-slate-200'} shadow-sm overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${borders[color] ?? 'border-slate-200'} ${bgs[color] ?? 'bg-slate-50'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countBg[color] ?? 'bg-slate-100 text-slate-700'}`}>{count}</span>
      </div>
      <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
        {count === 0 ? (
          <div className="px-4 py-5 text-center">
            <CheckCircle size={18} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">All clear</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

function FlagRow({ name, sub, badge, badgeColor, onClick }: {
  name: string; sub: string; badge: string; badgeColor: string; onClick: () => void;
}) {
  const badgeColors: Record<string, string> = {
    red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700', orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700'
  };
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
        <p className="text-xs text-slate-500 truncate">{sub}</p>
      </div>
      <span className={`flex-shrink-0 ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColors[badgeColor] ?? 'bg-slate-100 text-slate-700'}`}>{badge}</span>
    </button>
  );
}

function MiniApprovalBadge({ role, approved }: { role: string; approved: boolean | null }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
      approved === true ? 'bg-emerald-100 text-emerald-700' :
      approved === false ? 'bg-red-100 text-red-700' :
      'bg-slate-100 text-slate-500'
    }`}>
      {ROLE_LABELS[role as UserRole]}: {approved === true ? '✓' : approved === false ? '✗' : '…'}
    </span>
  );
}
