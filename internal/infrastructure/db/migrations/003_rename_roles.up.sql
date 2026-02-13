-- Migrate existing role values to the new 2-role system (Admin, DataEntryOperator)
UPDATE users SET role = 'DataEntryOperator' WHERE role IN ('Store', 'Factory', 'EntryOperator');
