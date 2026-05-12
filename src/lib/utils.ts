import { Supplier, PipelineStage, Activity, ActivityApproval } from '../types';

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function getTrafficLight(supplier: Supplier): 'green' | 'amber' | 'red' {
  const days = daysSince(supplier.stage_entered_at);
  if (supplier.current_stage === 'parking_lot') {
    if (days >= 30) return 'red';
    if (days >= 25) return 'amber';
    return 'green';
  }
  if (supplier.current_stage === 'preliminary_evaluation') {
    if (days >= 60) return 'red';
    if (days >= 50) return 'amber';
    return 'green';
  }
  const total = daysSince(supplier.created_at);
  if (total >= 90) return 'red';
  if (total >= 75) return 'amber';
  return 'green';
}

export function getActivityCompletion(activities: Activity[]): number {
  if (!activities.length) return 100;
  return Math.round((activities.filter(a => a.is_complete).length / activities.length) * 100);
}

export function getDualApprovalStatus(
  activity: Activity,
  approvals: ActivityApproval[]
): { pm: boolean | null; buyer: boolean | null } {
  const actApprovals = approvals.filter(a => a.activity_id === activity.id);
  const pm = actApprovals.find(a => a.role === 'pm');
  const buyer = actApprovals.find(a => a.role === 'buyer');
  return {
    pm: pm?.approved ?? null,
    buyer: buyer?.approved ?? null,
  };
}

export function isNdaSigned(activities: Activity[]): boolean {
  return activities.find(a => a.activity_key === 'b2b_nda_signed')?.is_complete ?? false;
}

export function isDunsValidated(supplier: Supplier): boolean {
  return supplier.duns_validated;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const STAGE_HEADER_COLORS: Record<PipelineStage, string> = {
  form_submitted:          'bg-violet-600',
  new_supplier_identified: 'bg-slate-600',
  scouting_event_prep:     'bg-blue-600',
  b2b_evaluation:          'bg-blue-800',
  parking_lot:             'bg-amber-600',
  preliminary_evaluation:  'bg-orange-600',
  rfq:                     'bg-emerald-700',
  investigation_record:    'bg-teal-700',
  blacklisted:             'bg-red-700',
};
