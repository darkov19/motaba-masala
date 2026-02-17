# Story 1.10: Installer Hardening

Status: ready-for-dev

## Story

As a Deployment Technician,
I want the installer to automatically add firewall rules and offer startup options,
so that the deployment process is plug-and-play and works on the first try.

## Acceptance Criteria

1.  **Firewall Rule**: The Server Installer adds an Inbound Rule to Windows Firewall allowing TCP/UDP traffic on the application port (default 8090) for the `MasalaServer.exe` executable. [Source: docs/resilience-audit-report.md#3.4]
2.  **Auto-Start Option**: The Client and Server Installers both offer a checkbox "Start automatically when Windows starts" (default: checked). If selected, a shortcut is placed in the Windows `Startup` folder. [Source: docs/resilience-audit-report.md#2.3]

## Tasks / Subtasks

- [ ] Task 1: Implement Firewall Rule in NSIS (AC: 1)
    - [ ] Locate `build/windows/installer/server.nsi` (or equivalent).
    - [ ] Add `nsExec::ExecToLog` command to run `netsh advfirewall`.
    - [ ] Command: `netsh advfirewall firewall add rule name="Masala Inventory Server" dir=in action=allow program="$INSTDIR\MasalaServer.exe" enable=yes`.
    - [ ] Add rollback logic to remove rule on Uninstall.

- [ ] Task 2: Implement Auto-Start Option (AC: 2)
    - [ ] Add Custom Page or Checkbox to NSIS UI ("Launch on Startup").
    - [ ] Read checkbox state.
    - [ ] If checked, `CreateShortCut "$SMPROGRAMS\Startup\MasalaClient.lnk" "$INSTDIR\MasalaClient.exe"`.
    - [ ] Remove shortcut on Uninstall.

## Dev Notes

- **Tools**: Uses NSIS (Nullsoft Scriptable Install System).
- **Permissions**: `netsh` requires Admin privileges. Ensure the installer requests `RequestExecutionLevel admin`.
- **Project Structure Notes**:
    - Modified: `build/windows/installer/project.nsi`

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

### Completion Notes List

### File List

## Change Log

- 2026-02-15: Story drafted.

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
