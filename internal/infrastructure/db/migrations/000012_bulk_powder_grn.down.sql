-- Revert Story 3.3 schema changes
-- SQLite does not support DROP COLUMN directly, so we recreate the tables.

-- Recreate grn_lines without unit_price
CREATE TABLE grn_lines_backup AS SELECT id, grn_id, line_no, item_id, quantity_received, created_at FROM grn_lines;
DROP TABLE grn_lines;
CREATE TABLE grn_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grn_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL CHECK (line_no > 0),
    item_id INTEGER NOT NULL,
    quantity_received REAL NOT NULL CHECK (quantity_received > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grn_id, line_no),
    FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);
INSERT INTO grn_lines SELECT * FROM grn_lines_backup;
DROP TABLE grn_lines_backup;

-- Recreate material_lots without source_type and unit_cost
DROP INDEX IF EXISTS idx_material_lots_source_type;
CREATE TABLE material_lots_backup AS SELECT id, lot_number, grn_id, grn_line_id, grn_number, item_id, supplier_name, quantity_received, created_at FROM material_lots;
DROP TABLE material_lots;
CREATE TABLE material_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL UNIQUE,
    grn_id INTEGER NOT NULL,
    grn_line_id INTEGER NOT NULL,
    grn_number TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    supplier_name TEXT NOT NULL,
    quantity_received REAL NOT NULL CHECK (quantity_received > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
    FOREIGN KEY (grn_line_id) REFERENCES grn_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);
INSERT INTO material_lots SELECT * FROM material_lots_backup;
DROP TABLE material_lots_backup;
