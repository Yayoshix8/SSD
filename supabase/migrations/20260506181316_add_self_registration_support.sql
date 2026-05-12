/*
  # Self-Registration Support

  Adds first-class support for suppliers who register themselves via a public
  QR-accessible form. These arrive in a dedicated holding stage and are reviewed
  by the SSD team before entering the main pipeline.

  1. Schema changes on suppliers table
     - source (text): 'internal' | 'self_registered' — who created the record
     - pending_review (boolean): true while awaiting SSD acceptance
     - self_registered_at (timestamptz): when the public form was submitted
     - notes_from_supplier (text): optional free-text message from the supplier

  2. New stage value 'form_submitted' added to the current_stage column
     (no enum, column is plain text so no type alteration needed)

  3. RLS: public (anon) users can INSERT into suppliers when source = 'self_registered'
     This allows the public form to write directly without authentication.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'source'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN source text NOT NULL DEFAULT 'internal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'pending_review'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN pending_review boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'self_registered_at'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN self_registered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'notes_from_supplier'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes_from_supplier text NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_pending_review ON suppliers(pending_review) WHERE pending_review = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_source ON suppliers(source);

-- Allow anonymous users (public form / QR code) to self-register
CREATE POLICY "Public can self-register as supplier"
  ON suppliers FOR INSERT
  TO anon
  WITH CHECK (source = 'self_registered' AND pending_review = true);

-- Allow anonymous users to read nothing (they only insert)
-- (no SELECT policy for anon — existing authenticated SELECT policies remain)
