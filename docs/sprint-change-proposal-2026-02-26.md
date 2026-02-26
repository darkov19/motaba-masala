# Sprint Change Proposal - Authentication UX and Session Lifecycle Completion

Date: 2026-02-26
Author: darko (facilitated via Correct Course workflow)
Change Trigger: Authentication UX and lifecycle coverage gap (login/logout/admin user management)
Execution Mode: Incremental

## 1. Issue Summary

### Problem Statement

The project has backend authentication and RBAC foundations, but user-facing authentication lifecycle behavior is incomplete and under-specified in implementation artifacts. Specifically:

- No implemented login screen/auth gate before shell workspace
- No implemented logout flow
- `system.users` route exists but is still placeholder content (no Admin user-creation UI)
- Session duration exists in code (24h JWT) but is not explicitly captured as product behavior in planning docs

### Discovery Context

The gap surfaced during implementation-phase review when validating where login/logout/new-user behavior is planned and implemented.

### Evidence

- Story foundation exists: `docs/stories/1-4-local-authentication-rbac.md`
- API/backend support exists: `auth.Login`, `admin.CreateUser`, token generation
- Current session token TTL in code: 24h (`internal/infrastructure/auth/token_service.go`)
- Frontend shell currently launches without explicit login screen flow in `frontend/src/App.tsx`
- `system.users` route is defined but unresolved to functional UI (`frontend/src/shell/rbac.ts` + placeholder render path in `App.tsx`)

## 2. Impact Analysis

### Epic Impact

- Epic 2 remains viable.
- Current Epic 2 sequence needs one focused story to close auth UX/session lifecycle gaps before broader feature expansion.

### Story Impact

- Keep completed stories unchanged (`1.4`, `2.1`, `2.2A`, `2.2B`, `2.2C`) as historical record.
- Add new story in Epic 2:
  - **Story 2.2E: Authentication UX, Session Lifecycle, and Admin User Management**
- Sequence recommendation:
  - Finish `2.2D` review closure, then execute `2.2E`, then continue `2.3+`.

### Artifact Conflicts

- **PRD:** Requires Admin user management and role-based access, but auth lifecycle UX is not explicit enough.
- **Architecture:** Auth/token pattern is documented, but session lifecycle contract (TTL/expiry/logout UX expectations) is not explicit.
- **UX Specification:** User journeys mention login but do not define enforceable login/expiry/logout behavior and admin user-management surface acceptance.
- **Navigation/RBAC Contract:** `system.users` route is contractual but currently placeholder in implementation.

### Technical Impact

Affected areas likely include:

- `frontend/src/App.tsx` (auth gate, login/logout routing behavior)
- `frontend/src/shell/*` (logout controls and system/users navigation completion)
- Wails bindings usage for auth/admin operations
- Frontend tests for lifecycle and role-based behavior

## 3. Recommended Approach

### Selected Path

**Option 1: Direct Adjustment** (add/execute a targeted Epic 2 story).

### Rationale

- Backend primitives are already present.
- No rollback required.
- No MVP scope reduction required.
- Fastest path to align product requirements, UX, architecture, and implementation.

### Estimate and Risk

- Effort: **Medium**
- Risk: **Low-Medium**
- Timeline impact: **+3 to 5 working days** (story drafting, implementation, test hardening, validation)

## 4. Detailed Change Proposals

### 4.1 Story / Planning Change

Artifact: `docs/epics.md`, `docs/sprint-status.yaml`

OLD:

- No dedicated story that closes login/logout/admin user-management UI lifecycle end-to-end.

NEW:

- Add **Story 2.2E: Authentication UX, Session Lifecycle, and Admin User Management** with acceptance criteria for:
  - Login screen and auth gate before shell routes
  - Logout action returns to login and clears session state
  - Admin `system.users` surface supports create-user flow
  - Session-expired behavior is user-visible and requires re-login
  - Regression tests cover lifecycle and role visibility

Rationale:

- Creates clear ownership and acceptance gates without rewriting completed history.

### 4.2 PRD Clarification

Artifact: `docs/PRD.md`

OLD:

- Role-based RBAC and user management intent exist, but lifecycle UX behavior is implicit.

NEW:

- Add concise clarifications:
  - Login UX is required before entering shell when no valid session exists.
  - Session UX is token-gated for protected operations/routes.
  - Logout UX must end session and return to login.
  - Session TTL baseline: **24h absolute from login** (MVP baseline).
  - Admin UI must expose user creation for role-bound user provisioning.

Rationale:

- Makes expected runtime behavior explicit and testable.

### 4.3 Architecture Clarification

Artifact: `docs/architecture.md`

OLD:

- Authentication/token usage is described at a high level.

NEW:

- Add explicit lifecycle contract:
  - JWT TTL baseline: **24h absolute**
  - Expired token behavior requires re-authentication
  - Frontend auth gate is required for protected shell entry
  - Logout is session-state termination (token removal + auth reset)
  - Backend remains security authority for authorization

Rationale:

- Aligns architecture language with implemented token model and expected UX behavior.

### 4.4 UX Specification Clarification

Artifact: `docs/ux-design-specification.md`

OLD:

- Critical journeys start from Login but acceptance behavior is not explicit for expiry/logout/admin-user-management surface.

NEW:

- Add auth UX conformance criteria:
  - No valid session -> login entry first
  - Expired session -> clear redirect/message to login
  - Logout affordance in shell returns to login
  - Admin route `System > Users` is actionable (not placeholder)

Rationale:

- Converts journey intent into verifiable UX acceptance checks.

### 4.5 Code and Test Scope

Implementation targets:

- Frontend login route/screen and auth gate
- Logout action and token/session clearing behavior
- `system.users` Admin create-user UI
- Binding integration to existing backend auth/admin calls
- Regression tests:
  - login success/failure
  - session-expiry redirect
  - logout redirect/session clear
  - admin-only users route behavior

Rationale:

- Ensures documentation updates map to executable, test-backed behavior.

## 5. Implementation Handoff

### Scope Classification

**Moderate**

### Routing

- **Primary:** Product Owner / Scrum Master
  - Draft/prioritize Story 2.2E and update sprint sequencing
- **Secondary:** Development Team
  - Implement auth lifecycle UI and admin user-management surface
- **Review Support:** UX + Architect
  - Validate lifecycle conformance and architecture alignment

### Success Criteria

- Story 2.2E drafted and tracked
- Login/logout/session-expiry behaviors implemented and validated
- Admin users management surface is functional
- Documentation and tests align with implemented behavior

## Proposal Decision Record

- Trigger: Auth lifecycle and admin-user-management UX coverage gap
- Selected Strategy: Option 1 - Direct Adjustment
- Delivery Mechanism: Add and execute Story 2.2E before continuing major Epic 2+ feature rollout
- User Approval: yes (2026-02-26)
- Approved Scope Classification: Moderate
- Approved Handoff Route:
  - Product Owner / Scrum Master
  - Development Team
  - UX + Architect review
