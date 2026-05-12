/*
  # Seed RASIC Sample Data — fixed enum values
*/
DO $$
DECLARE
  now_ts  timestamptz := now();
  s1 uuid := 'b1000000-0000-0000-0000-000000000001';
  s2 uuid := 'b1000000-0000-0000-0000-000000000002';
  s3 uuid := 'b1000000-0000-0000-0000-000000000003';
  s4 uuid := 'b1000000-0000-0000-0000-000000000004';
  s5 uuid := 'b1000000-0000-0000-0000-000000000005';
  s6 uuid := 'b1000000-0000-0000-0000-000000000006';
  s7 uuid := 'b1000000-0000-0000-0000-000000000007';
  s8 uuid := 'b1000000-0000-0000-0000-000000000008';
  a_pl4_decision uuid := 'c1000000-0000-0000-0000-000000000102';
  a_pl5_decision uuid := 'c1000000-0000-0000-0000-000000000103';
  a_pe6_advance  uuid := 'c1000000-0000-0000-0000-000000000104';
BEGIN

-- SUPPLIERS
INSERT INTO suppliers (id,name,duns_number,duns_validated,legal_entity,facility_location,country,component_category,programs,contact_name,contact_email,contact_phone,current_stage,assigned_ssd_member,elm_score,stage_entered_at,created_at,updated_at)
VALUES
  (s1,'Nexteer Automotive Poland Sp. z o.o.','31-445-7821',false,'Nexteer Automotive Poland Sp. z o.o.','Tychy, Poland','Poland','Electric Power Steering (EPS) Motors',ARRAY['ALFA EVO','DS Successor'],'Marek Nowak','m.nowak@nexteer.com','+48 32 217 9900','scouting_event_prep','Marie Leclerc','',now_ts-'8 days'::interval,now_ts-'8 days'::interval,now_ts),
  (s2,'Jtekt Europe S.A.S.','40-872-1123',false,'Jtekt Europe S.A.S.','Irigny, France','France','Steering Columns',ARRAY['C5X Successor'],'Sophie Martin','s.martin@jtekt.eu','+33 4 72 30 55 00','scouting_event_prep','Thomas Müller','',now_ts-'5 days'::interval,now_ts-'5 days'::interval,now_ts),
  (s3,'ZF Friedrichshafen AG','33-180-5562',false,'ZF Friedrichshafen AG','Friedrichshafen, Germany','Germany','Ball Joints & Suspension Links',ARRAY['DS7 Facelift','C5X Successor'],'Hans Werner','h.werner@zf.com','+49 7541 77-0','b2b_evaluation','Marie Leclerc','',now_ts-'14 days'::interval,now_ts-'35 days'::interval,now_ts),
  (s4,'GKN Driveline Italia S.r.l.','55-201-9934',false,'GKN Driveline Italia S.r.l.','Brunico, Italy','Italy','Intermediate Shafts & CV Joints',ARRAY['ALFA EVO'],'Luca Romano','l.romano@gkn.com','+39 0474 57 0100','parking_lot','Anna Kowalski','',now_ts-'28 days'::interval,now_ts-'55 days'::interval,now_ts),
  (s5,'Tenneco Automotive Europe BVBA','62-345-9901',false,'Tenneco Automotive Europe BVBA','Ghent, Belgium','Belgium','Tie Rod Ends & Rack Ends',ARRAY['C5X Successor'],'Luc Vandenberghe','l.vanden@tenneco.com','+32 9 244 7800','parking_lot','Thomas Müller','',now_ts-'33 days'::interval,now_ts-'65 days'::interval,now_ts),
  (s6,'Hirschvogel Umformtechnik GmbH','71-900-4453',true,'Hirschvogel Umformtechnik GmbH','Denklingen, Germany','Germany','Forged Steering Knuckles',ARRAY['DS7 Facelift','C5X Successor','ALFA EVO'],'Werner Schreiber','w.schreiber@hirschvogel.de','+49 8243 299-0','preliminary_evaluation','Marie Leclerc','78/100',now_ts-'45 days'::interval,now_ts-'90 days'::interval,now_ts),
  (s7,'Govoni S.p.A.','45-123-7789',true,'Govoni S.p.A.','Modena, Italy','Italy','Tie Rod Ends & Rack Ends',ARRAY['DS7 Facelift'],'Marco Rossi','m.rossi@govoni.it','+39 059 451 888','rfq','Thomas Müller','85/100',now_ts-'6 days'::interval,now_ts-'100 days'::interval,now_ts),
  (s8,'Rassini Frenos S.A. de C.V.','93-777-4412',false,'Rassini Frenos S.A. de C.V.','San Martin Texmelucan, Mexico','Mexico','Brake Discs & Drums',ARRAY['ALFA EVO'],'Carlos Mendez','c.mendez@rassini.com','+52 248 481 5100','blacklisted','Anna Kowalski','',now_ts-'5 days'::interval,now_ts-'110 days'::interval,now_ts)
