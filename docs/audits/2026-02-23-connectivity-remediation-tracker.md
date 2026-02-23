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

### 1) Backend API and behavior

- `internal/app/app.go`
  - Added `CheckServerReachability() (bool, error)`:
    - network-first TCP probe (default target `127.0.0.1:8090`)
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
    - network probe false case
    - local-dev fallback true case
    - probe address parsing
    - local-dev env parsing
- `frontend/src/context/__tests__/ConnectionContext.test.tsx`
  - Updated mocks from `Greet` to `CheckServerReachability`.

### 4) Validation run status (local CI/dev)

- `go test ./internal/app/...` ✅
- `frontend npm test` ✅
- `frontend npm run lint` ✅

## Pending: Windows Real-Flow Validation (Step 5)

Run on Windows:

1. Rebuild apps:
   - `.\scripts\windows-hard-sync-build-run.ps1`
2. Run Story 1.11 manual UI flow (default mode):
   - `.\scripts\story-1-11-windows-resilience-test.ps1`
3. Verify expected behavior:
   - No immediate false reconnect overlay at startup when server is reachable.
   - Baseline reaches `Connected` before AC1 starts.
   - AC3: server-stop transition shows reconnect symptoms then recovers to `Connected`.
   - AC4: resume draft prompt appears and client returns to `Connected`.
4. Confirm report output:
   - `docs/manual_testing/story-1-11-resilience-validation-YYYY-MM-DD.md`

## Notes for Deployment Topologies

1. LAN deployment (client/server different machines):
   - Set `MASALA_SERVER_PROBE_ADDR=<server-ip>:8090` on client machine.
   - Keep `MASALA_LOCAL_SINGLE_MACHINE_MODE` unset (default off).
2. Local single-machine developer mode:
   - Optional: set `MASALA_LOCAL_SINGLE_MACHINE_MODE=1` for process fallback when needed.
