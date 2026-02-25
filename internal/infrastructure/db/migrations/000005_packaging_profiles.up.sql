CREATE TABLE IF NOT EXISTS packaging_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    pack_mode TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packaging_profile_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    packing_material_item_id INTEGER NOT NULL,
    qty_per_unit REAL NOT NULL CHECK (qty_per_unit > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, packing_material_item_id),
    FOREIGN KEY (profile_id) REFERENCES packaging_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (packing_material_item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_packaging_profiles_active ON packaging_profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_packaging_components_profile ON packaging_profile_components (profile_id);