ON CONFLICT (id) DO NOTHING;

UPDATE suppliers SET blacklist_reason='Supplier failed IATF 16949 certification audit. Critical non-conformities in process control and measurement systems. Remediation plan rejected by SQD team after two review cycles.',blacklisted_by='PM - F. Bernard',blacklisted_at=now_ts-'5 days'::interval WHERE id=s8;

-- ACTIVITIES: S1
INSERT INTO supplier_activities (supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,completed_at,completed_by,completed_by_role,sort_order)
VALUES
  (s1,'scouting_event_prep','scout_dev_need','Supplier Development Need defined',ARRAY['buyer']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','sqd']::user_role[],false,false,false,true,now_ts-'7 days'::interval,'Buyer - J. Dupont','buyer',0),
  (s1,'scouting_event_prep','scout_master_req','Master Requirement List complete',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['sqd']::user_role[],ARRAY['buyer']::user_role[],false,true,false,true,now_ts-'6 days'::interval,'SSD - Marie Leclerc','ssd',1),
  (s1,'scouting_event_prep','scout_event_plan','Sourcing event plan prepared',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY['buyer']::user_role[],ARRAY['sqd']::user_role[],ARRAY[]::user_role[],false,true,false,false,NULL,'',NULL,2),
  (s1,'scouting_event_prep','scout_qr_ready','QR code and form link ready',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,false,NULL,'',NULL,3),
  (s1,'scouting_event_prep','scout_layout','Event layout requested',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,false,NULL,'',NULL,4),
  (s1,'scouting_event_prep','scout_prelim_list','Preliminary supplier list created',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['buyer']::user_role[],false,false,false,false,NULL,'',NULL,5),
  (s1,'scouting_event_prep','scout_sqd_consult','SQD consultation recorded before proceeding',ARRAY['sqd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','pm']::user_role[],false,true,true,false,NULL,'',NULL,6)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

-- ACTIVITIES: S2
INSERT INTO supplier_activities (supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,sort_order)
VALUES
  (s2,'scouting_event_prep','scout_dev_need','Supplier Development Need defined',ARRAY['buyer']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','sqd']::user_role[],false,false,false,true,0),
  (s2,'scouting_event_prep','scout_master_req','Master Requirement List complete',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['sqd']::user_role[],ARRAY['buyer']::user_role[],false,true,false,false,1),
  (s2,'scouting_event_prep','scout_event_plan','Sourcing event plan prepared',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY['buyer']::user_role[],ARRAY['sqd']::user_role[],ARRAY[]::user_role[],false,true,false,false,2),
  (s2,'scouting_event_prep','scout_qr_ready','QR code and form link ready',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,false,3),
  (s2,'scouting_event_prep','scout_layout','Event layout requested',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,false,4),
  (s2,'scouting_event_prep','scout_prelim_list','Preliminary supplier list created',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['buyer']::user_role[],false,false,false,false,5),
  (s2,'scouting_event_prep','scout_sqd_consult','SQD consultation recorded before proceeding',ARRAY['sqd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','pm']::user_role[],false,true,true,false,6)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;
UPDATE supplier_activities SET is_complete=true,completed_at=now_ts-'4 days'::interval,completed_by='Buyer - J. Dupont',completed_by_role='buyer' WHERE supplier_id=s2 AND activity_key='scout_dev_need';

-- ACTIVITIES: S3
INSERT INTO supplier_activities (supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,completed_at,completed_by,completed_by_role,sort_order)
VALUES
  (s3,'b2b_evaluation','b2b_event_executed','Scouting event executed',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY['sqd']::user_role[],false,false,false,true,now_ts-'12 days'::interval,'SSD - Marie Leclerc','ssd',0),
  (s3,'b2b_evaluation','b2b_info_collected','Supplier information collected',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,true,now_ts-'11 days'::interval,'SSD - Marie Leclerc','ssd',1),
  (s3,'b2b_evaluation','b2b_agenda_created','Event agenda created',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY['buyer']::user_role[],ARRAY['sqd']::user_role[],ARRAY[]::user_role[],false,true,false,true,now_ts-'10 days'::interval,'SSD - Marie Leclerc','ssd',2),
  (s3,'b2b_evaluation','b2b_nda_signed','NDA signed — both sides',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY['sqd']::user_role[],false,false,true,false,NULL,'',NULL,3),
  (s3,'b2b_evaluation','b2b_meeting_coord','B2B meeting coordinated',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,true,now_ts-'9 days'::interval,'SSD - Marie Leclerc','ssd',4),
  (s3,'b2b_evaluation','b2b_prelim_reviewed','Preliminary supplier list reviewed',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['buyer']::user_role[],false,false,false,false,NULL,'',NULL,5),
  (s3,'b2b_evaluation','b2b_eligibility','B2B eligibility decision: PM + Buyer',ARRAY['pm','buyer']::user_role[],ARRAY['pm','buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],true,false,true,false,NULL,'',NULL,6)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

-- ACTIVITIES: S4 (Parking Lot, PM approved)
INSERT INTO supplier_activities (id,supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,sort_order)
VALUES
  (gen_random_uuid(),s4,'parking_lot','pl_added','Supplier added with inclusion reason',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm','buyer']::user_role[],false,false,false,true,0),
  (gen_random_uuid(),s4,'parking_lot','pl_weekly_review','Weekly SSD review meeting logged',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['buyer','sqd']::user_role[],ARRAY[]::user_role[],false,true,false,true,1),
  (a_pl4_decision,s4,'parking_lot','pl_weekly_decision','Parking Lot weekly decision: PM + Buyer',ARRAY['pm','buyer']::user_role[],ARRAY['pm','buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],true,false,true,false,2),
  (gen_random_uuid(),s4,'parking_lot','pl_gsm_notified','GSM team notified of results',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm']::user_role[],false,false,false,false,3)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

INSERT INTO activity_approvals (activity_id,supplier_id,role,approved,approved_by_name,created_at)
VALUES (a_pl4_decision,s4,'pm',true,'PM - F. Bernard',now_ts-'2 days'::interval)
ON CONFLICT (activity_id,role) DO NOTHING;

-- ACTIVITIES: S5 (Parking Lot, both pending)
INSERT INTO supplier_activities (id,supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,sort_order)
VALUES
  (gen_random_uuid(),s5,'parking_lot','pl_added','Supplier added with inclusion reason',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm','buyer']::user_role[],false,false,false,true,0),
  (gen_random_uuid(),s5,'parking_lot','pl_weekly_review','Weekly SSD review meeting logged',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['buyer','sqd']::user_role[],ARRAY[]::user_role[],false,true,false,false,1),
  (a_pl5_decision,s5,'parking_lot','pl_weekly_decision','Parking Lot weekly decision: PM + Buyer',ARRAY['pm','buyer']::user_role[],ARRAY['pm','buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],true,false,true,false,2),
  (gen_random_uuid(),s5,'parking_lot','pl_gsm_notified','GSM team notified of results',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm']::user_role[],false,false,false,false,3)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

-- ACTIVITIES: S6 (Prelim Eval, QA done, PM approved advance)
INSERT INTO supplier_activities (id,supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,completed_at,completed_by,completed_by_role,sort_order)
VALUES
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_review_meeting','Supplier Development review meeting held',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['buyer','sqd']::user_role[],ARRAY[]::user_role[],false,true,false,true,now_ts-'40 days'::interval,'SSD - Marie Leclerc','ssd',0),
  (a_pe6_advance,s6,'preliminary_evaluation','pe_advance_decision','Decision to advance or stay: PM + Buyer',ARRAY['pm','buyer']::user_role[],ARRAY['pm','buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],true,false,true,false,NULL,'',NULL,1),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_initiated','Preliminary evaluation initiated',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,true,now_ts-'38 days'::interval,'SSD - Marie Leclerc','ssd',2),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_compliance_eval','Supplier requirements compliance evaluated',ARRAY['ssd']::user_role[],ARRAY['pm']::user_role[],ARRAY[]::user_role[],ARRAY['buyer','sqd']::user_role[],ARRAY[]::user_role[],false,true,false,true,now_ts-'20 days'::interval,'SSD - Marie Leclerc','ssd',3),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_dev_activities','Supplier development activities executed',ARRAY['ssd']::user_role[],ARRAY[]::user_role[],ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],false,false,false,false,NULL,'',NULL,4),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_quality_assessment','Supplier Quality Assessment — SQD ONLY',ARRAY['sqd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','pm']::user_role[],false,false,false,true,now_ts-'10 days'::interval,'SQD - R. Hoffman','sqd',5),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_quality_feedback','Quality feedback provided — SQD ONLY',ARRAY['sqd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','pm']::user_role[],false,false,false,true,now_ts-'8 days'::interval,'SQD - R. Hoffman','sqd',6),
  (gen_random_uuid(),s6,'preliminary_evaluation','pe_eligibility','Eligibility to proceed: PM + Buyer',ARRAY['pm','buyer']::user_role[],ARRAY['pm','buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],true,false,true,false,NULL,'',NULL,7)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

INSERT INTO activity_approvals (activity_id,supplier_id,role,approved,approved_by_name,created_at)
VALUES (a_pe6_advance,s6,'pm',true,'PM - F. Bernard',now_ts-'5 days'::interval)
ON CONFLICT (activity_id,role) DO NOTHING;

-- ACTIVITIES: S7 (RFQ)
INSERT INTO supplier_activities (supplier_id,stage,activity_key,activity_label,responsible_roles,accountable_roles,support_roles,consulted_roles,informed_roles,requires_dual_approval,requires_consultation,is_gate,is_complete,completed_at,completed_by,completed_by_role,sort_order)
VALUES
  (s7,'rfq','rfq_completed','Preliminary Evaluation RFQ completed — BUYER ONLY',ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd','pm']::user_role[],false,false,false,false,NULL,'',NULL,0),
  (s7,'rfq','rfq_parts_defined','Part numbers and programs defined',ARRAY['buyer']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['ssd']::user_role[],false,false,false,false,NULL,'',NULL,1),
  (s7,'rfq','rfq_duns_validated','DUNS number validated — legal entity confirmed',ARRAY['buyer','ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm']::user_role[],false,false,false,true,now_ts-'3 days'::interval,'Buyer - J. Dupont','buyer',2),
  (s7,'rfq','rfq_docusign','All documents signed via DocuSign confirmed',ARRAY['buyer','ssd']::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY[]::user_role[],ARRAY['pm']::user_role[],false,false,true,false,NULL,'',NULL,3)
ON CONFLICT (supplier_id,activity_key) DO NOTHING;

-- TIMELINE
INSERT INTO supplier_timeline (supplier_id,event_type,from_stage,to_stage,description,performed_by_role,performed_by_name,created_at)
VALUES
  (s1,'stage_change',NULL,'scouting_event_prep','Supplier added to pipeline — Scouting Event Prep','ssd','Marie Leclerc',now_ts-'8 days'::interval),
  (s2,'stage_change',NULL,'scouting_event_prep','Supplier added to pipeline — Scouting Event Prep','ssd','Thomas Müller',now_ts-'5 days'::interval),
  (s3,'stage_change',NULL,'new_supplier_identified','Supplier added to pipeline','ssd','Marie Leclerc',now_ts-'35 days'::interval),
  (s3,'stage_change','new_supplier_identified','scouting_event_prep','Advanced to Scouting Event Prep','ssd','Marie Leclerc',now_ts-'28 days'::interval),
  (s3,'stage_change','scouting_event_prep','b2b_evaluation','Advanced to B2B Evaluation','pm','F. Bernard',now_ts-'14 days'::interval),
  (s4,'stage_change',NULL,'parking_lot','Moved to Parking Lot — capacity review ongoing','ssd','Anna Kowalski',now_ts-'28 days'::interval),
  (s5,'stage_change',NULL,'parking_lot','Moved to Parking Lot — pricing alignment needed','ssd','Thomas Müller',now_ts-'33 days'::interval),
  (s6,'stage_change',NULL,'preliminary_evaluation','Advanced to Preliminary Evaluation','pm','F. Bernard',now_ts-'45 days'::interval),
  (s6,'activity_complete','preliminary_evaluation',NULL,'Activity completed: "Supplier Quality Assessment — SQD ONLY"','sqd','R. Hoffman',now_ts-'10 days'::interval),
  (s6,'activity_complete','preliminary_evaluation',NULL,'Activity completed: "Quality feedback provided — SQD ONLY"','sqd','R. Hoffman',now_ts-'8 days'::interval),
  (s7,'stage_change',NULL,'rfq','Advanced to RFQ stage','pm','F. Bernard',now_ts-'6 days'::interval),
  (s8,'stage_change',NULL,'b2b_evaluation','Advanced to B2B Evaluation','ssd','Anna Kowalski',now_ts-'30 days'::interval),
  (s8,'blacklisted','b2b_evaluation','blacklisted','Blacklisted. Failed IATF 16949 certification audit.','pm','F. Bernard',now_ts-'5 days'::interval)
ON CONFLICT DO NOTHING;

-- CONSULTATION
INSERT INTO activity_consultations (activity_id,supplier_id,role,consultant_name,input_text,submitted_at)
SELECT id,s1,'sqd','SQD - R. Hoffman','Master Requirements reviewed. Key concern: EPS torque specs need to align with Nexteer internal standard N-XX-4412. Recommend adding vibration resistance specification for Poland facility climate conditions.',now_ts-'5 days'::interval
FROM supplier_activities WHERE supplier_id=s1 AND activity_key='scout_master_req'
ON CONFLICT DO NOTHING;

-- NOTIFICATIONS
INSERT INTO notifications (target_role,supplier_id,title,body,is_read,created_at)
VALUES
  ('pm',s4,'Dual approval required','Parking Lot weekly decision for GKN Driveline needs your vote.','f',now_ts-'1 day'::interval),
  ('buyer',s4,'Dual approval required','Parking Lot weekly decision for GKN Driveline is awaiting your vote. PM has approved.','f',now_ts-'1 day'::interval),
  ('buyer',s6,'Dual approval required','Preliminary Evaluation advance decision for Hirschvogel — PM approved, your vote needed.','f',now_ts-'4 days'::interval),
  ('buyer',s7,'RFQ action required','RFQ activities pending your completion for Govoni S.p.A.','f',now_ts-'1 day'::interval),
  ('sqd',s1,'Consultation required','Sourcing event plan for Nexteer Automotive Poland requires your consultation input.','f',now_ts-'3 days'::interval),
  ('ssd',s3,'NDA blocking B2B','ZF Friedrichshafen AG — NDA not yet signed. B2B advancement is blocked.','f',now_ts-'2 days'::interval),
  ('ssd',s5,'Parking Lot overdue','Tenneco Automotive has exceeded the 30-day Parking Lot limit (33 days).','f',now_ts-'3 days'::interval)
ON CONFLICT DO NOTHING;

-- SCOUTING EVENTS
INSERT INTO scouting_events (name,event_date,location,organizer,supplier_ids,preliminary_list_complete,b2b_agenda_complete,layout_file_complete,nda_tracker)
VALUES
  ('Paris Automotive Summit 2026','2026-06-15','Paris, France','Thomas Müller',ARRAY[s2],true,false,false,'{}'),
  ('Munich Supplier Day Q3 2026','2026-09-10','Munich, Germany','Marie Leclerc',ARRAY[s1,s3],true,true,true,'{}')
ON CONFLICT DO NOTHING;

END $$;
