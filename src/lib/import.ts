import * as XLSX from 'xlsx';
import { PipelineStage, UserRole, STAGE_LABELS, STAGE_ACTIVITIES } from '../types';
import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedSupplier {
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
  blacklist_reason: string;
  blacklisted_by: string;
}

export interface ImportRow {
  rowNum: number;
  raw: Record<string, string>;
  parsed: ParsedSupplier | null;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
  warningCount: number;
  sheetName: string;
}

export type ImportMode = 'add_new' | 'upsert' | 'replace_all';

// ─── Stage mapping (fuzzy) ────────────────────────────────────────────────────

const STAGE_ALIASES: Record<string, PipelineStage> = {
  'new supplier identified':   'new_supplier_identified',
  'new_supplier_identified':   'new_supplier_identified',
  'new supplier':              'new_supplier_identified',
  'identified':                'new_supplier_identified',
  'scouting event prep':       'scouting_event_prep',
  'scouting_event_prep':       'scouting_event_prep',
  'scouting event preparation':'scouting_event_prep',
  'scouting event':            'scouting_event_prep',
  'scouting':                  'scouting_event_prep',
  'b2b evaluation':            'b2b_evaluation',
  'b2b_evaluation':            'b2b_evaluation',
  'b2b':                       'b2b_evaluation',
  'b2b eval':                  'b2b_evaluation',
  'parking lot':               'parking_lot',
  'parking_lot':               'parking_lot',
  'parking':                   'parking_lot',
  'preliminary evaluation':    'preliminary_evaluation',
  'preliminary_evaluation':    'preliminary_evaluation',
  'preliminary eval':          'preliminary_evaluation',
  'prelim evaluation':         'preliminary_evaluation',
  'prelim eval':               'preliminary_evaluation',
  'preliminary':               'preliminary_evaluation',
  'rfq':                       'rfq',
  'request for quotation':     'rfq',
  'investigation record':      'investigation_record',
  'investigation_record':      'investigation_record',
  'investigation':             'investigation_record',
  'blacklisted':               'blacklisted',
  'blacklist':                 'blacklisted',
};

function parseStage(raw: string): PipelineStage | null {
  const key = raw.trim().toLowerCase();
  return STAGE_ALIASES[key] ?? null;
}

// ─── Column name normalisation (fuzzy header matching) ────────────────────────

const HEADER_MAP: Record<string, keyof ParsedSupplier> = {
  'supplier name':         'name',
  'supplier':              'name',
  'name':                  'name',
  'company name':          'name',
  'company':               'name',
  'duns number':           'duns_number',
  'duns':                  'duns_number',
  'duns_number':           'duns_number',
  'd-u-n-s':               'duns_number',
  'duns validated':        'duns_validated',
  'duns_validated':        'duns_validated',
  'validated':             'duns_validated',
  'legal entity':          'legal_entity',
  'legal_entity':          'legal_entity',
  'legal name':            'legal_entity',
  'facility location':     'facility_location',
  'facility_location':     'facility_location',
  'facility':              'facility_location',
  'location':              'facility_location',
  'address':               'facility_location',
  'country':               'country',
  'nation':                'country',
  'component category':    'component_category',
  'component_category':    'component_category',
  'component':             'component_category',
  'category':              'component_category',
  'part category':         'component_category',
  'programs':              'programs',
  'program':               'programs',
  'vehicle programs':      'programs',
  'contact name':          'contact_name',
  'contact_name':          'contact_name',
  'contact':               'contact_name',
  'contact person':        'contact_name',
  'contact email':         'contact_email',
  'contact_email':         'contact_email',
  'email':                 'contact_email',
  'e-mail':                'contact_email',
  'contact phone':         'contact_phone',
  'contact_phone':         'contact_phone',
  'phone':                 'contact_phone',
  'telephone':             'contact_phone',
  'mobile':                'contact_phone',
  'current stage':         'current_stage',
  'current_stage':         'current_stage',
  'stage':                 'current_stage',
  'pipeline stage':        'current_stage',
  'status':                'current_stage',
  'assigned ssd member':   'assigned_ssd_member',
  'assigned_ssd_member':   'assigned_ssd_member',
  'ssd member':            'assigned_ssd_member',
  'assigned to':           'assigned_ssd_member',
  'owner':                 'assigned_ssd_member',
  'elm score':             'elm_score',
  'elm_score':             'elm_score',
  'elm':                   'elm_score',
  'score':                 'elm_score',
  'blacklist reason':      'blacklist_reason',
  'blacklist_reason':      'blacklist_reason',
  'reason':                'blacklist_reason',
  'blacklisted by':        'blacklisted_by',
  'blacklisted_by':        'blacklisted_by',
  'commodity':             'commodity',
  'commodity type':        'commodity',
  'commodity family':      'commodity',
  'commodity group':       'commodity',
  'commodity subcategory': 'commodity_subcategory',
  'commodity_subcategory': 'commodity_subcategory',
  'subcategory':           'commodity_subcategory',
  'sub category':          'commodity_subcategory',
};

