# Story 2.2A: Navigation and RBAC Contract

Status: done

## Story

As a Product and Engineering team,
I want a single, approved navigation contract and role-permission matrix for the shared app,
so that all upcoming stories build on one cohesive structure across `Server.exe` and `Client.exe`.

## Acceptance Criteria

1. A canonical route map is defined and approved as the single source of truth for module navigation, including stable route IDs and paths. [Source: docs/ux-design-specification.md#7.1 Consistency Rules; docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
2. Module naming is standardized and mapped to route IDs for: Dashboard, Masters, Procurement, Production, Packing, Sales, Reports, and System. [Source: docs/ux-design-specification.md#Inspiration Sources & Key UX Patterns; docs/epics.md#Proposed Epics Structure]
3. A Role x Module x Action matrix is defined for at least `Admin` and `Data Entry Operator`, covering minimum actions (`view`, `create`, `edit`, `delete`, `approve`, `view_valuation`, `manage_system`). [Source: docs/PRD.md#Authentication & Authorization; docs/tech-spec-epic-1.md#Acceptance Criteria (Authoritative)]
4. The RBAC matrix explicitly distinguishes frontend visibility guidance from backend enforcement rules and identifies server-side authority as canonical. [Source: docs/PRD.md#Authentication & Authorization; docs/tech-spec-epic-1.md#APIs and Interfaces]
5. Contract artifacts are stored in repository documentation and referenced by subsequent implementation stories (2.2B and later). [Source: docs/architecture.md#Project Structure]

## Tasks / Subtasks

- [x] Define and document canonical route map with stable IDs and paths (AC: 1, 2)
- [x] Define module naming contract and route ownership table (AC: 2)
- [x] Create Role x Module x Action permission matrix for Admin and Data Entry Operator (AC: 3)
- [x] Mark each permission as `UI-visible`, `UI-hidden`, and `backend-allowed`/`backend-denied` to avoid ambiguity (AC: 4)
- [x] Add references from this contract to upcoming story files (`2.2B`, `2.2C`, `2.2`, `2.3`, `2.4`) (AC: 5)
- [x] Review and obtain explicit stakeholder sign-off on contract artifacts before implementation starts (AC: 1-5)

## Dev Notes

- This is a contract-first story. No feature delivery should bypass this baseline once approved.
- Route IDs must remain stable to avoid breaking tests and sidebar-role mapping.
- Backend authorization remains the source of truth; frontend role adaptation is a usability layer only.
- Keep this story narrowly focused on agreement artifacts to reduce churn before shell implementation.

### References

- [Source: docs/PRD.md#On-Premise Deployment & Infrastructure]
- [Source: docs/PRD.md#Authentication & Authorization]
- [Source: docs/ux-design-specification.md#7.1 Consistency Rules]
- [Source: docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- [Source: docs/epics.md#Proposed Epics Structure]
- [Source: docs/tech-spec-epic-1.md#Acceptance Criteria (Authoritative)]

## Dev Agent Record

### Context Reference

- docs/stories/2-2a-navigation-rbac-contract.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-25: Story drafted to establish navigation and RBAC contract baseline before additional Epic 2 implementation.
- 2026-02-25: Implementation plan for this story:
  - Create canonical navigation + RBAC contract artifact in repository docs.
  - Include route map, module ownership, role-action matrix, and backend-authority rules.
  - Update downstream references in 2.2B, 2.2C, and Epic 2 stories (2.2/2.3/2.4).
  - Add story-specific Windows validation script and run regression checks.
  - Request explicit stakeholder sign-off before marking story Ready for Review.

### Completion Notes List

- Created canonical contract artifact at `docs/navigation-rbac-contract.md` with stable route IDs/paths, module naming contract, route ownership table, and role x module x action matrix for Admin and Data Entry Operator.
- Updated RBAC policy per stakeholder direction: `Data Entry Operator` is read-only in `Masters` (`create` and `edit` denied).
- Explicitly separated frontend visibility guidance from backend allow/deny authority and documented backend as canonical authorization source.
- Added downstream references to contract in:
  - `docs/stories/2-2b-app-shell-role-variants.md`
  - `docs/stories/2-2c-docs-alignment-cohesive-app.md`
  - `docs/epics.md` (stories 2.2, 2.3, 2.4)
- Added Windows validation script `scripts/s2-2a-win-test.ps1` with PASS/FAIL output and non-zero failure exit behavior.
- Stakeholder sign-off confirmed on 2026-02-25; contract marked approved.
- Validation run results:
  - `GOCACHE=/tmp/go-build-cache go test ./...` -> PASS
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/s2-2a-win-test.ps1 -Mode docs-only` -> PASS
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/s2-2a-win-test.ps1 -Mode go-test` -> PASS
  - `cd frontend && npm run test:run` -> PASS
  - `cd frontend && npm run lint` -> PASS
  - `cd frontend && npm run build` -> PASS

### Windows Validation Evidence

- Script Path: `scripts/s2-2a-win-test.ps1`
- Verified behaviors:
  - Contract artifact presence and required section checks.
  - Downstream reference checks for 2.2B, 2.2C, and Epic 2 stories.
  - PASS/FAIL summary output and non-zero exit code on failures.
- Execution commands and outcomes:
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/s2-2a-win-test.ps1 -Mode docs-only` -> PASS
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/s2-2a-win-test.ps1 -Mode go-test` -> PASS

### File List

- docs/stories/2-2a-navigation-rbac-contract.md
- docs/navigation-rbac-contract.md (NEW)
- docs/stories/2-2b-app-shell-role-variants.md (MODIFIED)
- docs/stories/2-2c-docs-alignment-cohesive-app.md (MODIFIED)
- docs/epics.md (MODIFIED)
- docs/sprint-status.yaml (MODIFIED)
- scripts/s2-2a-win-test.ps1 (NEW)

## Change Log

- 2026-02-25: Initial draft created.
- 2026-02-25: Implemented navigation/RBAC contract artifact, linked downstream references, added story-specific Windows validation script, and executed regression/validation checks (pending stakeholder sign-off).
- 2026-02-25: Adjusted contract matrix so Data Entry Operator cannot create/edit in Masters (read-only access).
- 2026-02-25: Stakeholder approved Story 2.2A contract; story status updated to review.
- 2026-02-25: Senior Developer Review notes appended.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-25

### Outcome

Approve

Justification: All acceptance criteria are fully implemented with direct evidence in repository documentation, all completed tasks are verifiably done, and no material quality/security/architecture issues were identified for this contract-focused story.

### Summary

Story 2.2A is complete as a contract-first documentation deliverable. The canonical route map, module ownership mapping, role-action matrix, backend authority rules, downstream references, and sign-off evidence are present and consistent.

### Key Findings

#### HIGH

- None.

#### MEDIUM

- None.

#### LOW

- None.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Canonical route map with stable IDs/paths is defined and approved. | IMPLEMENTED | `docs/navigation-rbac-contract.md:11`, `docs/navigation-rbac-contract.md:13`, `docs/navigation-rbac-contract.md:34`, `docs/navigation-rbac-contract.md:101` |
| AC2 | Module naming standardized and mapped for Dashboard, Masters, Procurement, Production, Packing, Sales, Reports, System. | IMPLEMENTED | `docs/navigation-rbac-contract.md:40`, `docs/navigation-rbac-contract.md:42`, `docs/navigation-rbac-contract.md:44`, `docs/navigation-rbac-contract.md:51` |
| AC3 | Role x Module x Action matrix for Admin and Data Entry Operator includes required actions. | IMPLEMENTED | `docs/navigation-rbac-contract.md:53`, `docs/navigation-rbac-contract.md:61`, `docs/navigation-rbac-contract.md:63`, `docs/navigation-rbac-contract.md:74`, `docs/navigation-rbac-contract.md:76` |
| AC4 | Matrix distinguishes frontend visibility vs backend enforcement and states server authority is canonical. | IMPLEMENTED | `docs/navigation-rbac-contract.md:55`, `docs/navigation-rbac-contract.md:87`, `docs/navigation-rbac-contract.md:90`, `docs/navigation-rbac-contract.md:92` |
| AC5 | Contract artifacts stored in docs and referenced by subsequent stories. | IMPLEMENTED | `docs/navigation-rbac-contract.md:94`, `docs/navigation-rbac-contract.md:97`, `docs/navigation-rbac-contract.md:99`, `docs/stories/2-2b-app-shell-role-variants.md:37`, `docs/stories/2-2c-docs-alignment-cohesive-app.md:34`, `docs/epics.md:274` |

Summary: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Define canonical route map with stable IDs/paths | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:21`, `docs/navigation-rbac-contract.md:11`, `docs/navigation-rbac-contract.md:13` |
| Define module naming contract and route ownership table | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:22`, `docs/navigation-rbac-contract.md:40`, `docs/navigation-rbac-contract.md:42` |
| Create Role x Module x Action matrix for Admin and Data Entry Operator | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:23`, `docs/navigation-rbac-contract.md:53`, `docs/navigation-rbac-contract.md:61`, `docs/navigation-rbac-contract.md:74` |
| Mark permissions as UI-visible/UI-hidden and backend-allowed/backend-denied | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:24`, `docs/navigation-rbac-contract.md:55`, `docs/navigation-rbac-contract.md:65`, `docs/navigation-rbac-contract.md:78` |
| Add downstream references (`2.2B`, `2.2C`, `2.2`, `2.3`, `2.4`) | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:25`, `docs/navigation-rbac-contract.md:94`, `docs/stories/2-2b-app-shell-role-variants.md:47`, `docs/stories/2-2c-docs-alignment-cohesive-app.md:44`, `docs/epics.md:274`, `docs/epics.md:290`, `docs/epics.md:306` |
| Obtain explicit stakeholder sign-off | Completed `[x]` | VERIFIED COMPLETE | `docs/stories/2-2a-navigation-rbac-contract.md:26`, `docs/navigation-rbac-contract.md:101`, `docs/navigation-rbac-contract.md:103`, `docs/navigation-rbac-contract.md:105` |

Summary: 6 of 6 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Story-specific validation script exists and verifies required contract sections and downstream references: `scripts/s2-2a-win-test.ps1:39`, `scripts/s2-2a-win-test.ps1:48`.
- Independent execution in this review: `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/s2-2a-win-test.ps1 -Mode docs-only` -> PASS.
- For this documentation contract story, evidence and docs-validation checks are sufficient; no additional runtime feature tests were required to validate AC completion.

### Architectural Alignment

- Implementation aligns with architecture constraints for shared frontend contract and backend-authoritative authorization model (`docs/architecture.md:92`, `docs/architecture.md:137`).
- No architecture-layering or authority-model violations found in reviewed artifacts.

### Security Notes

- Contract explicitly avoids “security by hidden UI” and defines backend as canonical authority (`docs/navigation-rbac-contract.md:89`, `docs/navigation-rbac-contract.md:91`), aligned with authorization best practices.
- No security regressions identified in reviewed changes.

### Best-Practices and References

- OWASP Authorization Cheat Sheet (server-side enforcement, deny-by-default): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- React Router documentation (route-level patterns/guards): https://reactrouter.com/

### Action Items

**Code Changes Required:**
- None.

**Advisory Notes:**
- Note: Keep the route ID set immutable as 2.2B+ implementation begins to preserve test and shell contract stability.
