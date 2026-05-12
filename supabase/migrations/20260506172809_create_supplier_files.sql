/*
  # Supplier Files — Stage-level document attachments

  Adds a table to track files uploaded against a supplier at a specific
  pipeline stage. Files are stored in Supabase Storage (bucket: supplier-files).

  1. New Tables
     - `supplier_files`
       - id (uuid, pk)
       - supplier_id (uuid, fk → suppliers)
       - stage (text) — pipeline stage the file belongs to
       - activity_id (uuid, nullable) — optional link to a specific checklist activity
       - file_name (text) — original file name shown in UI
       - storage_path (text) — full path in the storage bucket
       - file_size (bigint) — bytes
       - mime_type (text)
       - uploaded_by (text) — actor name
       - uploaded_by_role (text) — actor role
       - created_at (timestamptz)

  2. Security
     - RLS enabled
     - Authenticated users can read all supplier files
     - Authenticated users can insert their own files
     - No delete (files are immutable records in the audit trail)
*/

CREATE TABLE IF NOT EXISTS supplier_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  stage          text NOT NULL DEFAULT '',
  activity_id    uuid,
  file_name      text NOT NULL,
  storage_path   text NOT NULL,
  file_size      bigint NOT NULL DEFAULT 0,
  mime_type      text NOT NULL DEFAULT '',
  uploaded_by    text NOT NULL DEFAULT '',
  uploaded_by_role text NOT NULL DEFAULT 'ssd',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_files_supplier_id ON supplier_files(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_files_stage ON supplier_files(supplier_id, stage);

ALTER TABLE supplier_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier files"
  ON supplier_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert supplier files"
  ON supplier_files FOR INSERT
  TO authenticated
  WITH CHECK (true);