function normaliseHeader(h: string): keyof ParsedSupplier | null {
  return HEADER_MAP[h.trim().toLowerCase()] ?? null;
}

function parseBool(v: string): boolean {
  return ['yes', 'true', '1', 'y', 'validated', 'confirmed'].includes(v.trim().toLowerCase());
}

function parsePrograms(v: string): string[] {
  if (!v) return [];
  return v.split(/[,;|\/]/).map(p => p.trim()).filter(Boolean);
}

// ─── Row parser ───────────────────────────────────────────────────────────────

function parseRow(raw: Record<string, string>, rowNum: number): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Map columns
  const mapped: Partial<Record<keyof ParsedSupplier, string>> = {};
  for (const [col, val] of Object.entries(raw)) {
    const field = normaliseHeader(col);
    if (field && val !== undefined && val !== null) {
      mapped[field] = String(val).trim();
    }
  }

  // Required: name
  if (!mapped.name) {
    errors.push('Missing supplier name (required)');
  }

  // Required: country
  if (!mapped.country) {
    warnings.push('Country is empty — will default to unknown');
  }

  // Required: component_category
  if (!mapped.component_category) {
    warnings.push('Component category is empty');
  }

  // Stage validation
  let stage: PipelineStage = 'new_supplier_identified';
  if (mapped.current_stage) {
    const parsed = parseStage(mapped.current_stage);
    if (parsed) {
      stage = parsed;
    } else {
      warnings.push(`Unknown stage "${mapped.current_stage}" — defaulting to "New Supplier Identified"`);
    }
  }

  // Email format (soft warning)
  if (mapped.contact_email && !mapped.contact_email.includes('@')) {
    warnings.push(`Contact email "${mapped.contact_email}" looks invalid`);
  }

  // Blacklist sanity check
  if (stage === 'blacklisted' && (!mapped.blacklist_reason || mapped.blacklist_reason.length < 20)) {
    warnings.push('Blacklisted supplier has no reason or reason is too short (< 20 chars) — will be imported as-is');
  }

  if (errors.length > 0) {
    return { rowNum, raw, parsed: null, errors, warnings };
  }

  const parsed: ParsedSupplier = {
    name: mapped.name!,
    duns_number:            mapped.duns_number ?? '',
    duns_validated:         parseBool(mapped.duns_validated ?? ''),
    legal_entity:           mapped.legal_entity ?? mapped.name ?? '',
    facility_location:      mapped.facility_location ?? '',
    country:                mapped.country ?? '',
    commodity:              mapped.commodity ?? '',
    commodity_subcategory:  mapped.commodity_subcategory ?? '',
    component_category:     mapped.component_category ?? '',
    programs:           parsePrograms(mapped.programs ?? ''),
    contact_name:       mapped.contact_name ?? '',
    contact_email:      mapped.contact_email ?? '',
    contact_phone:      mapped.contact_phone ?? '',
    current_stage:      stage,
    assigned_ssd_member: mapped.assigned_ssd_member ?? '',
    elm_score:          mapped.elm_score ?? '',
    blacklist_reason:   mapped.blacklist_reason ?? '',
    blacklisted_by:     mapped.blacklisted_by ?? '',
  };

  return { rowNum, raw, parsed, errors, warnings };
}

// ─── Sheet parser ─────────────────────────────────────────────────────────────

export function parseXlsFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });

        // Find the best sheet — prefer "Pipeline Overview", "Suppliers", else first
        const preferred = ['pipeline overview', 'suppliers', 'supplier list', 'sheet1'];
        let sheetName = wb.SheetNames[0];
        for (const name of wb.SheetNames) {
          if (preferred.includes(name.toLowerCase())) { sheetName = name; break; }
        }

        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: false,
        });

        if (!rawRows.length) {
          resolve({ rows: [], validCount: 0, errorCount: 0, warningCount: 0, sheetName });
          return;
        }

        const rows: ImportRow[] = [];
        for (let i = 0; i < rawRows.length; i++) {
          const raw = Object.fromEntries(
            Object.entries(rawRows[i]).map(([k, v]) => [k, String(v ?? '').trim()])
          );
          // Skip entirely empty rows
          if (Object.values(raw).every(v => !v)) continue;
          rows.push(parseRow(raw, i + 2));
        }

        resolve({
          rows,
          validCount: rows.filter(r => !r.errors.length).length,
          errorCount: rows.filter(r => r.errors.length > 0).length,
          warningCount: rows.filter(r => r.warnings.length > 0 && !r.errors.length).length,
          sheetName,
        });
      } catch (err) {
        reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.readAsBinaryString(file);
  });
}

