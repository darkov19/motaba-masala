CREATE TABLE IF NOT EXISTS unit_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    factor REAL NOT NULL CHECK (factor > 0),
    precision_scale INTEGER NOT NULL DEFAULT 4 CHECK (precision_scale >= 0 AND precision_scale <= 12),
    rounding_mode TEXT NOT NULL DEFAULT 'HALF_UP' CHECK (rounding_mode IN ('HALF_UP', 'DOWN', 'UP')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_conversions_unique_rule
    ON unit_conversions (COALESCE(item_id, 0), from_unit, to_unit);

CREATE INDEX IF NOT EXISTS idx_unit_conversions_lookup
    ON unit_conversions (from_unit, to_unit, item_id, is_active);
