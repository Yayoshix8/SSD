/*
  # Seed Sample Data for SSD Pipeline

  Inserts 9 sample automotive suppliers at various pipeline stages,
  their documents, timeline entries, and 2 scouting events.
  Uses fixed UUIDs so this is idempotent.
*/

DO $$
DECLARE
  now_ts timestamptz := now();
  s1 uuid := 'a1000000-0000-0000-0000-000000000001';
  s2 uuid := 'a1000000-0000-0000-0000-000000000002';
  s3 uuid := 'a1000000-0000-0000-0000-000000000003';
  s4 uuid := 'a1000000-0000-0000-0000-000000000004';
  s5 uuid := 'a1000000-0000-0000-0000-000000000005';
  s6 uuid := 'a1000000-0000-0000-0000-000000000006';
  s7 uuid := 'a1000000-0000-0000-0000-000000000007';
  s8 uuid := 'a1000000-0000-0000-0000-000000000008';
  s9 uuid := 'a1000000-0000-0000-0000-000000000009';
BEGIN

-- =====================
-- SUPPLIERS
-- =====================
INSERT INTO suppliers (id, name, duns_number, duns_validated, legal_entity, facility_location, country, component_category, programs, contact_name, contact_email, contact_phone, current_stage, assigned_ssd_member, stage_entered_at, created_at, updated_at)
VALUES
  (s1, 'Nexteer Automotive GmbH',      '30-211-4985', false, 'Nexteer Automotive GmbH',         'Nuremberg, Germany',              'Germany', 'Electric Power Steering (EPS) Motors', ARRAY['ALFA EVO','DS7 Facelift'],           'Klaus Bauer',       'k.bauer@nexteer.com',       '+49 911 555 0102',  'new_supplier_identified', 'Marie Leclerc',  now_ts - interval '5 days',  now_ts - interval '10 days', now_ts),
  (s2, 'Jtekt Europe S.A.S.',          '40-872-1123', false, 'Jtekt Europe S.A.S.',             'Irigny, France',                  'France',  'Steering Columns',                     ARRAY['C5X Successor','ALFA EVO'],          'Sophie Martin',     's.martin@jtekt.eu',         '+33 4 72 30 55 00', 'scouting_event',          'Thomas Müller',  now_ts - interval '18 days', now_ts - interval '30 days', now_ts),
  (s3, 'ZF Friedrichshafen AG',        '33-180-5562', true,  'ZF Friedrichshafen AG',           'Friedrichshafen, Germany',        'Germany', 'Ball Joints & Suspension Links',       ARRAY['DS7 Facelift','C5X Successor'],      'Hans Werner',       'h.werner@zf.com',           '+49 7541 77-0',     'b2b_evaluation',          'Marie Leclerc',  now_ts - interval '22 days', now_ts - interval '40 days', now_ts),
  (s4, 'Mando Corporation',            '50-612-8834', false, 'Mando Corporation Europe',        'Wroclaw, Poland',                 'Poland',  'Brake Calipers',                       ARRAY['ALFA EVO'],                         'Park Ji-Won',       'j.park@mando.eu',           '+48 71 330 8800',   'parking_lot',             'Anna Kowalski',  now_ts - interval '12 days', now_ts - interval '50 days', now_ts),
  (s5, 'Tenneco Automotive',           '62-345-9901', false, 'Tenneco Automotive Europe BVBA',  'Ghent, Belgium',                  'Belgium', 'Shock Absorbers & Struts',             ARRAY['C5X Successor'],                    'Luc Vandenberghe',  'l.vanden@tenneco.com',      '+32 9 244 7800',    'parking_lot',             'Thomas Müller',  now_ts - interval '35 days', now_ts - interval '60 days', now_ts),
  (s6, 'Hirschvogel Automotive Group', '71-900-4453', true,  'Hirschvogel Umformtechnik GmbH',  'Denklingen, Germany',             'Germany', 'Forged Steering Knuckles',             ARRAY['DS7 Facelift','C5X Successor','ALFA EVO'], 'Werner Schreiber', 'w.schreiber@hirschvogel.de', '+49 8243 299-0', 'preliminary_evaluation',  'Marie Leclerc',  now_ts - interval '45 days', now_ts - interval '70 days', now_ts),
  (s7, 'Mubea Fahrwerksfedern GmbH',   '88-501-3321', true,  'Mubea Fahrwerksfedern GmbH',      'Attendorn, Germany',              'Germany', 'Stabilizer Bars & Coil Springs',       ARRAY['ALFA EVO'],                         'Ingrid Fischer',    'i.fischer@mubea.com',       '+49 2722 65-0',     'preliminary_evaluation',  'Anna Kowalski',  now_ts - interval '55 days', now_ts - interval '80 days', now_ts),
  (s8, 'Govoni S.p.A.',                '45-123-7789', true,  'Govoni S.p.A.',                   'Modena, Italy',                   'Italy',   'Tie Rod Ends & Rack Ends',             ARRAY['DS7 Facelift'],                     'Marco Rossi',       'm.rossi@govoni.it',         '+39 059 451 888',   'rfq',                     'Thomas Müller',  now_ts - interval '8 days',  now_ts - interval '90 days', now_ts),
  (s9, 'Rassini International',        '93-777-4412', false, 'Rassini Frenos S.A. de C.V.',     'San Martin Texmelucan, Mexico',   'Mexico',  'Brake Discs & Drums',                  ARRAY['ALFA EVO'],                         'Carlos Mendez',     'c.mendez@rassini.com',      '+52 248 481 5100',  'blacklisted',             'Anna Kowalski',  now_ts - interval '90 days', now_ts - interval '100 days', now_ts)
