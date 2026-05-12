/*
  # Add commodity field to suppliers

  Adds a `commodity` column to the suppliers table to support commodity-level
  grouping and analytics across the SSD pipeline.

  - commodity: text — the commodity family this supplier belongs to
    (e.g. Plastics, Cage, Electronics, Welding)
  - commodity_subcategory: text — optional finer sub-classification
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'commodity'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN commodity text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'commodity_subcategory'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN commodity_subcategory text NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_commodity ON suppliers(commodity);

-- Backfill sample data with sensible commodity assignments
UPDATE suppliers SET commodity = 'Electronics',    commodity_subcategory = 'EPS Motors'        WHERE name ILIKE '%Nexteer Automotive Poland%';
UPDATE suppliers SET commodity = 'Cage',           commodity_subcategory = 'Steering Columns'  WHERE name ILIKE '%Jtekt%';
UPDATE suppliers SET commodity = 'Cage',           commodity_subcategory = 'Suspension Links'  WHERE name ILIKE '%ZF Friedrichshafen%';
UPDATE suppliers SET commodity = 'Cage',           commodity_subcategory = 'CV Joints'         WHERE name ILIKE '%GKN%';
UPDATE suppliers SET commodity = 'Welding',        commodity_subcategory = 'Rack & Tie Rods'   WHERE name ILIKE '%Tenneco%';
UPDATE suppliers SET commodity = 'Plastics',       commodity_subcategory = 'Forged Knuckles'   WHERE name ILIKE '%Hirschvogel%';
UPDATE suppliers SET commodity = 'Welding',        commodity_subcategory = 'Rack & Tie Rods'   WHERE name ILIKE '%Govoni%';
UPDATE suppliers SET commodity = 'Plastics',       commodity_subcategory = 'Brake Components'  WHERE name ILIKE '%Rassini%';
