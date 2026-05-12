/*
  # SSD Pipeline Management Schema

  ## Overview
  Creates the full schema for the Supplier Scouting & Development (SSD) Pipeline Management system
  for an automotive TIER1 company.

  ## New Tables

  ### suppliers
  Core supplier records with pipeline stage, DUNS validation, and metadata.
  - id: UUID primary key
  - name: Supplier company name
  - duns_number: DUNS identifier
  - duns_validated: Whether DUNS has been validated by Buyer
  - legal_entity: Legal entity name
  - facility_location: Physical location
  - country: Country of operation
  - component_category: Automotive component type
  - programs: Array of programs this supplier is linked to
  - contact_name, contact_email, contact_phone: Primary contact
  - current_stage: Pipeline stage enum
  - assigned_ssd_member: Name of SSD team member
  - stage_entered_at: Timestamp when current stage was entered
  - blacklist_reason: Required if blacklisted
  - blacklisted_by: Role that blacklisted
  - blacklisted_at: Timestamp of blacklist
  - created_at / updated_at

  ### supplier_documents
  Document checklist items per supplier and stage.

  ### supplier_timeline
  Auto-generated log of stage transitions with role and timestamp.

  ### supplier_notes
  Free text notes per supplier and stage.

  ### scouting_events
  Scouting events with supplier associations.

  ## Security
  - RLS enabled on all tables
  - Public read/write for MVP demo (no auth implemented)
*/

-- Pipeline stages enum
CREATE TYPE pipeline_stage AS ENUM (
  'new_supplier_identified',
  'scouting_event',
  'b2b_evaluation',
  'parking_lot',
  'preliminary_evaluation',
  'rfq',
  'blacklisted'
);

-- User roles enum
CREATE TYPE user_role AS ENUM (
  'ssd_team',
  'commercial_team',
  'buyer'
);

-- Suppliers table
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
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  blacklist_reason text DEFAULT '',
  blacklisted_by text DEFAULT '',
  blacklisted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read suppliers"
  ON suppliers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert suppliers"
  ON suppliers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update suppliers"
  ON suppliers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier documents table
CREATE TABLE IF NOT EXISTS supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL,
  document_key text NOT NULL,
  document_label text NOT NULL,
  is_complete boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, document_key)
);

ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read documents"
  ON supplier_documents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert documents"
  ON supplier_documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update documents"
  ON supplier_documents FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Supplier timeline table
CREATE TABLE IF NOT EXISTS supplier_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage pipeline_stage,
  to_stage pipeline_stage,
  description text NOT NULL,
  performed_by_role user_role NOT NULL,
  performed_by_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read timeline"
  ON supplier_timeline FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert timeline"
  ON supplier_timeline FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Supplier notes table
CREATE TABLE IF NOT EXISTS supplier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL,
  content text NOT NULL,
  author_role user_role NOT NULL,
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read notes"
  ON supplier_notes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert notes"
  ON supplier_notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Scouting events table
CREATE TABLE IF NOT EXISTS scouting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  location text NOT NULL,
  organizer text NOT NULL,
  supplier_ids uuid[] DEFAULT '{}',
  preliminary_supplier_list_complete boolean DEFAULT false,
  b2b_agenda_complete boolean DEFAULT false,
  layout_file_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scouting_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read events"
  ON scouting_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert events"
  ON scouting_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update events"
  ON scouting_events FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_stage ON suppliers(current_stage);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id ON supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_timeline_supplier_id ON supplier_timeline(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier_id ON supplier_notes(supplier_id);