ON CONFLICT (id) DO NOTHING;

-- Set blacklist fields for Rassini
UPDATE suppliers SET
  blacklist_reason = 'Supplier failed to meet minimum quality standards (IATF 16949 not certified). Major non-conformities identified during on-site audit. Unable to remediate within agreed timeframe.',
  blacklisted_by = 'Commercial Team',
  blacklisted_at = now_ts - interval '10 days'
WHERE id = s9;

-- =====================
-- DOCUMENTS — Scouting stage
-- =====================
INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'scouting_event', 'scouting_supplier_dev_need', 'Supplier Development Need File',
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN now_ts - interval '30 days' ELSE NULL END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'scouting_event', 'scouting_master_requirement', 'Master Requirement File',
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN now_ts - interval '30 days' ELSE NULL END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'scouting_event', 'scouting_qr_internal', 'QR File (Internal)',
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN now_ts - interval '30 days' ELSE NULL END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'scouting_event', 'scouting_qr_external', 'QR File (External)',
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN now_ts - interval '30 days' ELSE NULL END,
  CASE WHEN current_stage IN ('b2b_evaluation','parking_lot','preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

-- =====================
-- DOCUMENTS — B2B stage
-- =====================
INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'b2b_evaluation', 'b2b_nda_signed', 'NDA Signed (Both Sides via DocuSign)',
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN now_ts - interval '20 days' ELSE NULL END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'b2b_evaluation', 'b2b_event_file', 'B2B Event File',
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN now_ts - interval '20 days' ELSE NULL END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
SELECT id, 'b2b_evaluation', 'b2b_agenda', 'B2B Agenda',
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN true ELSE false END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN now_ts - interval '20 days' ELSE NULL END,
  CASE WHEN current_stage IN ('preliminary_evaluation','rfq') THEN 'SSD Team' ELSE '' END
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s8,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

-- =====================
-- DOCUMENTS — Prelim Eval stage
-- =====================
INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
VALUES
  (s6, 'preliminary_evaluation', 'prelim_eval_file',            'Preliminary Evaluation File',      true,  now_ts - interval '10 days', 'SSD Team'),
  (s6, 'preliminary_evaluation', 'prelim_elm_score',            'ELM Score',                        false, NULL, ''),
  (s6, 'preliminary_evaluation', 'prelim_fundamental_deviation','Fundamental Deviation Notes',       false, NULL, ''),
  (s7, 'preliminary_evaluation', 'prelim_eval_file',            'Preliminary Evaluation File',      false, NULL, ''),
  (s7, 'preliminary_evaluation', 'prelim_elm_score',            'ELM Score',                        false, NULL, ''),
  (s7, 'preliminary_evaluation', 'prelim_fundamental_deviation','Fundamental Deviation Notes',       false, NULL, ''),
  (s8, 'preliminary_evaluation', 'prelim_eval_file',            'Preliminary Evaluation File',      true,  now_ts - interval '15 days', 'SSD Team'),
  (s8, 'preliminary_evaluation', 'prelim_elm_score',            'ELM Score',                        true,  now_ts - interval '12 days', 'SSD Team'),
  (s8, 'preliminary_evaluation', 'prelim_fundamental_deviation','Fundamental Deviation Notes',       true,  now_ts - interval '10 days', 'SSD Team')
ON CONFLICT (supplier_id, document_key) DO NOTHING;

-- =====================
-- DOCUMENTS — RFQ stage
-- =====================
INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete, completed_at, completed_by)
VALUES
  (s8, 'rfq', 'rfq_package',      'RFQ Package',                   true, now_ts - interval '5 days', 'Buyer'),
  (s8, 'rfq', 'rfq_part_numbers', 'Part Numbers + Programs Defined', true, now_ts - interval '5 days', 'Buyer')
ON CONFLICT (supplier_id, document_key) DO NOTHING;

-- Add placeholders for other suppliers
INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete)
SELECT id, 'preliminary_evaluation', 'prelim_eval_file', 'Preliminary Evaluation File', false
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete)
SELECT id, 'preliminary_evaluation', 'prelim_elm_score', 'ELM Score', false
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete)
SELECT id, 'preliminary_evaluation', 'prelim_fundamental_deviation', 'Fundamental Deviation Notes', false
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete)
SELECT id, 'rfq', 'rfq_package', 'RFQ Package', false
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

