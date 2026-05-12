// ─── Enums ────────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'form_submitted'
  | 'new_supplier_identified'
  | 'scouting_event_prep'
  | 'b2b_evaluation'
  | 'parking_lot'
  | 'preliminary_evaluation'
  | 'rfq'
  | 'investigation_record'
  | 'blacklisted';

export type UserRole = 'ssd' | 'pm' | 'buyer' | 'sqd';

// ─── Labels ───────────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<PipelineStage, string> = {
  form_submitted: 'Incoming Requests',
  new_supplier_identified: 'New Supplier Identified',
  scouting_event_prep: 'Scouting Event Prep',
  b2b_evaluation: 'B2B Evaluation',
  parking_lot: 'Parking Lot',
  preliminary_evaluation: 'Preliminary Evaluation',
  rfq: 'RFQ',
  investigation_record: 'Investigation Record',
  blacklisted: 'Blacklisted',
};

export const STAGE_ORDER: PipelineStage[] = [
  'form_submitted',
  'new_supplier_identified',
  'scouting_event_prep',
  'b2b_evaluation',
  'parking_lot',
  'preliminary_evaluation',
  'rfq',
  'investigation_record',
  'blacklisted',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ssd: 'SSD',
  pm: 'PM',
  buyer: 'Buyer',
  sqd: 'SQD',
};

export const ROLE_FULL_LABELS: Record<UserRole, string> = {
  ssd: 'Supplier Scouting Development',
  pm: 'Purchasing Manager',
  buyer: 'Buyer',
  sqd: 'Supplier Quality Development',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string; solid: string }> = {
  ssd:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   solid: 'bg-blue-600' },
  pm:    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', solid: 'bg-violet-600' },
  buyer: { bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-300',solid: 'bg-emerald-600' },
  sqd:   { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', solid: 'bg-orange-600' },
};

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  duns_number: string;
  duns_validated: boolean;
  legal_entity: string;
  facility_location: string;
  country: string;
  commodity: string;
  commodity_subcategory: string;
  component_category: string;
  programs: string[];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  current_stage: PipelineStage;
  assigned_ssd_member: string;
  elm_score: string;
  stage_entered_at: string;
  blacklist_reason: string;
  blacklisted_by: string;
  blacklisted_at: string | null;
  source: 'internal' | 'self_registered';
  pending_review: boolean;
  self_registered_at: string | null;
  notes_from_supplier: string;
  created_at: string;
  updated_at: string;
  // enriched
  activities?: Activity[];
  timeline?: TimelineEntry[];
  notes?: SupplierNote[];
  approvals?: ActivityApproval[];
  consultations?: ActivityConsultation[];
  files?: SupplierFile[];
}

// ─── Commodities ──────────────────────────────────────────────────────────────

export const COMMODITIES = [
  'Plastics',
  'Cage',
  'Electronics',
  'Welding',
  'Stamping',
  'Casting',
  'Forging',
  'Raw Materials',
  'Electrical Components',
  'Fasteners',
  'Other',
] as const;

export type Commodity = typeof COMMODITIES[number];

