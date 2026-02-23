# Audit Report: Client Connectivity Probe Regression

- Date: 2026-02-23
- Trigger: Client starts in `Attempting to reconnect...` even when operator expects connected state.
- Primary commit under review: `eb8cbcca` (2026-02-23 16:32:32 IST)
- Remediation tracker: `docs/audits/2026-02-23-connectivity-remediation-tracker.md`

## Executive Summary

`eb8cbcca` changed client "connected" logic to depend on a local OS process check (`tasklist`/`pgrep`) through `App.Greet("ping")`.  
This is incorrect for LAN deployments where server and client run on different PCs.  
Result: false-disconnected state, reconnect overlay on startup, and noisy Story 1.11 validation behavior.

## Root Cause

1. Frontend uses `Greet("ping")` as connectivity source of truth:
   - `frontend/src/context/ConnectionContext.tsx`
2. `Greet` was changed to fail in client mode when local server process is not found:
   - `internal/app/app.go`
3. Local process presence is not equivalent to network/backend reachability in distributed deployment.

## Directly Impacted Areas

1. Connection state and reconnect UX:
   - `frontend/src/context/ConnectionContext.tsx`
   - `frontend/src/components/layout/ReconnectionOverlay.tsx`
   - `frontend/src/components/layout/ConnectionStatus.tsx`
2. Backend app bridge API semantics:
   - `internal/app/app.go` (`Greet` behavior)
   - `internal/app/app_test.go` (tests enforcing current behavior)
3. Story 1.11 validation script reliability:
   - `scripts/story-1-11-windows-resilience-test.ps1`

## Script/UI Compensations Added (Because of This Regression)

These are mitigations layered on top of the wrong connectivity source-of-truth:

1. Reconnect overlay suppression during backend checks (to keep status panel visible):
   - `frontend/src/App.tsx`
   - `frontend/src/components/layout/ReconnectionOverlay.tsx`
2. Live automation status panel and status-file bridge to explain hidden state:
   - `frontend/src/App.tsx`
   - `internal/app/automation_status.go`
   - `scripts/story-1-11-windows-resilience-test.ps1`
3. Manual-flow baseline gate requiring initial `Connected` before scenarios:
   - `scripts/story-1-11-windows-resilience-test.ps1`
4. Extra script retries/fallbacks around UI automation and startup timing:
   - AC4 draft seeding retries and keyboard fallback
   - additional UI readiness waits
   - file: `scripts/story-1-11-windows-resilience-test.ps1`
5. Additional AC4 assertion added to catch latent connectivity issue post-restart:
   - requires `Connected` after resume prompt
   - file: `scripts/story-1-11-windows-resilience-test.ps1`
6. Windows process-probe UX mitigation (blinking terminal windows):
   - hidden command execution wrappers
   - files: `internal/app/command_windows.go`, `internal/app/command_nonwindows.go`, `internal/app/app.go`
7. Windows probe parsing hardening and legacy process-name matching:
   - CSV parsing for `tasklist` output + extra process candidates
   - file: `internal/app/app.go`

These compensations improved operability, but they do not replace the core fix: use network/app-layer reachability instead of local process-table checks as the default client connectivity signal.

## Severity

- High: Wrong connectivity model for real client-server topology.
- Medium: Startup false negatives and operator confusion.
- Medium: Test script required compensating logic for baseline connection and overlay suppression.

## Correct Target Behavior

Client "Connected" should mean:

1. Client can reach server endpoint (network/app layer), or
2. Client has a valid discovered endpoint and successful probe/handshake

It should **not** depend on local process table checks by default.

## Fix Plan (Exact)

### Phase 1: Decouple UI connection from local process checks

1. Add a dedicated backend connectivity API for client mode, e.g. `CheckServerReachability()`.
2. Implement it as network/app-layer probe (not `tasklist`):
   - Preferred: lightweight health endpoint probe to known/discovered server address.
   - Acceptable fallback: existing transport handshake used by client runtime.
3. Update frontend `ConnectionContext` to use the new API instead of `Greet("ping")`.
4. Keep `IsServerMode()` behavior unchanged.

### Phase 2: Keep process probe only as optional local-dev fallback

1. Gate process probing behind an explicit environment flag:
   - Example: `MASALA_LOCAL_SINGLE_MACHINE_MODE=1`
2. Default behavior in production builds: network probe only.

### Phase 3: Update tests to enforce correct semantics

1. Replace/adjust `internal/app/app_test.go` tests that require `Greet` to fail on missing local process.
2. Add tests for new `CheckServerReachability()` behavior in:
   - reachable server
   - unreachable server
   - endpoint changed then recovered
3. Keep frontend provider tests but mock new reachability API.

### Phase 4: Story 1.11 script alignment

1. In `manual-ui-all`, keep baseline gate (`Connected`) before AC1.
2. Remove assumptions tied to local process presence.
3. For AC2/AC3/AC4, verify network symptom transitions:
   - `Connected -> Reconnecting/Disconnected -> Connected`
4. Keep report debug snapshot on failure.

## Implementation Checklist

1. Backend
   - Introduce `CheckServerReachability` in app bridge.
   - Implement network-based check path.
   - Do not call `probeLocalServerProcess` in default client mode.
2. Frontend
   - Switch `probeBackendConnection` in `ConnectionContext` to new bridge method.
3. Tests
   - Update Go tests and frontend provider tests.
4. Script
   - Keep current manual mode defaults.
   - Ensure AC4 requires post-restart `Connected`.

## Story 1.11: How to Test Actual Flow After Fix

Use real app flow (no `go test`):

1. Rebuild apps:
   - `.\scripts\windows-hard-sync-build-run.ps1`
2. Run manual suite:
   - `.\scripts\story-1-11-windows-resilience-test.ps1`
   - Default mode is `manual-ui-all`
3. Validate expected UI states:
   - Baseline before AC1: client must show `Connected`
   - AC1/AC2/AC3: must show recovery transitions when disruption is introduced
   - AC4: must show `Resume draft` after restart and return to `Connected`
   - AC5: must show expected license tamper symptom
4. Review report output:
   - `docs/manual_testing/story-1-11-resilience-validation-YYYY-MM-DD.md`

## Acceptance Criteria for This Remediation

1. Client no longer shows reconnect overlay at startup solely due to local process mismatch.
2. Connected/disconnected state reflects real server reachability over network/app protocol.
3. Story 1.11 `manual-ui-all` starts from a stable connected baseline and validates actual UX flows consistently.
