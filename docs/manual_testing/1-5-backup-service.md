# Manual Testing Guide: Story 1.5 (Automated Backup)

Since the frontend UI for the Admin Dashboard is not yet fully implemented, we have created a standalone CLI tool to verify the backend backup service logic manually.

## Prerequisites

- Go 1.26+ installed
- Terminal open at project root (`/home/darko/Code/masala_inventory_managment`)

## How to Run

Execute the test tool:

```bash
go run cmd/manual_test/main.go
```

## Test Scenarios

### 1. Trigger Backup (Immediate)

1. Select **Option 1** (`Trigger Immediate Backup`).
2. Watch the logs. You should see "Starting database backup..." followed by "Backup completed successfully".
3. **Verify**: Open a new terminal and check the `manual_backups` folder:
    ```bash
    ls -l manual_backups/
    ```
    You should see a `.zip` file with the current timestamp (e.g., `backup-2026-02-14T120000.zip`).
4. **Verify Content**: Unzip the file to ensure it contains `masala_inventory.db`.
    ```bash
    unzip -l manual_backups/backup-*.zip
    ```

### 2. Check Backup Status

1. Select **Option 2** (`Check Last Backup Status`).
2. **Verify**: The output should show first run status:
    - `Success: true`
    - `FilePath`: The path to the zip file you just created.
    - `Size`: > 0 bytes.

### 3. Verify Pruning (Retention Policy)

1. Keep the tool running.
2. In a separate terminal, create a "fake" old backup file (older than 7 days):
    ```bash
    # Create a dummy zip file dated 2020-01-01
    touch -t 202001010000 manual_backups/backup-2020-01-01T000000.zip
    ```
3. Back in the tool, select **Option 3** (`Prune Old Backups`).
4. **Verify**: The tool should report `Pruned 1 files`.
5. **Verify File System**: Check that the 2020 file is gone, but your recent backup remains.

### 4. Cleanup

1. Select **Option 4** (`Exit`).
2. This will remove the temporary `manual_test.db` used by the tool.
3. You can manually delete the `manual_backups` folder when done:
    ```bash
    rm -rf manual_backups
    ```
