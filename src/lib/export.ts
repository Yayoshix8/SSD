import * as XLSX from 'xlsx';
import { Supplier, Activity, ActivityApproval, ActivityConsultation, ScoutingEvent, STAGE_LABELS, ROLE_LABELS } from '../types';
import { daysSince, formatDateTime } from './utils';

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const colWidths: number[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) max = Math.max(max, String(cell.v).length + 2);
    }
    colWidths.push({ wch: Math.min(max, 60) } as never);
  }
  ws['!cols'] = colWidths;
}

export function exportPipelineReport(suppliers: Supplier[]) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Pipeline Overview ──────────────────────────────────────────────
  const overviewRows = suppliers.map(s => ({
    'Supplier Name': s.name,
    'Country': s.country,
    'Commodity': s.commodity || '',
    'Commodity Subcategory': s.commodity_subcategory || '',
    'Component Category': s.component_category,
    'Programs': s.programs.join(', '),
    'Current Stage': STAGE_LABELS[s.current_stage],
    'Days in Stage': daysSince(s.stage_entered_at),
    'Assigned SSD Member': s.assigned_ssd_member,
    'DUNS Number': s.duns_number,
    'DUNS Validated': s.duns_validated ? 'Yes' : 'No',
    'Legal Entity': s.legal_entity,
    'Facility Location': s.facility_location,
    'Contact Name': s.contact_name,
    'Contact Email': s.contact_email,
    'Contact Phone': s.contact_phone,
    'ELM Score': s.elm_score || '—',
    'Stage Entry Date': formatDateTime(s.stage_entered_at),
    'Created': formatDateTime(s.created_at),
    'Blacklist Reason': s.blacklist_reason || '',
    'Blacklisted By': s.blacklisted_by || '',
    'Blacklisted At': s.blacklisted_at ? formatDateTime(s.blacklisted_at) : '',
  }));
  const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
  autoWidth(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Pipeline Overview');

  // ── Sheet 2: Activities (RASIC) ──────────────────────────────────────────────
  const actRows: Record<string, string>[] = [];
  for (const s of suppliers) {
    for (const a of (s.activities ?? []) as Activity[]) {
      actRows.push({
        'Supplier Name': s.name,
        'Stage': STAGE_LABELS[a.stage],
        'Activity': a.activity_label,
        'Responsible Roles': (a.responsible_roles ?? []).map(r => ROLE_LABELS[r]).join(', '),
        'Accountable Roles': (a.accountable_roles ?? []).map(r => ROLE_LABELS[r]).join(', '),
        'Consulted Roles': (a.consulted_roles ?? []).map(r => ROLE_LABELS[r]).join(', '),
        'Requires Dual Approval': a.requires_dual_approval ? 'Yes' : 'No',
        'Is Gate Activity': a.is_gate ? 'Yes' : 'No',
        'Status': a.is_complete ? 'Complete' : 'Pending',
        'Completed By': a.completed_by || '',
        'Completed By Role': a.completed_by_role ? ROLE_LABELS[a.completed_by_role] : '',
        'Completed At': a.completed_at ? formatDateTime(a.completed_at) : '',
      });
    }
  }
  const wsActs = XLSX.utils.json_to_sheet(actRows);
  autoWidth(wsActs);
  XLSX.utils.book_append_sheet(wb, wsActs, 'RASIC Activities');

  // ── Sheet 3: Dual Approvals ───────────────────────────────────────────────────
  const approvalRows: Record<string, string>[] = [];
  for (const s of suppliers) {
    const activities = (s.activities ?? []) as Activity[];
    const approvals = (s.approvals ?? []) as ActivityApproval[];
    for (const a of activities.filter(x => x.requires_dual_approval)) {
      const pmApproval   = approvals.find(ap => ap.activity_id === a.id && ap.role === 'pm');
      const buyerApproval = approvals.find(ap => ap.activity_id === a.id && ap.role === 'buyer');
      approvalRows.push({
        'Supplier Name': s.name,
        'Stage': STAGE_LABELS[a.stage],
        'Activity': a.activity_label,
        'Overall Status': a.is_complete ? 'Approved' : 'Pending',
        'PM Status': pmApproval?.approved === true ? 'Approved' : pmApproval?.approved === false ? 'Rejected' : 'Pending',
        'PM Approved By': pmApproval?.approved_by_name || '',
        'PM Date': pmApproval?.created_at ? formatDateTime(pmApproval.created_at) : '',
        'PM Rejection Note': pmApproval?.rejection_note || '',
        'Buyer Status': buyerApproval?.approved === true ? 'Approved' : buyerApproval?.approved === false ? 'Rejected' : 'Pending',
        'Buyer Approved By': buyerApproval?.approved_by_name || '',
        'Buyer Date': buyerApproval?.created_at ? formatDateTime(buyerApproval.created_at) : '',
        'Buyer Rejection Note': buyerApproval?.rejection_note || '',
      });
    }
  }
  const wsApprovals = XLSX.utils.json_to_sheet(approvalRows);
  autoWidth(wsApprovals);
  XLSX.utils.book_append_sheet(wb, wsApprovals, 'Dual Approvals');

  // ── Sheet 4: Consultations ────────────────────────────────────────────────────
  const consultRows: Record<string, string>[] = [];
  for (const s of suppliers) {
    const activities = (s.activities ?? []) as Activity[];
    const consultations = (s.consultations ?? []) as ActivityConsultation[];
    for (const c of consultations) {
      const act = activities.find(a => a.id === c.activity_id);
      consultRows.push({
        'Supplier Name': s.name,
        'Stage': act ? STAGE_LABELS[act.stage] : '',
        'Activity': act?.activity_label || '',
        'Consultant Role': ROLE_LABELS[c.role],
        'Consultant Name': c.consultant_name,
        'Input': c.input_text,
        'Submitted At': formatDateTime(c.submitted_at),
      });
    }
  }
  const wsConsult = XLSX.utils.json_to_sheet(consultRows.length ? consultRows : [{ Note: 'No consultation records' }]);
  autoWidth(wsConsult);
  XLSX.utils.book_append_sheet(wb, wsConsult, 'Consultations');

  // ── Sheet 5: Timeline ─────────────────────────────────────────────────────────
  const timelineRows: Record<string, string>[] = [];
  for (const s of suppliers) {
    for (const t of (s.timeline ?? [])) {
      timelineRows.push({
        'Supplier Name': s.name,
        'Event Type': t.event_type,
        'From Stage': t.from_stage ? STAGE_LABELS[t.from_stage] : '',
        'To Stage': t.to_stage ? STAGE_LABELS[t.to_stage] : '',
        'Description': t.description,
        'Performed By Role': ROLE_LABELS[t.performed_by_role],
        'Performed By': t.performed_by_name,
        'Date': formatDateTime(t.created_at),
      });
    }
  }
  const wsTimeline = XLSX.utils.json_to_sheet(timelineRows.length ? timelineRows : [{ Note: 'No timeline entries' }]);
  autoWidth(wsTimeline);
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Timeline');

  // ── Sheet 6: Blacklist Registry ───────────────────────────────────────────────
  const blacklistRows = suppliers
    .filter(s => s.current_stage === 'blacklisted')
    .map(s => ({
      'Supplier Name': s.name,
      'Country': s.country,
      'Component Category': s.component_category,
      'Programs': s.programs.join(', '),
      'Blacklist Reason': s.blacklist_reason,
      'Blacklisted By': s.blacklisted_by,
      'Blacklisted At': s.blacklisted_at ? formatDateTime(s.blacklisted_at) : '',
      'Stage at Blacklisting': (() => {
        const entry = (s.timeline ?? []).find(t => t.event_type === 'blacklisted');
        return entry?.from_stage ? STAGE_LABELS[entry.from_stage] : '';
      })(),
      'DUNS Number': s.duns_number,
      'Legal Entity': s.legal_entity,
    }));
  const wsBlacklist = XLSX.utils.json_to_sheet(blacklistRows.length ? blacklistRows : [{ Note: 'No blacklisted suppliers' }]);
  autoWidth(wsBlacklist);
  XLSX.utils.book_append_sheet(wb, wsBlacklist, 'Blacklist Registry');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `SSD_Pipeline_Report_${date}.xlsx`);
}

