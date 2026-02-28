-- Revert migration 000013: restore supplier_name TEXT, remove supplier_id FK.

-- 1. Recreate grns with supplier_name instead of supplier_id
CREATE TABLE grns_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grn_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL DEFAULT '',
    invoice_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
DROP TABLE grns;
ALTER TABLE grns_old RENAME TO grns;

-- 2. Recreate material_lots with supplier_name instead of supplier_id
DROP INDEX IF EXISTS idx_material_lots_supplier_id;
DROP INDEX IF EXISTS idx_material_lots_item_id;
DROP INDEX IF EXISTS idx_material_lots_grn_id;
DROP INDEX IF EXISTS idx_material_lots_grn_line_id;
DROP INDEX IF EXISTS idx_material_lots_created_at;
DROP INDEX IF EXISTS idx_material_lots_source_type;

CREATE TABLE material_lots_old (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL UNIQUE,
    grn_id INTEGER NOT NULL,
    grn_line_id INTEGER NOT NULL,
    grn_number TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    supplier_name TEXT NOT NULL DEFAULT '',
    quantity_received REAL NOT NULL CHECK (quantity_received > 0),
    source_type TEXT NOT NULL DEFAULT 'SUPPLIER_GRN',
    unit_cost REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
    FOREIGN KEY (grn_line_id) REFERENCES grn_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);
DROP TABLE material_lots;
ALTER TABLE material_lots_old RENAME TO material_lots;

CREATE INDEX IF NOT EXISTS idx_material_lots_item_id ON material_lots (item_id);
CREATE INDEX IF NOT EXISTS idx_material_lots_grn_id ON material_lots (grn_id);
CREATE INDEX IF NOT EXISTS idx_material_lots_grn_line_id ON material_lots (grn_line_id);
CREATE INDEX IF NOT EXISTS idx_material_lots_supplier_name ON material_lots (supplier_name);
CREATE INDEX IF NOT EXISTS idx_material_lots_created_at ON material_lots (created_at);
CREATE INDEX IF NOT EXISTS idx_material_lots_source_type ON material_lots (source_type);
