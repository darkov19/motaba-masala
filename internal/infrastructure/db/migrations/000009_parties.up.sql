CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT NOT NULL CHECK (party_type IN ('SUPPLIER', 'CUSTOMER')),
    name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    lead_time_days INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (party_type = 'SUPPLIER' OR lead_time_days IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_type_name_unique
    ON parties (party_type, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_parties_type_active
    ON parties (party_type, is_active);

CREATE INDEX IF NOT EXISTS idx_parties_name
    ON parties (name COLLATE NOCASE);
