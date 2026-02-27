CREATE TABLE IF NOT EXISTS material_lots (
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

CREATE INDEX IF NOT EXISTS idx_material_lots_item_id
    ON material_lots (item_id);

CREATE INDEX IF NOT EXISTS idx_material_lots_grn_id
    ON material_lots (grn_id);

CREATE INDEX IF NOT EXISTS idx_material_lots_grn_line_id
    ON material_lots (grn_line_id);

CREATE INDEX IF NOT EXISTS idx_material_lots_supplier_name
    ON material_lots (supplier_name);

CREATE INDEX IF NOT EXISTS idx_material_lots_created_at
    ON material_lots (created_at);

ALTER TABLE stock_ledger
    ADD COLUMN lot_number TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_ledger_lot_number
    ON stock_ledger (lot_number);
