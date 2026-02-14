-- Revert: Rename DataEntryOperator back to Factory (best-effort rollback)
UPDATE users SET role = 'Factory' WHERE role = 'DataEntryOperator';
