-- Story 3.3: Third-Party Bulk Procurement
-- Adds unit_price to grn_lines for purchase price tracking.
-- Adds source_type and unit_cost to material_lots for traceability of external-source bulk.

ALTER TABLE grn_lines
    ADD COLUMN unit_price REAL NOT NULL DEFAULT 0;

ALTER TABLE material_lots
    ADD COLUMN source_type TEXT NOT NULL DEFAULT 'SUPPLIER_GRN';

ALTER TABLE material_lots
    ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_material_lots_source_type
    ON material_lots (source_type);
