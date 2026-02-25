# Story 2.2B: Shared AppShell with Role Variants

Status: drafted

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

- [ ] Implement shared route registry derived from Story 2.2A contract (AC: 1)
- [ ] Introduce `AppShell` baseline layout and shared navigation composition points (AC: 1)
- [ ] Implement `AdminShell` navigation variant (full menu tree) (AC: 2, 3)
- [ ] Implement `OperatorShell` navigation variant (simplified/task-focused menu) (AC: 2, 3)
- [ ] Implement route and action guard utilities integrated with role data and auth context (AC: 4, 5)
- [ ] Add UI feedback states for unauthorized access (AC: 4)
- [ ] Add frontend tests for shell visibility and guarded navigation behavior by role (AC: 6)
- [ ] Add/extend backend authorization regression tests for denied actions regardless of UI state (AC: 5, 6)

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

### Completion Notes List

- Pending implementation.

### File List

- docs/stories/2-2b-app-shell-role-variants.md

## Change Log

- 2026-02-25: Initial draft created.