export function exportEventsReport(events: ScoutingEvent[], suppliers: Supplier[]) {
  const wb = XLSX.utils.book_new();

  const eventRows = events.map(e => {
    const eventSuppliers = suppliers.filter(s => e.supplier_ids?.includes(s.id));
    return {
      'Event Name': e.name,
      'Date': e.event_date,
      'Location': e.location,
      'Organizer': e.organizer,
      'Supplier Count': eventSuppliers.length,
      'Supplier Names': eventSuppliers.map(s => s.name).join('; '),
      'Preliminary List': e.preliminary_list_complete ? 'Complete' : 'Pending',
      'B2B Agenda': e.b2b_agenda_complete ? 'Complete' : 'Pending',
      'Layout File': e.layout_file_complete ? 'Complete' : 'Pending',
      'Created At': formatDateTime(e.created_at),
    };
  });

  const wsEvents = XLSX.utils.json_to_sheet(eventRows.length ? eventRows : [{ Note: 'No events' }]);
  autoWidth(wsEvents);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Scouting Events');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `SSD_Events_Report_${date}.xlsx`);
}

export function exportSingleSupplier(supplier: Supplier) {
  const wb = XLSX.utils.book_new();

  // Overview
  const overview = [{
    Field: 'Name', Value: supplier.name,
  }, { Field: 'Legal Entity', Value: supplier.legal_entity },
  { Field: 'Country', Value: supplier.country },
  { Field: 'Facility', Value: supplier.facility_location },
  { Field: 'Component', Value: supplier.component_category },
  { Field: 'Programs', Value: supplier.programs.join(', ') },
  { Field: 'DUNS', Value: supplier.duns_number },
  { Field: 'DUNS Validated', Value: supplier.duns_validated ? 'Yes' : 'No' },
  { Field: 'Current Stage', Value: STAGE_LABELS[supplier.current_stage] },
  { Field: 'Days in Stage', Value: String(daysSince(supplier.stage_entered_at)) },
  { Field: 'Assigned SSD', Value: supplier.assigned_ssd_member },
  { Field: 'ELM Score', Value: supplier.elm_score || '—' },
  { Field: 'Contact Name', Value: supplier.contact_name },
  { Field: 'Contact Email', Value: supplier.contact_email },
  { Field: 'Contact Phone', Value: supplier.contact_phone },
  ];
  const wsOverview = XLSX.utils.json_to_sheet(overview);
  autoWidth(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // Activities
  const actRows = (supplier.activities ?? []).map((a: Activity) => ({
    Stage: STAGE_LABELS[a.stage],
    Activity: a.activity_label,
    Status: a.is_complete ? 'Complete' : 'Pending',
    'Completed By': a.completed_by || '',
    'Completed At': a.completed_at ? formatDateTime(a.completed_at) : '',
    Gate: a.is_gate ? 'Yes' : 'No',
    'Dual Approval': a.requires_dual_approval ? 'Yes' : 'No',
  }));
  const wsActs = XLSX.utils.json_to_sheet(actRows.length ? actRows : [{ Note: 'No activities' }]);
  autoWidth(wsActs);
  XLSX.utils.book_append_sheet(wb, wsActs, 'Activities');

  // Timeline
  const tlRows = (supplier.timeline ?? []).map(t => ({
    Date: formatDateTime(t.created_at),
    'Event Type': t.event_type,
    'From Stage': t.from_stage ? STAGE_LABELS[t.from_stage] : '',
    'To Stage': t.to_stage ? STAGE_LABELS[t.to_stage] : '',
    Description: t.description,
    Role: ROLE_LABELS[t.performed_by_role],
    'Performed By': t.performed_by_name,
  }));
  const wsTimeline = XLSX.utils.json_to_sheet(tlRows.length ? tlRows : [{ Note: 'No timeline entries' }]);
  autoWidth(wsTimeline);
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Timeline');

  const safeName = supplier.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `SSD_Supplier_${safeName}_${date}.xlsx`);
}
