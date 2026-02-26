CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_code TEXT NOT NULL UNIQUE,
    output_item_id INTEGER NOT NULL,
    output_qty_base REAL NOT NULL CHECK (output_qty_base > 0),
    expected_wastage_pct REAL NOT NULL DEFAULT 0 CHECK (expected_wastage_pct >= 0 AND expected_wastage_pct <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (output_item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS recipe_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    input_item_id INTEGER NOT NULL,
    input_qty_base REAL NOT NULL CHECK (input_qty_base > 0),
    line_no INTEGER NOT NULL CHECK (line_no > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, line_no),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (input_item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_output_item_active ON recipes (output_item_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe ON recipe_components (recipe_id);
