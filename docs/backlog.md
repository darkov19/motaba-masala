# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story's `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date       | Story | Epic | Type | Severity | Owner | Status  | Notes                                                                                  |
| ---------- | ----- | ---- | ---- | -------- | ----- | ------- | -------------------------------------------------------------------------------------- |
| 2026-02-13 | 1.4   | 1    | Bug  | Med      | TBD   | ✅ Done | Test schema drift fixed: removed extra `is_active` and `updated_at` columns from test. |
| 2026-02-18 | 1.7   | 1    | Bug  | High     | TBD   | Open    | Implement route-level navigation blocking for dirty forms (AC 4). Ref: `frontend/src/App.tsx:41`. |
| 2026-02-18 | 1.7   | 1    | Bug  | High     | TBD   | Open    | Implement client-side Wails close interception with dirty-state confirmation (AC 4). Ref: `cmd/client/main.go:17`. |
| 2026-02-18 | 1.7   | 1    | Enhancement | Med | TBD | Open | Align connection indicator with explicit 🟢/🔴 requirement or update AC wording (AC 2). Ref: `frontend/src/components/layout/ConnectionStatus.tsx:11`. |
| 2026-02-18 | 1.7   | 1    | TechDebt | Med | TBD | Open | Add automated tests for connection provider reconnect cadence/state transitions (AC 3). Ref: `frontend/src/context/ConnectionContext.tsx:85`. |
| 2026-02-18 | 1.7   | 1    | TechDebt | Low | TBD | Open | Guard autosave localStorage writes against storage/quota exceptions (AC 1). Ref: `frontend/src/hooks/useAutoSave.ts:87`. |
| 2026-02-18 | 1.8   | 1    | Security | Med | TBD | ✅ Done | Removed plaintext bootstrap password logging and replaced with non-secret setup guidance. Ref: `cmd/server/main.go:127`. |
| 2026-02-18 | 1.8   | 1    | TechDebt | Med | TBD | ✅ Done | Added startup integration coverage for integrity-check/connect-error recovery mode transition. Ref: `cmd/server/startup_recovery_test.go:144`. |

| 2026-02-21 | 1.10 | 1 | TechDebt | Med | TBD | Open | Replace startup shortcut path handling with shell-safe Startup constants (`$SMSTARTUP`) and validate install/uninstall behavior for server/client. Ref: `scripts/windows/installer/masala-installer.nsi:76`. |
| 2026-02-21 | 1.10 | 1 | TechDebt | Med | TBD | Open | Extend NSIS contract test to assert TCP/UDP 8090 firewall rules for AC1 regression coverage. Ref: `installer_nsi_contract_test.go:18`, `scripts/windows/installer/masala-installer.nsi:70`. |
