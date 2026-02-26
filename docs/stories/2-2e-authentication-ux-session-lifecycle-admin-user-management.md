# Story 2.2E: Authentication UX, Session Lifecycle, and Admin User Management

Status: done

## Story

As a System Admin and authenticated user,
I want a complete authentication lifecycle (login, session handling, logout) and an actionable Admin users screen,
so that access control works end-to-end in the real UI and Admin can provision users safely.

## Acceptance Criteria

1. If no valid session token exists, application entry shows a login screen before shell routes are accessible. [Source: docs/ux-design-specification.md#5.1 Critical User Paths; docs/PRD.md#Authentication & Authorization]
2. Successful login with valid credentials transitions the user to role-appropriate shell routes and applies token-backed protected operations. [Source: docs/architecture.md#4. Zero-Config Networking Pattern (UDP + RPC); docs/tech-spec-epic-1.md#APIs and Interfaces]
3. Session expiration follows the current JWT baseline (24h absolute), and expired sessions force re-authentication with clear user feedback. [Source: internal/infrastructure/auth/token_service.go; docs/sprint-change-proposal-2026-02-26.md]
4. Logout clears session token/state and returns the user to login state. [Source: docs/sprint-change-proposal-2026-02-26.md]
5. Admin-only `System > Users` (`/system/users`) supports create-user flow (`username`, `password`, `role`) backed by existing backend authorization checks. [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths); internal/app/auth/service.go; docs/PRD.md#Data Integrity & Security]
6. Regression coverage validates login success/failure, session-expiry redirect, logout behavior, and admin-only access to `system.users`. [Source: docs/tech-spec-epic-1.md#Post-Review Follow-ups; docs/stories/2-2b-app-shell-role-variants.md#Acceptance Criteria]

## Tasks / Subtasks

- [x] Add authentication entry flow and login screen (AC: 1, 2)
    - [x] Implement login form UI and validation in frontend shell entry path
    - [x] Wire login submission to backend auth service binding
    - [x] Block protected shell routes until authentication succeeds
- [x] Implement session lifecycle handling (AC: 2, 3, 4)
    - [x] Ensure authenticated requests use stored token consistently
    - [x] Detect expired/invalid session during protected operations and route to login with clear message
    - [x] Implement logout action that clears session state and redirects to login
- [x] Implement Admin user-management surface on `system.users` (AC: 5)
    - [x] Replace placeholder content with Admin create-user form
    - [x] Wire create-user action to backend `CreateUser` flow and show actionable success/failure feedback
    - [x] Enforce admin-only route visibility/behavior per RBAC contract
- [x] Add regression tests for auth lifecycle and role boundaries (AC: 6)
    - [x] Frontend tests for login success/failure and route-gating behavior
    - [x] Frontend tests for logout and expired-session re-authentication path
    - [x] Frontend tests confirming non-admin access denial for `system.users`
    - [x] Backend tests to preserve `CreateUser` permission and validation behavior

### Review Follow-ups (AI)

- [x] [AI-Review][Low] Replace deprecated Ant Design `Space direction` prop with `orientation` in auth loading screen (`frontend/src/App.tsx:643`).
- [x] [AI-Review][Low] Replace deprecated Ant Design `Space direction` prop with `orientation` in auth login screen (`frontend/src/App.tsx:656`).

## Windows Validation (WSL2 -> Windows Required)

- Script Path: `scripts/s2-2e-win-test.ps1`
- Minimum Coverage:
    - Build the relevant application target(s)
    - Launch and validate runtime behavior for this story
    - Return non-zero exit code on failure
    - Print explicit PASS/FAIL summary

## Dev Notes

- Reuse existing backend auth capabilities (`Login`, `CreateUser`, token validation) instead of introducing parallel auth surfaces. [Source: internal/app/auth/service.go; internal/app/auth/middleware.go]
- Preserve route identity and role constraints from navigation contract (`system.users` admin-only, shared shell route model). [Source: docs/navigation-rbac-contract.md]
- Frontend auth checks remain UX gates only; backend authorization remains security authority. [Source: docs/architecture.md#0. Cohesive App Contract; docs/architecture.md#4. Zero-Config Networking Pattern (UDP + RPC)]
- Keep session lifecycle consistent with current JWT behavior (24h absolute) unless explicitly re-scoped in architecture/product decisions. [Source: internal/infrastructure/auth/token_service.go]
- Align implementation with existing shell/RBAC module structure and avoid route/module naming drift. [Source: frontend/src/shell/rbac.ts; docs/stories/2-2d-shell-ux-conformance.md]

### Project Structure Notes

- Primary frontend touch points are expected in:
    - `frontend/src/App.tsx`
    - `frontend/src/shell/`
    - `frontend/src/__tests__/`
- Backend binding surface already includes auth/admin services in server bootstrap; changes should remain additive and backwards-compatible with current startup wiring.
  [Source: cmd/server/main.go]

### References

- [Source: docs/PRD.md#Authentication & Authorization]
- [Source: docs/PRD.md#Data Integrity & Security]
- [Source: docs/architecture.md#4. Zero-Config Networking Pattern (UDP + RPC)]
- [Source: docs/navigation-rbac-contract.md]
- [Source: docs/tech-spec-epic-1.md#APIs and Interfaces]
- [Source: docs/sprint-change-proposal-2026-02-26.md]
- [Source: internal/app/auth/service.go]
- [Source: internal/infrastructure/auth/token_service.go]

## Dev Agent Record

### Context Reference

- docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.context.xml

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-26: Story drafted from approved Correct Course proposal focusing on auth lifecycle and admin user-management closure.
- 2026-02-26: Planned implementation in four passes (auth entry gate, session lifecycle hooks, admin users surface, regression + validation) and executed end-to-end with backend/frontend updates.
- 2026-02-26: Validation completed with `GOCACHE=/tmp/go-build-cache go test ./...`, `npm --prefix frontend run test:run`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build`.

### Completion Notes List

- Added backend app bindings for `Login` and `CreateUser`, wired server bootstrap to expose auth service through `App` for frontend lifecycle flows.
- Implemented login gate before shell access, persisted token/expiry, forced re-authentication on expired/unauthorized sessions, and added explicit logout action.
- Replaced `system.users` placeholder with admin create-user form wired to backend `CreateUser` authorization/validation path.
- Added shared frontend auth service utilities and session-expired event propagation from protected master-data API calls.
- Expanded regression coverage for auth lifecycle (login success/failure, logout, session-expiry re-auth) and updated existing app tests to include authenticated session setup.
- Added story-specific Windows validation script `scripts/s2-2e-win-test.ps1` with PASS/FAIL reporting and optional test modes.

### File List

- cmd/server/main.go
- internal/app/app.go
- internal/app/auth/service_test.go
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/services/authApi.ts
- frontend/src/services/masterDataApi.ts
- frontend/src/shell/rbac.ts
- frontend/src/shell/AppShell.tsx
- frontend/src/shell/AdminShell.tsx
- frontend/src/shell/OperatorShell.tsx
- frontend/src/shell/RoleShellNavigation.tsx
- frontend/src/components/forms/AdminUserForm.tsx
- frontend/src/__tests__/AppAuthLifecycle.test.tsx
- frontend/src/__tests__/AppNavigationBlocker.test.tsx
- frontend/src/__tests__/AppLicenseStatus.test.tsx
- frontend/src/__tests__/AppRecoveryMode.test.tsx
- frontend/src/components/forms/__tests__/PackagingProfileForm.test.tsx
- scripts/s2-2e-win-test.ps1
- docs/sprint-status.yaml
- docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md

### Windows Validation Script

`scripts/s2-2e-win-test.ps1`

### Windows Validation Evidence

- Command:
- Result:
- Notes:

## Change Log

- 2026-02-26: Initial draft created.
- 2026-02-26: Implemented authentication login gate, session lifecycle handling, admin users create flow, and regression coverage for Story 2.2E.
- 2026-02-26: Story moved to review after backend/frontend tests, lint, and production build validation passed.
- 2026-02-26: Senior Developer Review notes appended.
- 2026-02-26: Closed AI review follow-ups for deprecated Ant Design `Space direction` usage in auth gate views.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-26

### Outcome

Approve - All acceptance criteria are implemented, all checked tasks are verified in code/tests, and no High/Medium severity issues were found.

### Summary

Implementation satisfies the end-to-end authentication lifecycle and admin user-management scope. Session/token handling is integrated across frontend service calls and backend auth enforcement, with regression coverage for login, logout, expiry redirect, and admin-only route access.

### Key Findings

#### HIGH

- None.

#### MEDIUM

- None.

#### LOW

- `frontend/src/App.tsx` uses deprecated Ant Design `Space` prop `direction` in the auth gate, producing warning noise during test runs (`frontend/src/App.tsx:643`, `frontend/src/App.tsx:656`).

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | No token -> show login screen before shell routes | IMPLEMENTED | `frontend/src/App.tsx:255-263`, `frontend/src/App.tsx:652-687`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:85-95` |
| AC2 | Valid login -> role-appropriate shell + token-backed protected operations | IMPLEMENTED | `frontend/src/App.tsx:329-339`, `frontend/src/shell/rbac.ts:93-100`, `frontend/src/shell/rbac.ts:130-132`, `frontend/src/services/masterDataApi.ts:103-108`, `frontend/src/services/masterDataApi.ts:120-122`, `frontend/src/services/authApi.ts:149-160`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:100-123` |
| AC3 | 24h JWT expiry baseline + expired sessions force re-auth with clear feedback | IMPLEMENTED | `internal/infrastructure/auth/token_service.go:31-33`, `frontend/src/App.tsx:264-272`, `frontend/src/App.tsx:348-353`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:166-188` |
| AC4 | Logout clears session and returns user to login | IMPLEMENTED | `frontend/src/App.tsx:308-317`, `frontend/src/App.tsx:635-637`, `frontend/src/shell/RoleShellNavigation.tsx:105-107`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:146-164` |
| AC5 | Admin-only `/system/users` create-user flow backed by backend auth checks | IMPLEMENTED | `frontend/src/shell/rbac.ts:34`, `frontend/src/shell/rbac.ts:106-112`, `frontend/src/App.tsx:601-602`, `frontend/src/components/forms/AdminUserForm.tsx:21-33`, `frontend/src/services/authApi.ts:149-160`, `internal/app/app.go:389-402`, `internal/app/auth/service.go:59-63`, `internal/app/auth/service.go:65-83`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105-126`, `internal/app/auth/service_test.go:41-61` |
| AC6 | Regression coverage for login success/failure, expiry redirect, logout, admin-only access | IMPLEMENTED | `frontend/src/__tests__/AppAuthLifecycle.test.tsx:100-143`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:146-188`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105-126`, `internal/app/auth/service_test.go:29-62`, `internal/app/auth/service_test.go:64-88` |

Summary: 6 of 6 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Add authentication entry flow and login screen (AC: 1, 2) | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:255-263`, `frontend/src/App.tsx:652-687`, `frontend/src/App.tsx:329-339` |
| Implement login form UI and validation in frontend shell entry path | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:664-678`, `frontend/src/App.tsx:320-324` |
| Wire login submission to backend auth service binding | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:329-333`, `frontend/src/services/authApi.ts:133-139`, `internal/app/app.go:375-387`, `cmd/server/main.go:585` |
| Block protected shell routes until authentication succeeds | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:362-364`, `frontend/src/App.tsx:639-687` |
| Implement session lifecycle handling (AC: 2, 3, 4) | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:264-272`, `frontend/src/App.tsx:308-317`, `frontend/src/App.tsx:348-357`, `frontend/src/services/authApi.ts:79-99` |
| Ensure authenticated requests use stored token consistently | [x] Complete | VERIFIED COMPLETE | `frontend/src/services/authApi.ts:42-57`, `frontend/src/services/masterDataApi.ts:103-108`, `frontend/src/services/masterDataApi.ts:120-122`, `frontend/src/services/masterDataApi.ts:137-139`, `frontend/src/services/authApi.ts:156` |
| Detect expired/invalid session during protected operations and route to login with clear message | [x] Complete | VERIFIED COMPLETE | `frontend/src/services/masterDataApi.ts:89-95`, `frontend/src/services/authApi.ts:162-164`, `frontend/src/App.tsx:348-353`, `frontend/src/App.tsx:308-317` |
| Implement logout action that clears session state and redirects to login | [x] Complete | VERIFIED COMPLETE | `frontend/src/shell/RoleShellNavigation.tsx:105-107`, `frontend/src/App.tsx:635-637`, `frontend/src/App.tsx:308-317` |
| Implement Admin user-management surface on `system.users` (AC: 5) | [x] Complete | VERIFIED COMPLETE | `frontend/src/shell/rbac.ts:34`, `frontend/src/App.tsx:601-602`, `frontend/src/components/forms/AdminUserForm.tsx:35-103` |
| Replace placeholder content with Admin create-user form | [x] Complete | VERIFIED COMPLETE | `frontend/src/App.tsx:601-603`, `frontend/src/components/forms/AdminUserForm.tsx:43-101` |
| Wire create-user action to backend `CreateUser` flow and show actionable success/failure feedback | [x] Complete | VERIFIED COMPLETE | `frontend/src/components/forms/AdminUserForm.tsx:21-33`, `frontend/src/services/authApi.ts:149-166`, `internal/app/app.go:389-402` |
| Enforce admin-only route visibility/behavior per RBAC contract | [x] Complete | VERIFIED COMPLETE | `frontend/src/shell/rbac.ts:34`, `frontend/src/shell/rbac.ts:106-112`, `frontend/src/shell/rbac.ts:134-145`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105-126` |
| Add regression tests for auth lifecycle and role boundaries (AC: 6) | [x] Complete | VERIFIED COMPLETE | `frontend/src/__tests__/AppAuthLifecycle.test.tsx:43-189`, `frontend/src/__tests__/AppShellRBAC.test.tsx:42-157`, `internal/app/auth/service_test.go:29-89` |
| Frontend tests for login success/failure and route-gating behavior | [x] Complete | VERIFIED COMPLETE | `frontend/src/__tests__/AppAuthLifecycle.test.tsx:100-143`, `frontend/src/__tests__/AppAuthLifecycle.test.tsx:85-98`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105-126` |
| Frontend tests for logout and expired-session re-authentication path | [x] Complete | VERIFIED COMPLETE | `frontend/src/__tests__/AppAuthLifecycle.test.tsx:146-188` |
| Frontend tests confirming non-admin access denial for `system.users` | [x] Complete | VERIFIED COMPLETE | `frontend/src/__tests__/AppShellRBAC.test.tsx:105-126` |
| Backend tests to preserve `CreateUser` permission and validation behavior | [x] Complete | VERIFIED COMPLETE | `internal/app/auth/service_test.go:29-62`, `internal/app/auth/service_test.go:64-88` |

Summary: 17 of 17 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Executed and passing:
  - `GOCACHE=/tmp/go-build-cache go test ./internal/app/auth ./internal/infrastructure/auth`
  - `npm --prefix frontend run test:run -- src/__tests__/AppAuthLifecycle.test.tsx src/__tests__/AppShellRBAC.test.tsx`
- Covered scenarios: login success/failure, no-token gate, logout, forced re-auth on session-expired event, admin route visibility, operator denial, backend `CreateUser` permission and duplicate validation.
- Gap: No direct unit/integration test currently asserts that a real protected API auth failure path (not a synthetic event dispatch) emits `masala:auth-session-expired` end-to-end.

### Architectural Alignment

- Aligns with backend-authoritative auth model (`internal/app/auth/service.go:59-63`, `internal/app/auth/middleware.go:17-44`).
- Preserves canonical route identity and RBAC constraints for `system.users` (`frontend/src/shell/rbac.ts:34`, `docs/navigation-rbac-contract.md`).
- Uses existing service contracts (`Login`, `CreateUser`, `GetSessionRole`) rather than introducing parallel auth channels (`internal/app/app.go:375-402`, `cmd/server/main.go:585-592`).

### Security Notes

- Backend permission enforcement for user provisioning is intact; operator/no-token create-user attempts are denied (`internal/app/auth/service_test.go:41-53`).
- Protected master-data operations attach auth token and trigger re-authentication flow on auth failures (`frontend/src/services/masterDataApi.ts:89-95`, `frontend/src/services/masterDataApi.ts:103-108`).

### Best-Practices and References

- OWASP Authentication Cheat Sheet (credential handling, generic auth failures, brute-force controls): https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet (session expiration and invalidation expectations): https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- `golang-jwt/jwt` v5 package docs and token validation behavior: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- React Router docs (route state/navigation behavior used by auth gate and role routing): https://reactrouter.com/6.30.3/start/overview

### Action Items

**Code Changes Required:**

- [x] [Low] Replace deprecated Ant Design `Space` prop usage (`direction`) with supported `orientation` in auth gate views [file: frontend/src/App.tsx:643] (Resolved 2026-02-26)
- [x] [Low] Replace deprecated Ant Design `Space` prop usage (`direction`) with supported `orientation` in auth gate views [file: frontend/src/App.tsx:656] (Resolved 2026-02-26)

**Advisory Notes:**

- Note: Add one integration-style test that triggers a real protected API unauthorized response and asserts automatic login redirect via `masala:auth-session-expired`.