// ─── Database import ──────────────────────────────────────────────────────────

export interface ImportProgress {
  current: number;
  total: number;
  currentName: string;
  errors: string[];
}

export async function importToDatabase(
  rows: ImportRow[],
  mode: ImportMode,
  onProgress: (p: ImportProgress) => void,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const validRows = rows.filter(r => r.parsed && !r.errors.length);
  const importErrors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (mode === 'replace_all') {
    // Truncate via delete (safer than TRUNCATE — respects FK cascades)
    const { error } = await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      return { imported: 0, skipped: 0, errors: [`Failed to clear existing data: ${error.message}`] };
    }
  }

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const p = row.parsed!;

    onProgress({ current: i + 1, total: validRows.length, currentName: p.name, errors: importErrors });

    try {
      const supplierData = {
        name:                  p.name,
        duns_number:           p.duns_number,
        duns_validated:        p.duns_validated,
        legal_entity:          p.legal_entity || p.name,
        facility_location:     p.facility_location,
        country:               p.country,
        commodity:             p.commodity,
        commodity_subcategory: p.commodity_subcategory,
        component_category:    p.component_category,
        programs:           p.programs,
        contact_name:       p.contact_name,
        contact_email:      p.contact_email,
        contact_phone:      p.contact_phone,
        current_stage:      p.current_stage,
        assigned_ssd_member: p.assigned_ssd_member,
        elm_score:          p.elm_score,
        blacklist_reason:   p.blacklist_reason,
        blacklisted_by:     p.blacklisted_by,
        blacklisted_at:     p.current_stage === 'blacklisted' && p.blacklisted_by ? new Date().toISOString() : null,
        stage_entered_at:   new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      };

      let supplierId: string | null = null;

      if (mode === 'add_new') {
        const { data, error } = await supabase.from('suppliers').insert(supplierData).select('id').maybeSingle();
        if (error) { importErrors.push(`Row ${row.rowNum} (${p.name}): ${error.message}`); skipped++; continue; }
        supplierId = data?.id ?? null;
      } else {
        // upsert or replace_all: check by name
        const { data: existing } = await supabase.from('suppliers').select('id').eq('name', p.name).maybeSingle();
        if (existing?.id) {
          const { error } = await supabase.from('suppliers').update(supplierData).eq('id', existing.id);
          if (error) { importErrors.push(`Row ${row.rowNum} (${p.name}): ${error.message}`); skipped++; continue; }
          supplierId = existing.id;
        } else {
          const { data, error } = await supabase.from('suppliers').insert(supplierData).select('id').maybeSingle();
          if (error) { importErrors.push(`Row ${row.rowNum} (${p.name}): ${error.message}`); skipped++; continue; }
          supplierId = data?.id ?? null;
        }
      }

      // Seed activities for the current stage
      if (supplierId && p.current_stage !== 'new_supplier_identified' && p.current_stage !== 'blacklisted') {
        const defs = STAGE_ACTIVITIES[p.current_stage];
        if (defs.length) {
          const actRows = defs.map((d, idx) => ({
            supplier_id: supplierId,
            stage: p.current_stage,
            activity_key: d.key,
            activity_label: d.label,
            responsible_roles: d.responsible_roles,
            accountable_roles: d.accountable_roles,
            support_roles: d.support_roles,
            consulted_roles: d.consulted_roles,
            informed_roles: d.informed_roles,
            requires_dual_approval: d.requires_dual_approval,
            requires_consultation: d.requires_consultation,
            is_gate: d.is_gate,
            sort_order: idx,
          }));
          await supabase.from('supplier_activities').upsert(actRows, { onConflict: 'supplier_id,activity_key' });
        }
      }

      // Add initial timeline entry
      if (supplierId) {
        await supabase.from('supplier_timeline').insert({
          supplier_id: supplierId,
          event_type: 'import',
          to_stage: p.current_stage,
          description: `Imported from XLS — stage: ${STAGE_LABELS[p.current_stage]}`,
          performed_by_role: 'ssd' as const,
          performed_by_name: 'XLS Import',
        });
      }

      imported++;
    } catch (err) {
      importErrors.push(`Row ${row.rowNum} (${p.name}): Unexpected error — ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  return { imported, skipped, errors: importErrors };
}

// ─── Template generator ───────────────────────────────────────────────────────

export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Supplier Name', 'Country', 'Commodity', 'Commodity Subcategory',
    'Component Category', 'Programs', 'Current Stage', 'Assigned SSD Member',
    'DUNS Number', 'DUNS Validated', 'Legal Entity', 'Facility Location',
    'Contact Name', 'Contact Email', 'Contact Phone', 'ELM Score',
    'Blacklist Reason', 'Blacklisted By',
  ];

  const examples = [
    ['Nexteer Automotive GmbH', 'Germany', 'Electronics', 'EPS Motors', 'Electric Power Steering (EPS) Motors', 'ALFA EVO, DS7 Facelift', 'Scouting Event Prep', 'Marie Leclerc', '30-211-4985', 'No', 'Nexteer Automotive GmbH', 'Nuremberg, Germany', 'Klaus Bauer', 'k.bauer@nexteer.com', '+49 911 555 0102', '', '', ''],
    ['ZF Friedrichshafen AG', 'Germany', 'Cage', 'Suspension Links', 'Ball Joints & Suspension Links', 'DS7 Facelift', 'B2B Evaluation', 'Thomas Müller', '33-180-5562', 'Yes', 'ZF Friedrichshafen AG', 'Friedrichshafen, Germany', 'Hans Werner', 'h.werner@zf.com', '+49 7541 77-0', '85/100', '', ''],
    ['Plastimec Solutions', 'France', 'Plastics', 'Instrument Panel', 'Injection Moulded Interior Components', 'C5X Successor', 'Parking Lot', 'Sophie Renard', '42-881-2234', 'No', 'Plastimec Solutions SARL', 'Lyon, France', 'Paul Durand', 'p.durand@plastimec.fr', '+33 4 72 88 12 00', '72/100', '', ''],
    ['Brose Welding GmbH', 'Germany', 'Welding', 'Seat Structures', 'Laser Welded Seat Frame Assemblies', 'ALFA EVO', 'Preliminary Evaluation', 'Marie Leclerc', '28-441-9977', 'No', 'Brose Fahrzeugteile GmbH', 'Coburg, Germany', 'Stefan Klein', 's.klein@brose.de', '+49 9561 21-0', '80/100', '', ''],
    ['Rassini Frenos S.A. de C.V.', 'Mexico', 'Cage', 'Brake Components', 'Brake Discs & Drums', 'ALFA EVO', 'Blacklisted', 'Anna Kowalski', '93-777-4412', 'No', 'Rassini Frenos S.A. de C.V.', 'San Martin Texmelucan, Mexico', 'Carlos Mendez', 'c.mendez@rassini.com', '+52 248 481 5100', '', 'Failed IATF 16949 certification audit. Non-conformities not remediated.', 'Commercial Team'],
  ];

  const wsData = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row (bold via column widths)
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
  ws['!cols'] = colWidths;

  // Add a notes sheet
  const notes = XLSX.utils.aoa_to_sheet([
    ['IMPORT TEMPLATE NOTES'],
    [],
    ['Column', 'Required', 'Accepted Values / Notes'],
    ['Supplier Name', 'YES', 'Any text — used as unique identifier in upsert mode'],
    ['Country', 'Recommended', 'Any country name'],
    ['Commodity', 'Recommended', 'Plastics | Cage | Electronics | Welding | Stamping | Casting | Forging | Raw Materials | Electrical Components | Fasteners | Other'],
    ['Commodity Subcategory', 'Optional', 'Free text sub-classification, e.g. "EPS Motors", "Seat Structures"'],
    ['Component Category', 'Recommended', 'Free text describing the component type'],
    ['Programs', 'Optional', 'Comma or semicolon separated: "ALFA EVO, DS7 Facelift"'],
    ['Current Stage', 'Optional', 'New Supplier Identified | Scouting Event Prep | B2B Evaluation | Parking Lot | Preliminary Evaluation | RFQ | Investigation Record | Blacklisted'],
    ['Assigned SSD Member', 'Optional', 'Full name of the SSD team member'],
    ['DUNS Number', 'Optional', 'D&B format: XX-XXX-XXXX'],
    ['DUNS Validated', 'Optional', 'Yes / No'],
    ['Legal Entity', 'Optional', 'Full legal name of the entity'],
    ['Facility Location', 'Optional', 'City, Country format recommended'],
    ['Contact Name', 'Optional', 'Primary contact full name'],
    ['Contact Email', 'Optional', 'Valid email address'],
    ['Contact Phone', 'Optional', 'Include country code'],
    ['ELM Score', 'Optional', 'e.g. 78/100 or 78'],
    ['Blacklist Reason', 'Required if blacklisted', 'Minimum 20 characters'],
    ['Blacklisted By', 'Required if blacklisted', 'Role or person name'],
  ]);
  notes['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 70 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers Import');
  XLSX.utils.book_append_sheet(wb, notes, 'Notes & Instructions');

  XLSX.writeFile(wb, 'SSD_Pipeline_Import_Template.xlsx');
}
