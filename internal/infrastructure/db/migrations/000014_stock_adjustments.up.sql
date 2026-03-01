CREATE TABLE IF NOT EXISTS stock_adjustments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     INTEGER NOT NULL REFERENCES items(id),
    lot_id      INTEGER REFERENCES material_lots(id),
    qty_delta   REAL    NOT NULL,
    reason_code TEXT    NOT NULL,
    notes       TEXT,
    created_by  TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item_id ON stock_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_lot_id ON stock_adjustments(lot_id);
