# Story 1.10: Installer Hardening

Status: review

## Story

As a Deployment Technician,
I want the installer to automatically add firewall rules and offer startup options,
so that the deployment process is plug-and-play and works on the first try.

## Acceptance Criteria

1.  **Firewall Rule**: The Server Installer adds an Inbound Rule to Windows Firewall allowing TCP/UDP traffic on the application port (default 8090) for the `MasalaServer.exe` executable. [Source: docs/resilience-audit-report.md#3.4]
2.  **Auto-Start Option**: The Client and Server Installers both offer a checkbox "Start automatically when Windows starts" (default: checked). If selected, a shortcut is placed in the Windows `Startup` folder. [Source: docs/resilience-audit-report.md#2.3]

## Tasks / Subtasks

- [x] Task 1: Implement Firewall Rule in NSIS (AC: 1)
    - [x] Locate `build/windows/installer/server.nsi` (or equivalent).
    - [x] Add `nsExec::ExecToLog` command to run `netsh advfirewall`.
    - [x] Command: `netsh advfirewall firewall add rule name="Masala Inventory Server" dir=in action=allow program="$INSTDIR\MasalaServer.exe" enable=yes`.
    - [x] Add rollback logic to remove rule on Uninstall.

- [x] Task 2: Implement Auto-Start Option (AC: 2)
    - [x] Add Custom Page or Checkbox to NSIS UI ("Launch on Startup").
    - [x] Read checkbox state.
    - [x] If checked, `CreateShortCut "$SMPROGRAMS\Startup\MasalaClient.lnk" "$INSTDIR\MasalaClient.exe"`.
    - [x] Remove shortcut on Uninstall.

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

- scripts/windows/installer/masala-installer.nsi
- installer_nsi_contract_test.go
- frontend/src/__tests__/AppRecoveryMode.test.tsx
- docs/sprint-status.yaml
- docs/stories/1-10-installer-hardening.md
## Change Log

- 2026-02-15: Story drafted.
- 2026-02-21: Implemented installer hardening (firewall rule + startup option), added NSIS contract test, and completed validation suite.

---

## Senior Developer Review (AI)

### Reviewer

### Date

### Outcome

### Summary

### Key Findings

#### HIGH Severity

#### MEDIUM Severity

#### LOW Severity

### Acceptance Criteria Coverage

### Task Completion Validation

### Test Coverage and Gaps

### Architectural Alignment

### Security Notes

### Best-Practices and References

### Action Items
