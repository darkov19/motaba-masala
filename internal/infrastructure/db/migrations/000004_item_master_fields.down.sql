CREATE TABLE IF NOT EXISTS items_rollback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    minimum_stock REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO items_rollback (id, sku, name, category, unit, minimum_stock, is_active, created_at, updated_at)
SELECT id, sku, name, category, unit, minimum_stock, is_active, created_at, updated_at
FROM items;

DROP TABLE items;
ALTER TABLE items_rollback RENAME TO items;
