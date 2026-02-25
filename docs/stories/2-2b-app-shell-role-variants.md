# Story 2.2B: Shared AppShell with Role Variants

Status: done

## Story

As a Data Entry Operator or Admin,
I want one shared application shell that adapts by role and runtime mode,
so that navigation is cohesive while capabilities remain appropriately restricted.

## Acceptance Criteria

1. A shared `AppShell` structure is implemented and used by both `Server.exe` and `Client.exe` with the same route IDs from Story 2.2A. [Source: docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method); docs/architecture.md#Project Structure]
2. `AdminShell` and `OperatorShell` variants are implemented as role-specific navigation/presentation layers without duplicating route definitions. [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach; docs/ux-design-specification.md#7.1 Consistency Rules]
3. Sidebar/menu visibility follows the approved Role x Module x Action matrix from Story 2.2A. [Source: docs/PRD.md#Authentication & Authorization]
4. Route guards and action guards enforce denied access paths and show clear feedback for unauthorized operations. [Source: docs/tech-spec-epic-1.md#Acceptance Criteria (Authoritative)]
5. Backend remains authoritative for authorization; frontend role checks do not replace server-side enforcement. [Source: docs/tech-spec-epic-1.md#APIs and Interfaces; docs/PRD.md#Authentication & Authorization]
6. Automated tests cover role-specific navigation visibility and unauthorized route/action handling. [Source: docs/tech-spec-epic-1.md#Test Strategy Summary]

## Tasks / Subtasks

- [x] Implement shared route registry derived from Story 2.2A contract (AC: 1)
- [x] Introduce `AppShell` baseline layout and shared navigation composition points (AC: 1)
- [x] Implement `AdminShell` navigation variant (full menu tree) (AC: 2, 3)
- [x] Implement `OperatorShell` navigation variant (simplified/task-focused menu) (AC: 2, 3)
- [x] Implement route and action guard utilities integrated with role data and auth context (AC: 4, 5)
- [x] Add UI feedback states for unauthorized access (AC: 4)
- [x] Add frontend tests for shell visibility and guarded navigation behavior by role (AC: 6)
- [x] Add/extend backend authorization regression tests for denied actions regardless of UI state (AC: 5, 6)

### Review Follow-ups (AI)

- [x] [AI-Review][Med] Source frontend guard role from trusted authenticated context/session binding instead of local/session storage role keys (AC: 4, 5)
- [x] [AI-Review][Med] Add regression test that tampered storage role values do not elevate effective frontend guard role beyond authenticated session context (AC: 6)
- [x] [AI-Review][Low] Replace deprecated Ant Design prop usage (`Space direction`, `Alert message`) with supported API to remove warning noise and reduce upgrade risk (AC: 6)

## Dev Notes

- Do not fork the app into separate admin/client frontends; keep one route system and one component tree.
- Keep role checks centralized to avoid drift across pages/modules.
- Prefer configuration-driven menu composition keyed by route IDs and permissions.
- This story should not redefine permissions; it only implements the approved 2.2A contract.
- Implementation MUST use `docs/navigation-rbac-contract.md` as the canonical source for route IDs, module names, and role-action behavior.

### References

- [Source: docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach]
- [Source: docs/ux-design-specification.md#7.1 Consistency Rules]
- [Source: docs/PRD.md#Authentication & Authorization]
- [Source: docs/tech-spec-epic-1.md#Acceptance Criteria (Authoritative)]
- [Source: docs/navigation-rbac-contract.md]

## Dev Agent Record

### Context Reference

- docs/stories/2-2b-app-shell-role-variants.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-25: Story drafted to implement role-based shell cohesion after navigation/RBAC contract finalization.
- 2026-02-25: Implementation plan: (1) add canonical route registry and centralized guards from navigation RBAC contract, (2) introduce shared AppShell with AdminShell/OperatorShell navigation variants, (3) wire route/action guard handling and unauthorized feedback into App routing flow, (4) add frontend role-visibility/guard tests and backend denied-action regression coverage, (5) run frontend and Go test suites and update story bookkeeping.
- 2026-02-25: Implemented canonical route registry + role matrix guards, integrated shared AppShell with AdminShell/OperatorShell navigation, and wired unauthorized route/action feedback in the app shell.
- 2026-02-25: Executed validation commands: `npm --prefix frontend run lint`, `npm --prefix frontend run test:run`, and `GOCACHE=/tmp/go-build-cache go test ./...` (all passed).
- 2026-02-25: Addressed AI review findings by switching frontend role guard source to trusted backend session role (`GetSessionRole` binding), adding storage-tamper RBAC regression test, and replacing targeted Ant Design deprecated props.
- 2026-02-25: Executed validation commands after review fixes: `npm --prefix frontend run test:run` and `GOCACHE=/tmp/go-build-cache go test ./...` (all passed).

### Completion Notes List

- Implemented centralized route registry (`frontend/src/shell/rbac.ts`) aligned to Story 2.2A route IDs/modules with role-aware route/action guards.
- Added shared `AppShell` baseline and role variants (`AdminShell`, `OperatorShell`) without duplicating route definitions.
- Refactored workspace routing to use canonical registry/guards and show explicit unauthorized feedback for denied paths/actions.
- Added frontend RBAC navigation regression coverage (`AppShellRBAC.test.tsx`) and updated navigation blocker assertions for canonical batch route.
- Strengthened backend authorization authority by denying operator write attempts for master-data mutations (`CreateItemMaster`, `UpdateItemMaster`, `CreatePackagingProfile`) and added regression tests.
- Added Windows validation harness script `scripts/s2-2b-win-test.ps1` for story-specific PASS/FAIL execution on Windows.
- Windows validation execution remains pending on a native Windows run; script is prepared for SM/QA execution.
- Closed all AI review code-change items: trusted session-role binding for frontend guards, regression protection against storage role tampering, and Ant Design deprecation cleanup for touched shell/app components.
- Added explicit shell authorization-boundary documentation clarifying frontend guards are UX-only and backend authorization is authoritative.

### File List

- docs/stories/2-2b-app-shell-role-variants.md
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/context/ConnectionContext.tsx
- frontend/src/shell/rbac.ts
- frontend/src/shell/AppShell.tsx
- frontend/src/shell/RoleShellNavigation.tsx
- frontend/src/shell/AdminShell.tsx
- frontend/src/shell/OperatorShell.tsx
- frontend/src/shell/README.md
- frontend/src/__tests__/AppShellRBAC.test.tsx
- frontend/src/__tests__/AppNavigationBlocker.test.tsx
- internal/app/app.go
- cmd/server/main.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- scripts/s2-2b-win-test.ps1

## Change Log

- 2026-02-25: Initial draft created.
- 2026-02-25: Implemented shared AppShell role variants, centralized RBAC route/action guards, unauthorized feedback UX, and frontend/backend regression tests.
- 2026-02-25: Added story-specific Windows validation script (`scripts/s2-2b-win-test.ps1`) and completed lint/test validation for frontend + Go suites.
- 2026-02-25: Senior Developer Review notes appended.
- 2026-02-25: Addressed Senior Developer Review action items (trusted session-role guard source, tamper regression test, deprecated Ant Design prop cleanup, and shell authorization-boundary documentation).
- 2026-02-25: Story status updated to done after resolving all review-required code changes.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-25

### Outcome

Approve

Justification: Previously requested changes were implemented and validated. Story acceptance criteria and review follow-up action items are complete.

### Summary

Shared AppShell + role variants are implemented and wired into the main app flow. Route IDs align with the 2.2A contract, role-specific navigation is centralized, unauthorized route feedback exists, and backend authorization remains authoritative. Review follow-up items were addressed and verified.

### Key Findings

#### HIGH

- None.

#### MEDIUM

- Resolved: Frontend guard role now resolves from trusted backend session context (`GetSessionRole`) instead of mutable storage keys for effective authorization UX behavior.  
  Evidence: `internal/app/app.go`, `cmd/server/main.go`, `frontend/src/App.tsx`, `frontend/src/shell/rbac.ts`.

#### LOW

- Resolved: Targeted deprecated Ant Design props were updated in touched shell/app components to reduce warning noise and upgrade risk.  
  Evidence: `frontend/src/shell/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/shell/RoleShellNavigation.tsx`.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Shared `AppShell` used across Server.exe and Client.exe with same route IDs from 2.2A | IMPLEMENTED | `frontend/src/shell/AppShell.tsx:24-90`, `frontend/src/App.tsx:335-437`, `cmd/server/main.go:390`, `cmd/client/main.go:16`, `frontend/src/shell/rbac.ts:18-37` |
| AC2 | `AdminShell` and `OperatorShell` role variants without duplicating route definitions | IMPLEMENTED | `frontend/src/shell/AdminShell.tsx:8-10`, `frontend/src/shell/OperatorShell.tsx:8-10`, `frontend/src/shell/RoleShellNavigation.tsx:13-24`, `frontend/src/shell/rbac.ts:131-141` |
| AC3 | Sidebar/menu visibility follows approved role-module-action matrix from 2.2A | IMPLEMENTED | `frontend/src/shell/rbac.ts:44-65`, `frontend/src/shell/rbac.ts:99-109`, `frontend/src/shell/RoleShellNavigation.tsx:14-24`, `docs/navigation-rbac-contract.md:53-86` |
| AC4 | Route and action guards enforce denied access with clear feedback | IMPLEMENTED | `frontend/src/App.tsx:188-191`, `frontend/src/App.tsx:249-251`, `frontend/src/shell/AppShell.tsx:72-79`, `frontend/src/__tests__/AppShellRBAC.test.tsx:93-113` |
| AC5 | Backend remains authoritative for authorization; frontend checks do not replace server enforcement | IMPLEMENTED | `internal/app/inventory/service.go:142-154`, `internal/app/inventory/service.go:181-184`, `internal/app/inventory/service.go:259-262`, `internal/app/inventory/service_test.go:232-252`, `internal/app/inventory/service_test.go:254-276` |
| AC6 | Automated tests cover role-specific navigation visibility and unauthorized route/action handling | IMPLEMENTED | `frontend/src/__tests__/AppShellRBAC.test.tsx:72-120`, `frontend/src/__tests__/AppNavigationBlocker.test.tsx:95-146`, `internal/app/inventory/service_test.go:232-276` |

Summary: 6 of 6 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Implement shared route registry derived from Story 2.2A contract | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/shell/rbac.ts:18-37`, `docs/navigation-rbac-contract.md:13-33` |
| Introduce `AppShell` baseline layout and shared navigation composition points | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/shell/AppShell.tsx:24-90`, `frontend/src/App.tsx:335-346` |
| Implement `AdminShell` navigation variant (full menu tree) | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/shell/AdminShell.tsx:8-10`, `frontend/src/shell/RoleShellNavigation.tsx:29` |
| Implement `OperatorShell` navigation variant (simplified/task-focused menu) | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/shell/OperatorShell.tsx:8-10`, `frontend/src/shell/RoleShellNavigation.tsx:29` |
| Implement route and action guard utilities integrated with role data and auth context | Completed `[x]` | VERIFIED COMPLETE | Guards exist (`frontend/src/App.tsx:249-255`, `frontend/src/shell/rbac.ts:99-109`) and role source is now trusted session context (`internal/app/app.go`, `cmd/server/main.go`). |
| Add UI feedback states for unauthorized access | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/shell/AppShell.tsx:72-79`, `frontend/src/App.tsx:189-190`, `frontend/src/App.tsx:250` |
| Add frontend tests for shell visibility and guarded navigation behavior by role | Completed `[x]` | VERIFIED COMPLETE | `frontend/src/__tests__/AppShellRBAC.test.tsx:72-120` |
| Add/extend backend authorization regression tests for denied actions regardless of UI state | Completed `[x]` | VERIFIED COMPLETE | `internal/app/inventory/service_test.go:232-252`, `internal/app/inventory/service_test.go:254-276` |

Summary: 8 of 8 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Frontend RBAC visibility/route denial tests are present and passing: `frontend/src/__tests__/AppShellRBAC.test.tsx:72-120`.
- Backend denial regression tests for operator write attempts are present and passing: `internal/app/inventory/service_test.go:232-276`.
- Full suites executed in review:
  - `npm --prefix frontend run test:run` -> PASS (27 tests)
  - `GOCACHE=/tmp/go-build-cache go test ./...` -> PASS
- Follow-up gap addressed: frontend test now verifies tampered storage role values do not elevate effective role when trusted session role is operator (`frontend/src/__tests__/AppShellRBAC.test.tsx`).

### Architectural Alignment

- Shared frontend shell strategy aligns with architecture’s identical frontend behavior across server/client binaries: `docs/architecture.md` ("IPC Pattern: Wails Bindings"), `cmd/server/main.go:390`, `cmd/client/main.go:16`.
- No layering violations identified in reviewed changes.

### Security Notes

- Positive: backend authorization remains authoritative for master-data mutation, and operator writes are server-denied regardless of UI state: `internal/app/inventory/service.go:142-154`, `internal/app/inventory/service_test.go:232-276`.
- Resolved: frontend guard role now derives from trusted backend session context (`GetSessionRole`) rather than mutable role storage keys, improving UX-guard trustworthiness while preserving backend authorization authority.

### Best-Practices and References

- Wails docs: https://wails.io/docs/introduction/
- React docs: https://react.dev/
- React Router docs: https://reactrouter.com/en/main
- Vitest docs: https://vitest.dev/guide/
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

### Action Items

**Code Changes Required:**
- [x] [Med] Source frontend guard role from trusted authenticated context/session binding instead of `localStorage/sessionStorage` role keys (Task: route/action guards + auth context) [file: frontend/src/shell/rbac.ts; frontend/src/App.tsx; internal/app/app.go; cmd/server/main.go] (Resolved 2026-02-25)
- [x] [Med] Add regression test that tampered storage role values do not elevate effective frontend guard role beyond authenticated session context [file: frontend/src/__tests__/AppShellRBAC.test.tsx] (Resolved 2026-02-25)
- [x] [Low] Replace deprecated Ant Design prop usage (`Space direction`, `Alert message`) with supported API to remove warning noise and reduce upgrade risk [file: frontend/src/shell/AppShell.tsx; frontend/src/App.tsx; frontend/src/shell/RoleShellNavigation.tsx] (Resolved 2026-02-25)

**Advisory Notes:**
- Note: Backend auth authority is correctly enforced; keep frontend guards as UX-only layer and document this explicitly in shell module comments/README. (Documented in `frontend/src/shell/rbac.ts` and `frontend/src/shell/README.md` on 2026-02-25.)
