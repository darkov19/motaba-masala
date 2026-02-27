CREATE TABLE IF NOT EXISTS grn_lines (
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

CREATE INDEX IF NOT EXISTS idx_grn_lines_grn_id
    ON grn_lines (grn_id);

CREATE INDEX IF NOT EXISTS idx_grn_lines_item_id
    ON grn_lines (item_id);
