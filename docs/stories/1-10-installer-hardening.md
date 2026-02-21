# Story 1.10: Installer Hardening

Status: review

## Story

As a Deployment Technician,
I want the installer to automatically add firewall rules and offer startup options,
so that the deployment process is plug-and-play and works on the first try.

## Acceptance Criteria

1.  **Firewall Rule**: The Server Installer adds an Inbound Rule to Windows Firewall allowing TCP/UDP traffic on the application port (default 8090) for the `masala_inventory_server.exe` executable. [Source: docs/resilience-audit-report.md#3.4]
2.  **Auto-Start Option**: The Client and Server Installers both offer a checkbox "Start automatically when Windows starts" (default: checked). If selected, a shortcut is placed in the Windows `Startup` folder. [Source: docs/resilience-audit-report.md#2.3]

## Tasks / Subtasks

- [x] Task 1: Implement Firewall Rule in NSIS (AC: 1)
    - [x] Locate `scripts/windows/installer/masala-installer.nsi` (or equivalent).
    - [x] Add `nsExec::ExecToLog` command to run `netsh advfirewall`.
    - [x] Command: `netsh advfirewall firewall add rule name="Masala Inventory Server" dir=in action=allow program="$INSTDIR\masala_inventory_server.exe" enable=yes`.
    - [x] Add rollback logic to remove rule on Uninstall.

- [x] Task 2: Implement Auto-Start Option (AC: 2)
    - [x] Add Custom Page or Checkbox to NSIS UI ("Launch on Startup").
    - [x] Read checkbox state.
    - [x] If checked, `CreateShortCut "$SMPROGRAMS\Startup\MasalaClient.lnk" "$INSTDIR\masala_inventory_client.exe"`.
    - [x] Remove shortcut on Uninstall.

### Review Follow-ups (AI)

- [x] [AI-Review][Med] Replace `$SMPROGRAMS\Startup\...` shortcut paths with shell-safe Startup-folder constants (`$SMSTARTUP`) and validate install/uninstall behavior for both server and client variants (AC #2). ✅ Fixed in `scripts/windows/installer/masala-installer.nsi`.
- [x] [AI-Review][Med] Extend `installer_nsi_contract_test.go` assertions to include TCP/UDP 8090 firewall rule commands so AC #1 remains regression-protected. ✅ Fixed in `installer_nsi_contract_test.go`.

## Dev Notes

- **Tools**: Uses NSIS (Nullsoft Scriptable Install System).
- **Permissions**: `netsh` requires Admin privileges. Ensure the installer requests `RequestExecutionLevel admin`.
- **Project Structure Notes**:
    - Modified: `scripts/windows/installer/masala-installer.nsi`

## Learnings from Previous Story

**From Story 1.1 (Project Initialization)**

- **Build Scripts**: Ensure `wails build` commands in the `Makefile` or `Taskfile` are updated to include the new NSIS script paths if they aren't already auto-detected.

**From Story 1.3 (Hardware Bound Licensing)**

- **Admin Privileges**: Story 1.3 required admin rights for reading certain hardware info. Story 1.10 requires it for Firewall rules. Ensure the manifest request level is consistent.

## Dev Agent Record

### Context Reference

- [Story Context](./1-10-installer-hardening.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-21: Planned implementation around actual repo structure (no existing installer tree); created equivalent NSIS script at `scripts/windows/installer/masala-installer.nsi` with parameterized client/server behavior.
- 2026-02-21: Implemented firewall add/delete commands for server installer, startup checkbox page (default checked), and startup shortcut creation/removal logic on install/uninstall.
- 2026-02-21: Added contract test `installer_nsi_contract_test.go` to validate required NSIS hardening directives remain present.
- 2026-02-21: Regression validation: `go test ./...` passed; `frontend` lint initially failed on existing explicit `any`, resolved with typed `ReactNode`, then `npm run lint` and `npm run test:run` passed.

### Completion Notes List

- Implemented Story 1.10 installer hardening in the repository via a new NSIS script at `scripts/windows/installer/masala-installer.nsi` (equivalent path to story notes).
- Added `RequestExecutionLevel admin` and server firewall rule setup/cleanup using `nsExec::ExecToLog netsh advfirewall`.
- Added explicit startup checkbox page ("Start automatically when Windows starts"), default checked, with conditional startup shortcut creation for both server and client installers.
- Added uninstall cleanup for startup shortcuts and server firewall rules.
- Added automated contract coverage to prevent regressions in critical NSIS hardening directives.

### File List

- cmd/server/main.go
- docs/sprint-status.yaml
- docs/stories/1-10-installer-hardening.context.xml
- docs/stories/1-10-installer-hardening.md
- frontend/src/App.css
- frontend/src/App.tsx
- frontend/src/__tests__/AppRecoveryMode.test.tsx
- frontend/src/hooks/useUnsavedChanges.ts
- installer_nsi_contract_test.go
- internal/infrastructure/license/fingerprint_windows.go
- scripts/story-1-10-windows-installer-hardening-test.ps1
- scripts/windows-hard-sync-build-run.ps1
- scripts/windows/installer/masala-installer.nsi
## Change Log

- 2026-02-15: Story drafted.
- 2026-02-21: Implemented installer hardening (firewall rule + startup option), added NSIS contract test, and completed validation suite.
- 2026-02-21: Senior Developer Review notes appended (Outcome: Changes Requested).
- 2026-02-21: Addressed review action items (startup shortcut shell path hardening + expanded firewall contract assertions).

---

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-21

### Outcome

Changes Requested

### Summary

Core story functionality is implemented: firewall rules are added/removed for server installer and startup options are present for both installer variants. No high-severity validation failures were found, and all checked tasks are verifiable in code. However, two medium-severity issues remain: Startup shortcut pathing should use shell-safe constants (`$SMSTARTUP`/proper shell context), and the NSIS contract test does not protect the TCP/UDP 8090 firewall rules required by AC1.

### Key Findings

#### HIGH Severity

None.

#### MEDIUM Severity

1. Startup shortcut location uses `$SMPROGRAMS\\Startup\\...` instead of shell-safe startup constants, which is brittle on localized Windows installations and shell-path variants.  
   Evidence: `scripts/windows/installer/masala-installer.nsi:76`, `scripts/windows/installer/masala-installer.nsi:78`, `scripts/windows/installer/masala-installer.nsi:82`, `scripts/windows/installer/masala-installer.nsi:84`, `scripts/windows/installer/masala-installer.nsi:92`, `scripts/windows/installer/masala-installer.nsi:93`.
2. Contract test coverage is incomplete for AC1 because it does not assert the TCP/UDP port-8090 rules, so future regressions could pass tests while violating AC1 specifics.  
   Evidence: required rules implemented at `scripts/windows/installer/masala-installer.nsi:70`, `scripts/windows/installer/masala-installer.nsi:71`; missing assertions in `installer_nsi_contract_test.go:18`.

#### LOW Severity

None.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Server installer adds inbound firewall allowance for app traffic on default port 8090 (TCP/UDP) for `masala_inventory_server.exe`. | IMPLEMENTED | Firewall add commands: `scripts/windows/installer/masala-installer.nsi:68`, `scripts/windows/installer/masala-installer.nsi:70`, `scripts/windows/installer/masala-installer.nsi:71`; uninstall rollback: `scripts/windows/installer/masala-installer.nsi:96`, `scripts/windows/installer/masala-installer.nsi:97`, `scripts/windows/installer/masala-installer.nsi:98`; admin elevation: `scripts/windows/installer/masala-installer.nsi:30`. |
| AC2 | Client and Server installers provide default-checked "Start automatically when Windows starts" option and create Startup shortcut when selected. | IMPLEMENTED | Custom page and checkbox text/default checked: `scripts/windows/installer/masala-installer.nsi:37`, `scripts/windows/installer/masala-installer.nsi:52`, `scripts/windows/installer/masala-installer.nsi:54`; state read: `scripts/windows/installer/masala-installer.nsi:59`; conditional shortcut creation: `scripts/windows/installer/masala-installer.nsi:76`, `scripts/windows/installer/masala-installer.nsi:78`; uninstall cleanup: `scripts/windows/installer/masala-installer.nsi:92`, `scripts/windows/installer/masala-installer.nsi:93`. |

Summary: 2 of 2 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Task 1: Implement Firewall Rule in NSIS (AC1) | Completed `[x]` | VERIFIED COMPLETE | Firewall add/delete logic present: `scripts/windows/installer/masala-installer.nsi:68`, `scripts/windows/installer/masala-installer.nsi:70`, `scripts/windows/installer/masala-installer.nsi:71`, `scripts/windows/installer/masala-installer.nsi:96`, `scripts/windows/installer/masala-installer.nsi:97`, `scripts/windows/installer/masala-installer.nsi:98`. |
| Subtask: Locate installer script | Completed `[x]` | VERIFIED COMPLETE | Script exists and is active implementation target: `scripts/windows/installer/masala-installer.nsi:1`. |
| Subtask: Add `nsExec::ExecToLog` for `netsh advfirewall` | Completed `[x]` | VERIFIED COMPLETE | `nsExec::ExecToLog` used for firewall add/delete: `scripts/windows/installer/masala-installer.nsi:68`, `scripts/windows/installer/masala-installer.nsi:70`, `scripts/windows/installer/masala-installer.nsi:71`, `scripts/windows/installer/masala-installer.nsi:96`, `scripts/windows/installer/masala-installer.nsi:97`, `scripts/windows/installer/masala-installer.nsi:98`. |
| Subtask: Add `Masala Inventory Server` rule command | Completed `[x]` | VERIFIED COMPLETE | Command present exactly: `scripts/windows/installer/masala-installer.nsi:68`. |
| Subtask: Add uninstall rollback for firewall rule | Completed `[x]` | VERIFIED COMPLETE | Delete rule commands in uninstall section: `scripts/windows/installer/masala-installer.nsi:96`, `scripts/windows/installer/masala-installer.nsi:97`, `scripts/windows/installer/masala-installer.nsi:98`. |
| Task 2: Implement Auto-Start Option (AC2) | Completed `[x]` | VERIFIED COMPLETE | Startup custom page + checkbox + create/delete shortcuts implemented: `scripts/windows/installer/masala-installer.nsi:37`, `scripts/windows/installer/masala-installer.nsi:52`, `scripts/windows/installer/masala-installer.nsi:54`, `scripts/windows/installer/masala-installer.nsi:76`, `scripts/windows/installer/masala-installer.nsi:78`, `scripts/windows/installer/masala-installer.nsi:92`, `scripts/windows/installer/masala-installer.nsi:93`. |
| Subtask: Add custom page/checkbox | Completed `[x]` | VERIFIED COMPLETE | Custom page + checkbox label implemented: `scripts/windows/installer/masala-installer.nsi:37`, `scripts/windows/installer/masala-installer.nsi:52`. |
| Subtask: Read checkbox state | Completed `[x]` | VERIFIED COMPLETE | Checkbox state read into variable: `scripts/windows/installer/masala-installer.nsi:59`. |
| Subtask: Create Startup shortcut when checked | Completed `[x]` | VERIFIED COMPLETE | Conditional `CreateShortCut` for server/client: `scripts/windows/installer/masala-installer.nsi:74`, `scripts/windows/installer/masala-installer.nsi:76`, `scripts/windows/installer/masala-installer.nsi:78`. |
| Subtask: Remove shortcut on uninstall | Completed `[x]` | VERIFIED COMPLETE | Uninstall deletes both startup links: `scripts/windows/installer/masala-installer.nsi:92`, `scripts/windows/installer/masala-installer.nsi:93`. |

Summary: 10 of 10 completed tasks/subtasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Automated: Go contract test verifies presence of key installer hardening directives. Evidence: `installer_nsi_contract_test.go:11`, `installer_nsi_contract_test.go:18`.
- Automated run status: `go test ./...` passed on 2026-02-21.
- Manual validation support exists via PowerShell scenario script for install/uninstall behavior checks. Evidence: `scripts/story-1-10-windows-installer-hardening-test.ps1:137`, `scripts/story-1-10-windows-installer-hardening-test.ps1:199`.
- Gap: contract test should assert TCP/UDP 8090-specific firewall rules (`scripts/windows/installer/masala-installer.nsi:70`, `scripts/windows/installer/masala-installer.nsi:71`) to fully lock AC1 behavior.

### Architectural Alignment

- Implementation aligns with architecture and deployment strategy that specifies NSIS installers for server/client deliverables. Evidence: `docs/architecture.md` (Deployment Strategy section) and installer implementation in `scripts/windows/installer/masala-installer.nsi`.
- Epic constraints are respected: admin execution level is explicitly set for `netsh` usage. Evidence: `scripts/windows/installer/masala-installer.nsi:30`.

### Security Notes

- Positive: installer requests admin elevation before firewall mutation (`scripts/windows/installer/masala-installer.nsi:30`).
- Positive: uninstall cleanup removes firewall rules and startup shortcuts (`scripts/windows/installer/masala-installer.nsi:92`, `scripts/windows/installer/masala-installer.nsi:93`, `scripts/windows/installer/masala-installer.nsi:96`, `scripts/windows/installer/masala-installer.nsi:97`, `scripts/windows/installer/masala-installer.nsi:98`).
- Risk to address: shell-path robustness for Startup folder handling (see medium finding #1).

### Best-Practices and References

- NSIS `RequestExecutionLevel`: https://nsis.sourceforge.io/Reference/RequestExecutionLevel
- NSIS `CreateShortCut`: https://nsis.sourceforge.io/Reference/CreateShortCut
- NSIS shell-context behavior: https://nsis.sourceforge.io/Reference/SetShellVarContext
- NSIS shortcut uninstall context guidance: https://nsis.sourceforge.io/Why_doesn%27t_the_uninstaller_remove_my_shortcuts_for_all_users%3F
- Microsoft `netsh advfirewall`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-advfirewall

### Action Items

**Code Changes Required:**
- [x] [Med] Replace `$SMPROGRAMS\Startup\...` shortcut paths with shell-safe Startup-folder constants (`$SMSTARTUP`) and validate install/uninstall behavior for both server and client variants (AC #2) [file: `scripts/windows/installer/masala-installer.nsi:74`] ✅ Fixed
- [x] [Med] Extend `installer_nsi_contract_test.go` assertions to include TCP/UDP 8090 firewall rule commands so AC #1 remains regression-protected [file: `installer_nsi_contract_test.go:18`] ✅ Fixed

**Advisory Notes:**
- Note: Keep using the manual Windows validation script after NSIS changes to verify real firewall/shortcut side effects on target OS builds (`scripts/story-1-10-windows-installer-hardening-test.ps1`).
