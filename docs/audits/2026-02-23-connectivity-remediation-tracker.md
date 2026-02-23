# Connectivity Remediation Tracker (Story 1.11 Impact)

- Date: 2026-02-23
- Related audit: `docs/audits/2026-02-23-client-connectivity-probe-audit.md`
- Goal: Replace local-process-based connectivity with network-based reachability and stabilize Story 1.11 real-flow validation.

## Plan Status

1. [x] Add backend network reachability API for client mode.
2. [x] Decouple frontend connection indicator from `Greet("ping")`.
3. [x] Gate local process probe behind explicit local-dev flag only.
4. [x] Update automated tests (Go + frontend) for new behavior.
5. [ ] Validate end-to-end on Windows via Story 1.11 script and record evidence.

## Completed Changes

- Primary implementation commit: `3386f691`
- Source audit doc commit context: `docs/audits/2026-02-23-client-connectivity-probe-audit.md`

### 1) Backend API and behavior

- `internal/app/app.go`
    - Added `CheckServerReachability() (bool, error)`:
        - explicit network probe when `MASALA_SERVER_PROBE_ADDR` is set
        - single-machine compatibility: local process probe default when probe address is not configured
        - optional local-dev fallback probe only when `MASALA_LOCAL_SINGLE_MACHINE_MODE=1`
    - `Greet` no longer performs connectivity probing.
    - Added helpers:
        - `resolveProbeAddress`
        - `probeTCPAddress`
        - `isLocalSingleMachineModeEnabled`
    - Added env knobs:
        - `MASALA_SERVER_PROBE_ADDR` (e.g., `10.0.0.25:8090`)
        - `MASALA_LOCAL_SINGLE_MACHINE_MODE` (`1/true/yes` to enable fallback)

### 2) Frontend connection source-of-truth

- `frontend/src/context/ConnectionContext.tsx`
    - Replaced `Greet("ping")` connectivity probe with `CheckServerReachability()`.
    - Preserved existing reconnect cadence and browser online/offline handling.

### 3) Tests updated

- `internal/app/app_test.go`
    - Removed assumption that `Greet` fails when local process is absent.
    - Added coverage for:
        - local-dev fallback true case
        - network probe false case
        - probe address parsing
        - local-dev env parsing
- `frontend/src/context/__tests__/ConnectionContext.test.tsx`
    - Updated mocks from `Greet` to `CheckServerReachability`.

### 3.1) Remaining Test Gaps (from audit plan)

Owner: Dev Agent  
Target Date: 2026-02-24

1. Add deterministic unit/integration test for explicit network reachable case using a temporary TCP listener and `MASALA_SERVER_PROBE_ADDR`.
2. Add deterministic test for endpoint change/recovery scenario (or document why covered by Story 1.11 AC2 operational test only).

### 4) Validation run status (local CI/dev)

- `go test ./internal/app/...` ✅
- `frontend npm test` ✅
- `frontend npm run lint` ✅

## Pending: Windows Real-Flow Validation (Step 5)

Owner: QA + Operator (Windows validation)  
Target Date: 2026-02-24

Run on Windows:

1. Configure probe target for LAN deployments (required if server is on another machine):
    - `setx MASALA_SERVER_PROBE_ADDR "<server-ip>:8090"`
    - Open a new terminal after `setx`, or set for current shell:
      - `$env:MASALA_SERVER_PROBE_ADDR = "<server-ip>:8090"`
2. Ensure local-dev fallback is disabled for production-like validation:
    - `Remove-Item Env:MASALA_LOCAL_SINGLE_MACHINE_MODE -ErrorAction SilentlyContinue`
3. Rebuild apps:
    - `.\scripts\windows-hard-sync-build-run.ps1`
4. Run Story 1.11 manual UI flow (default mode):
    - `.\scripts\story-1-11-windows-resilience-test.ps1`
5. Verify expected behavior:
    - No immediate false reconnect overlay at startup when server is reachable.
    - Baseline reaches `Connected` before AC1 starts.
    - AC3: server-stop transition shows reconnect symptoms then recovers to `Connected`.
    - AC4: resume draft prompt appears and client returns to `Connected`.
6. Confirm report output:
    - `docs/manual_testing/story-1-11-resilience-validation-YYYY-MM-DD.md`

## Compensation Lifecycle (Track/Decide)

These were introduced as compensations while connectivity source-of-truth was wrong. Keep/remove decisions should be explicit:

1. Overlay suppression during AC1/AC2/AC5 (`frontend/src/App.tsx`, `frontend/src/components/layout/ReconnectionOverlay.tsx`)
    - Status: Keep for test UX clarity unless replaced by separate non-blocking test banner.
2. Automation status bridge (`internal/app/automation_status.go`, script + UI panel)
    - Status: Keep (useful operator telemetry), but mark as test-only behavior in docs.
3. Manual baseline gate in Story 1.11 script
    - Status: Keep (prevents invalid scenario starts).
4. AC4 retry/fallback seeding logic
    - Status: Keep (UIA reliability hardening).
5. Process-probe wrappers (`internal/app/command_windows.go`, `internal/app/command_nonwindows.go`)
    - Status: Keep only while local-dev fallback remains supported.

## Commit Traceability

1. Core reachability remediation: `3386f691`
2. Baseline gate for manual flow: `f1af6c09`
3. AC4 connected-post-restart requirement: `2e35d5aa`
4. AC1/2/5 status panel visibility tweak: `9c1d0c1c`
5. Process-probe Windows UX mitigation: `a687cfc5`

## Notes for Deployment Topologies

1. LAN deployment (client/server different machines):
    - Set `MASALA_SERVER_PROBE_ADDR=<server-ip>:8090` on client machine.
    - Keep `MASALA_LOCAL_SINGLE_MACHINE_MODE` unset (default off).
2. Local single-machine developer mode:
    - Optional: set `MASALA_LOCAL_SINGLE_MACHINE_MODE=1` for process fallback when needed.
