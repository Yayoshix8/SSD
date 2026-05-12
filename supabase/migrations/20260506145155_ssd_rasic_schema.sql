/*
  # SSD Pipeline RASIC Schema

  Full rebuild for Nexteer SSD Pipeline Management with RASIC roles,
  dual-approval workflow, consultation log, and per-stage activity checklists.

  ## Tables
  - suppliers: core supplier records with pipeline stage
  - supplier_activities: RASIC checklist items per supplier/stage
  - activity_approvals: individual role approvals for dual-approval activities
  - activity_consultations: SQD/C-role consultation inputs
  - supplier_timeline: immutable audit log
  - supplier_notes: per-stage free-text notes
  - scouting_events: scouting event records
  - notifications: role-targeted in-app notifications
*/

CREATE TYPE pipeline_stage AS ENUM (
  'new_supplier_identified',
  'scouting_event_prep',
  'b2b_evaluation',
  'parking_lot',
  'preliminary_evaluation',
  'rfq',
  'investigation_record',
  'blacklisted'
);

CREATE TYPE user_role AS ENUM ('ssd', 'pm', 'buyer', 'sqd');

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duns_number text DEFAULT '',
  duns_validated boolean DEFAULT false,
  legal_entity text DEFAULT '',
  facility_location text DEFAULT '',
  country text NOT NULL DEFAULT '',
  component_category text NOT NULL DEFAULT '',
  programs text[] DEFAULT '{}',
  contact_name text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  current_stage pipeline_stage NOT NULL DEFAULT 'new_supplier_identified',
  assigned_ssd_member text DEFAULT '',
  elm_score text DEFAULT '',
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  blacklist_reason text DEFAULT '',
  blacklisted_by text DEFAULT '',
  blacklisted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_suppliers" ON suppliers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_suppliers" ON suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_suppliers" ON suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Supplier activities (RASIC checklist per stage)
CREATE TABLE IF NOT EXISTS supplier_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL,
  activity_key text NOT NULL,
  activity_label text NOT NULL,
  responsible_roles user_role[] NOT NULL DEFAULT '{}',
  accountable_roles user_role[] DEFAULT '{}',
  support_roles user_role[] DEFAULT '{}',
  consulted_roles user_role[] DEFAULT '{}',
  informed_roles user_role[] DEFAULT '{}',
  requires_dual_approval boolean DEFAULT false,
  requires_consultation boolean DEFAULT false,
  is_gate boolean DEFAULT false,
  is_complete boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text DEFAULT '',
  completed_by_role user_role,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, activity_key)
);
ALTER TABLE supplier_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_activities" ON supplier_activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_activities" ON supplier_activities FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_activities" ON supplier_activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Dual-approval records (one row per role per activity)
CREATE TABLE IF NOT EXISTS activity_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES supplier_activities(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  approved boolean,
  rejection_note text DEFAULT '',
  approved_by_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, role)
);
ALTER TABLE activity_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_approvals" ON activity_approvals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_approvals" ON activity_approvals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_approvals" ON activity_approvals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_upsert_approvals" ON activity_approvals FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Consultation inputs from C-role
CREATE TABLE IF NOT EXISTS activity_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES supplier_activities(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  consultant_name text DEFAULT '',
  input_text text NOT NULL,
  submitted_at timestamptz DEFAULT now()
);
ALTER TABLE activity_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_consultations" ON activity_consultations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_consultations" ON activity_consultations FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Timeline (immutable audit log)
CREATE TABLE IF NOT EXISTS supplier_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage pipeline_stage,
  to_stage pipeline_stage,
  description text NOT NULL,
  performed_by_role user_role NOT NULL,
  performed_by_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_timeline" ON supplier_timeline FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_timeline" ON supplier_timeline FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Notes
CREATE TABLE IF NOT EXISTS supplier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL,
  content text NOT NULL,
  author_role user_role NOT NULL,
  author_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_notes" ON supplier_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_notes" ON supplier_notes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Scouting events
CREATE TABLE IF NOT EXISTS scouting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  location text NOT NULL,
  organizer text NOT NULL,
  supplier_ids uuid[] DEFAULT '{}',
  preliminary_list_complete boolean DEFAULT false,
  b2b_agenda_complete boolean DEFAULT false,
  layout_file_complete boolean DEFAULT false,
  nda_tracker jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE scouting_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_events" ON scouting_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_events" ON scouting_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_events" ON scouting_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role user_role NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_stage ON suppliers(current_stage);
CREATE INDEX IF NOT EXISTS idx_activities_supplier ON supplier_activities(supplier_id);
CREATE INDEX IF NOT EXISTS idx_approvals_activity ON activity_approvals(activity_id);
CREATE INDEX IF NOT EXISTS idx_consultations_activity ON activity_consultations(activity_id);
CREATE INDEX IF NOT EXISTS idx_timeline_supplier ON supplier_timeline(supplier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(target_role, is_read);