export const COMMODITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Plastics':             { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-300',     dot: 'bg-sky-500' },
  'Cage':                 { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  'Electronics':          { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-300',  dot: 'bg-violet-500' },
  'Welding':              { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  dot: 'bg-orange-500' },
  'Stamping':             { bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-300',  dot: 'bg-yellow-500' },
  'Casting':              { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  'Forging':              { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     dot: 'bg-red-500' },
  'Raw Materials':        { bg: 'bg-stone-100',   text: 'text-stone-700',   border: 'border-stone-300',   dot: 'bg-stone-500' },
  'Electrical Components':{ bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-300',    dot: 'bg-teal-500' },
  'Fasteners':            { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300',   dot: 'bg-slate-500' },
  'Other':                { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300',    dot: 'bg-gray-400' },
  '':                     { bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-300' },
};

export interface Activity {
  id: string;
  supplier_id: string;
  stage: PipelineStage;
  activity_key: string;
  activity_label: string;
  responsible_roles: UserRole[];
  accountable_roles: UserRole[];
  support_roles: UserRole[];
  consulted_roles: UserRole[];
  informed_roles: UserRole[];
  requires_dual_approval: boolean;
  requires_consultation: boolean;
  is_gate: boolean;
  is_complete: boolean;
  completed_at: string | null;
  completed_by: string;
  completed_by_role: UserRole | null;
  sort_order: number;
  created_at: string;
}

export interface ActivityApproval {
  id: string;
  activity_id: string;
  supplier_id: string;
  role: UserRole;
  approved: boolean | null;
  rejection_note: string;
  approved_by_name: string;
  created_at: string;
}

export interface ActivityConsultation {
  id: string;
  activity_id: string;
  supplier_id: string;
  role: UserRole;
  consultant_name: string;
  input_text: string;
  submitted_at: string;
}

export interface TimelineEntry {
  id: string;
  supplier_id: string;
  event_type: string;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage | null;
  description: string;
  performed_by_role: UserRole;
  performed_by_name: string;
  created_at: string;
}

export interface SupplierNote {
  id: string;
  supplier_id: string;
  stage: PipelineStage;
  content: string;
  author_role: UserRole;
  author_name: string;
  created_at: string;
}

export interface SupplierFile {
  id: string;
  supplier_id: string;
  stage: string;
  activity_id: string | null;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_role: string;
  created_at: string;
  // client-only: resolved public URL
  url?: string;
}

export interface NewSupplierInput {
  name: string;
  legal_entity: string;
  country: string;
  facility_location: string;
  commodity: string;
  commodity_subcategory: string;
  component_category: string;
  programs: string[];
  duns_number: string;
  assigned_ssd_member: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  elm_score: string;
}

export interface ScoutingEvent {
  id: string;
  name: string;
  event_date: string;
  location: string;
  organizer: string;
  supplier_ids: string[];
  preliminary_list_complete: boolean;
  b2b_agenda_complete: boolean;
  layout_file_complete: boolean;
  nda_tracker: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  target_role: UserRole;
  supplier_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── Activity Definitions ─────────────────────────────────────────────────────

export interface ActivityDef {
  key: string;
  label: string;
  responsible_roles: UserRole[];
  accountable_roles: UserRole[];
  support_roles: UserRole[];
  consulted_roles: UserRole[];
  informed_roles: UserRole[];
  requires_dual_approval: boolean;
  requires_consultation: boolean;
  is_gate: boolean;
}

export const STAGE_ACTIVITIES: Record<PipelineStage, ActivityDef[]> = {
  form_submitted: [],
  new_supplier_identified: [],
  scouting_event_prep: [
    { key: 'scout_dev_need',        label: 'Supplier Development Need defined',       responsible_roles: ['buyer'],     accountable_roles: ['pm'],         support_roles: [],        consulted_roles: [],      informed_roles: ['ssd','sqd'],   requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'scout_master_req',      label: 'Master Requirement List complete',        responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: [],        consulted_roles: ['sqd'], informed_roles: ['buyer'],       requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'scout_event_plan',      label: 'Sourcing event plan prepared',            responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: ['buyer'], consulted_roles: ['sqd'], informed_roles: [],              requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'scout_qr_ready',        label: 'QR code and form link ready',             responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'scout_layout',          label: 'Event layout requested',                  responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'scout_prelim_list',     label: 'Preliminary supplier list created',       responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['buyer'],       requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'scout_sqd_consult',     label: 'SQD consultation recorded before proceeding', responsible_roles: ['sqd'], accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['ssd','pm'],    requires_dual_approval: false, requires_consultation: true,  is_gate: true  },
  ],
  b2b_evaluation: [
    { key: 'b2b_event_executed',    label: 'Scouting event executed',                 responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: ['buyer'], consulted_roles: [],      informed_roles: ['sqd'],         requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'b2b_info_collected',    label: 'Supplier information collected',          responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: ['buyer'], consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'b2b_agenda_created',    label: 'Event agenda created',                   responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: ['buyer'], consulted_roles: ['sqd'], informed_roles: [],              requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'b2b_nda_signed',        label: 'NDA signed — both sides',                responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: ['buyer'], consulted_roles: [],      informed_roles: ['sqd'],         requires_dual_approval: false, requires_consultation: false, is_gate: true  },
    { key: 'b2b_meeting_coord',     label: 'B2B meeting coordinated',                responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'b2b_prelim_reviewed',   label: 'Preliminary supplier list reviewed',     responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['buyer'],       requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'b2b_eligibility',       label: 'B2B eligibility decision: PM + Buyer',  responsible_roles: ['pm','buyer'],accountable_roles: ['pm','buyer'], support_roles: [],        consulted_roles: [],      informed_roles: ['ssd'],         requires_dual_approval: true,  requires_consultation: false, is_gate: true  },
  ],
  parking_lot: [
    { key: 'pl_added',              label: 'Supplier added with inclusion reason',    responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['pm','buyer'],  requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'pl_weekly_review',      label: 'Weekly SSD review meeting logged',        responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: [],        consulted_roles: ['buyer','sqd'],informed_roles: [],           requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'pl_weekly_decision',    label: 'Parking Lot weekly decision: PM + Buyer',responsible_roles: ['pm','buyer'],accountable_roles: ['pm','buyer'], support_roles: [],        consulted_roles: [],      informed_roles: ['ssd'],         requires_dual_approval: true,  requires_consultation: false, is_gate: true  },
    { key: 'pl_gsm_notified',       label: 'GSM team notified of results',            responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['pm'],          requires_dual_approval: false, requires_consultation: false, is_gate: false },
  ],
  preliminary_evaluation: [
    { key: 'pe_review_meeting',     label: 'Supplier Development review meeting held',responsible_roles: ['ssd'],       accountable_roles: ['pm'],         support_roles: [],        consulted_roles: ['buyer','sqd'],informed_roles: [],           requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'pe_advance_decision',   label: 'Decision to advance or stay: PM + Buyer',responsible_roles: ['pm','buyer'],accountable_roles: ['pm','buyer'], support_roles: [],        consulted_roles: [],      informed_roles: ['ssd'],         requires_dual_approval: true,  requires_consultation: false, is_gate: true  },
    { key: 'pe_initiated',          label: 'Preliminary evaluation initiated',         responsible_roles: ['ssd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'pe_compliance_eval',    label: 'Supplier requirements compliance evaluated',responsible_roles: ['ssd'],     accountable_roles: ['pm'],         support_roles: [],        consulted_roles: ['buyer','sqd'],informed_roles: [],           requires_dual_approval: false, requires_consultation: true,  is_gate: false },
    { key: 'pe_dev_activities',     label: 'Supplier development activities executed', responsible_roles: ['ssd'],      accountable_roles: [],             support_roles: ['buyer'], consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'pe_quality_assessment', label: 'Supplier Quality Assessment — SQD ONLY',  responsible_roles: ['sqd'],      accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['ssd','pm'],    requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'pe_quality_feedback',   label: 'Quality feedback provided — SQD ONLY',   responsible_roles: ['sqd'],       accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['ssd','pm'],    requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'pe_eligibility',        label: 'Eligibility to proceed: PM + Buyer',      responsible_roles: ['pm','buyer'],accountable_roles: ['pm','buyer'], support_roles: [],        consulted_roles: [],      informed_roles: ['ssd'],         requires_dual_approval: true,  requires_consultation: false, is_gate: true  },
  ],
  rfq: [
    { key: 'rfq_completed',         label: 'Preliminary Evaluation RFQ completed — BUYER ONLY', responsible_roles: ['buyer'], accountable_roles: [], support_roles: [], consulted_roles: [], informed_roles: ['ssd','pm'], requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'rfq_parts_defined',     label: 'Part numbers and programs defined',        responsible_roles: ['buyer'],     accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['ssd'],         requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'rfq_duns_validated',    label: 'DUNS number validated — legal entity confirmed', responsible_roles: ['buyer','ssd'], accountable_roles: [], support_roles: [], consulted_roles: [], informed_roles: ['pm'], requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'rfq_docusign',          label: 'All documents signed via DocuSign confirmed', responsible_roles: ['buyer','ssd'], accountable_roles: [], support_roles: [], consulted_roles: [], informed_roles: ['pm'], requires_dual_approval: false, requires_consultation: false, is_gate: true },
  ],
  investigation_record: [
    { key: 'ir_created',            label: 'Investigation record created — BUYER ONLY', responsible_roles: ['buyer'],   accountable_roles: [],             support_roles: [],        consulted_roles: [],      informed_roles: ['ssd','pm','sqd'], requires_dual_approval: false, requires_consultation: false, is_gate: false },
    { key: 'ir_90day_compliance',   label: '90-day cycle compliance confirmed',         responsible_roles: ['buyer','ssd'], accountable_roles: ['pm'],    support_roles: [],        consulted_roles: [],      informed_roles: [],              requires_dual_approval: false, requires_consultation: false, is_gate: false },
  ],
  blacklisted: [],
};

// ─── Permissions ──────────────────────────────────────────────────────────────

export function canCompleteActivity(role: UserRole, activity: ActivityDef): boolean {
  return activity.responsible_roles.includes(role);
}

export function canApproveActivity(role: UserRole, activity: ActivityDef): boolean {
  return activity.requires_dual_approval &&
    (activity.responsible_roles.includes(role) || activity.accountable_roles.includes(role));
}

export function canConsult(role: UserRole, activity: ActivityDef): boolean {
  return activity.consulted_roles.includes(role);
}

export function getNextStage(current: PipelineStage): PipelineStage | null {
  const order: PipelineStage[] = STAGE_ORDER.filter(s => s !== 'blacklisted' && s !== 'form_submitted');
  const idx = order.indexOf(current);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

export function canAdvanceStage(role: UserRole, _fromStage: PipelineStage): boolean {
  return role === 'pm' || role === 'buyer' || role === 'ssd';
}