INSERT INTO supplier_documents (supplier_id, stage, document_key, document_label, is_complete)
SELECT id, 'rfq', 'rfq_part_numbers', 'Part Numbers + Programs Defined', false
FROM suppliers WHERE id IN (s1,s2,s3,s4,s5,s6,s7,s9)
ON CONFLICT (supplier_id, document_key) DO NOTHING;

-- =====================
-- TIMELINE
-- =====================
INSERT INTO supplier_timeline (supplier_id, event_type, from_stage, to_stage, description, performed_by_role, performed_by_name, created_at)
VALUES
  (s1, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Marie Leclerc',  now_ts - interval '10 days'),
  (s2, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Thomas Müller',  now_ts - interval '30 days'),
  (s2, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Thomas Müller',  now_ts - interval '18 days'),
  (s3, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Marie Leclerc',  now_ts - interval '40 days'),
  (s3, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Marie Leclerc',  now_ts - interval '35 days'),
  (s3, 'stage_change', 'scouting_event',          'b2b_evaluation',          'Advanced to B2B evaluation',                            'commercial_team', 'Marie Leclerc', now_ts - interval '22 days'),
  (s4, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Anna Kowalski',  now_ts - interval '50 days'),
  (s4, 'stage_change', 'new_supplier_identified', 'parking_lot',             'Moved to parking lot pending commercial review',        'commercial_team', 'Anna Kowalski', now_ts - interval '12 days'),
  (s5, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Thomas Müller',  now_ts - interval '60 days'),
  (s5, 'stage_change', 'new_supplier_identified', 'parking_lot',             'Moved to parking lot — capacity review ongoing',        'commercial_team', 'Thomas Müller', now_ts - interval '35 days'),
  (s6, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Marie Leclerc',  now_ts - interval '70 days'),
  (s6, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Marie Leclerc',  now_ts - interval '65 days'),
  (s6, 'stage_change', 'scouting_event',          'b2b_evaluation',          'Advanced to B2B evaluation',                            'commercial_team', 'Marie Leclerc', now_ts - interval '55 days'),
  (s6, 'stage_change', 'b2b_evaluation',          'preliminary_evaluation',  'NDA signed. Advanced to preliminary evaluation',        'commercial_team', 'Marie Leclerc', now_ts - interval '45 days'),
  (s7, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Anna Kowalski',  now_ts - interval '80 days'),
  (s7, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Anna Kowalski',  now_ts - interval '75 days'),
  (s7, 'stage_change', 'scouting_event',          'b2b_evaluation',          'Advanced to B2B evaluation',                            'commercial_team', 'Anna Kowalski', now_ts - interval '68 days'),
  (s7, 'stage_change', 'b2b_evaluation',          'preliminary_evaluation',  'NDA signed. Advanced to preliminary evaluation',        'commercial_team', 'Anna Kowalski', now_ts - interval '55 days'),
  (s8, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Thomas Müller',  now_ts - interval '90 days'),
  (s8, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Thomas Müller',  now_ts - interval '80 days'),
  (s8, 'stage_change', 'scouting_event',          'b2b_evaluation',          'Advanced to B2B evaluation',                            'commercial_team', 'Thomas Müller', now_ts - interval '60 days'),
  (s8, 'stage_change', 'b2b_evaluation',          'preliminary_evaluation',  'NDA signed. Advanced to preliminary evaluation',        'commercial_team', 'Thomas Müller', now_ts - interval '40 days'),
  (s8, 'stage_change', 'preliminary_evaluation',  'rfq',                     'Prelim evaluation passed. DUNS validated. Advanced to RFQ', 'buyer', 'Thomas Müller', now_ts - interval '8 days'),
  (s9, 'stage_change', NULL,                      'new_supplier_identified', 'Supplier added to pipeline',                            'ssd_team', 'Anna Kowalski',  now_ts - interval '100 days'),
  (s9, 'stage_change', 'new_supplier_identified', 'scouting_event',          'Advanced to scouting event',                            'ssd_team', 'Anna Kowalski',  now_ts - interval '90 days'),
  (s9, 'stage_change', 'scouting_event',          'b2b_evaluation',          'Advanced to B2B evaluation',                            'commercial_team', 'Anna Kowalski', now_ts - interval '70 days'),
  (s9, 'blacklisted',  'b2b_evaluation',          'blacklisted',             'Blacklisted. Reason: Supplier failed to meet minimum quality standards (IATF 16949 not certified). Major non-conformities identified during on-site audit. Unable to remediate within agreed timeframe.', 'commercial_team', 'Commercial Team', now_ts - interval '10 days');

-- =====================
-- SCOUTING EVENTS
-- =====================
INSERT INTO scouting_events (name, event_date, location, organizer, supplier_ids, preliminary_supplier_list_complete, b2b_agenda_complete, layout_file_complete)
VALUES
  ('Paris Automotive Summit 2026', '2026-06-15', 'Paris, France',   'Thomas Müller', ARRAY[]::uuid[], true,  false, false),
  ('Munich Supplier Day Q2 2026',  '2026-07-22', 'Munich, Germany', 'Marie Leclerc', ARRAY[]::uuid[], true,  true,  true)
ON CONFLICT DO NOTHING;

END $$;
