# Story 2.2C: Cohesive App Documentation Alignment

Status: done

## Story

As a project stakeholder,
I want PRD, UX, and Architecture documents aligned to the implemented cohesive app model,
so that planning, development, and reviews reference one consistent product definition.

## Acceptance Criteria

1. PRD wording is updated to reflect distributed Wails desktop deployment (`Server.exe` + `Client.exe`) and removes conflicting browser-only phrasing where applicable. [Source: docs/PRD.md#Project Classification; docs/PRD.md#On-Premise Deployment & Infrastructure]
2. UX specification explicitly states one shared app shell with role-based variants (Admin vs Data Entry) using shared route IDs. [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach; docs/ux-design-specification.md#7.1 Consistency Rules]
3. Architecture documentation includes a concise "Cohesive App Contract" section summarizing route ownership, role shell strategy, and backend-authorization authority. [Source: docs/architecture.md#Implementation Patterns]
4. Epics/story planning references are updated where necessary to point to the new contract-first sequence (`2.2A` -> `2.2B` -> `2.2C` -> `2.2`). [Source: docs/epics.md#Proposed Epics Structure; docs/sprint-status.yaml]
5. Updated documents are internally consistent and cross-linked, with no contradictory deployment or navigation model statements remaining in the edited sections. [Source: docs/PRD.md; docs/ux-design-specification.md; docs/architecture.md]

## Tasks / Subtasks

- [x] Update PRD deployment/classification sections to match desktop distributed reality (AC: 1)
- [x] Update UX sections for shared app shell and role-variant navigation model (AC: 2)
- [x] Add concise cohesive app contract section in architecture doc (AC: 3)
- [x] Add/adjust epic-story references for sequencing and dependency clarity (AC: 4)
- [x] Perform consistency pass across edited sections and fix conflicting statements (AC: 5)
- [x] Capture a brief changelog summary documenting exactly what was aligned and why (AC: 1-5)

## Dev Notes

- This story should follow 2.2A approval and 2.2B implementation to avoid speculative documentation.
- Focus on factual alignment, not broad document rewrites.
- Preserve existing accepted business scope while correcting architecture/deployment language mismatches.
- Keep changes surgical and traceable to approved contracts and implemented behavior.
- Use `docs/navigation-rbac-contract.md` as the canonical source when aligning route IDs, module naming, and role authorization wording.

### References

- [Source: docs/PRD.md#Project Classification]
- [Source: docs/PRD.md#On-Premise Deployment & Infrastructure]
- [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach]
- [Source: docs/ux-design-specification.md#7.1 Consistency Rules]
- [Source: docs/architecture.md#Implementation Patterns]
- [Source: docs/epics.md#Proposed Epics Structure]
- [Source: docs/navigation-rbac-contract.md]

## Dev Agent Record

### Context Reference

- docs/stories/2-2c-docs-alignment-cohesive-app.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-25: Story drafted to align core planning/design/architecture artifacts after shell and contract decisions.
- 2026-02-25: Plan - align PRD deployment/classification wording to distributed Wails desktop model; update UX to explicit shared shell + role variants + shared route IDs; add concise architecture "Cohesive App Contract"; update Epic 2 sequencing references to 2.2A -> 2.2B -> 2.2C -> 2.2; run contradiction scan and repo regression tests before checking off tasks.

### Completion Notes List

- Updated PRD project classification/deployment wording to match the distributed Wails desktop model (`Server.exe` + `Client.exe`) and removed browser-first phrasing in edited sections.
- Updated UX specification to explicitly define one cohesive shared shell with role-based variants, including shared route IDs/RBAC contract alignment.
- Added a concise "Cohesive App Contract" subsection to architecture implementation patterns (route ownership, role shell strategy, backend authorization authority).
- Updated Epic 2 planning references to reflect contract-first sequencing (`2.2A -> 2.2B -> 2.2C -> 2.2`).
- Performed contradiction scan on edited docs and ran full Go regression suite (`go test ./...`) successfully.

### File List

- docs/stories/2-2c-docs-alignment-cohesive-app.md
- docs/PRD.md
- docs/ux-design-specification.md
- docs/architecture.md
- docs/epics.md
- docs/sprint-status.yaml

## Change Log

- 2026-02-25: Initial draft created.
- 2026-02-25: Marked ready-for-dev/in-progress and completed implementation. Aligned PRD, UX, architecture, and epic sequencing to the cohesive app model and contract-first flow; validated with contradiction scan and `go test ./...`.
- 2026-02-25: Senior Developer Review notes appended.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-25

### Outcome

Approve

All acceptance criteria are implemented with clear document evidence, all completed tasks are verified, and no blocking or medium-severity issues were found.

### Summary

This story successfully aligns PRD, UX, architecture, and planning references to the cohesive distributed desktop model (`Server.exe` + `Client.exe`) and the shared shell/route contract. Cross-document consistency for deployment/navigation model language is materially improved and traceable to Story 2.2A/2.2B contracts.

### Key Findings

#### LOW

- UX spec still references Ant Design `5.x` in two places while the implemented dependency and architecture decision records use Ant Design `6.2.1`. This does not block this story's ACs but is a documentation drift risk for future contributors. [file: docs/ux-design-specification.md:46, docs/ux-design-specification.md:268, docs/architecture.md:29, frontend/package.json:18]

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | PRD reflects distributed Wails desktop deployment and removes browser-only phrasing in edited sections | IMPLEMENTED | docs/PRD.md:21, docs/PRD.md:25, docs/PRD.md:123, docs/PRD.md:124, docs/PRD.md:125 |
| AC2 | UX explicitly states one shared shell with role-based variants and shared route IDs | IMPLEMENTED | docs/ux-design-specification.md:161, docs/ux-design-specification.md:187 |
| AC3 | Architecture includes concise "Cohesive App Contract" with route ownership, role shell strategy, backend authorization authority | IMPLEMENTED | docs/architecture.md:81, docs/architecture.md:83, docs/architecture.md:84, docs/architecture.md:85 |
| AC4 | Epic/story planning references updated to contract-first sequence `2.2A -> 2.2B -> 2.2C -> 2.2` | IMPLEMENTED | docs/epics.md:28, docs/epics.md:277, docs/sprint-status.yaml:57, docs/sprint-status.yaml:58, docs/sprint-status.yaml:59, docs/sprint-status.yaml:60 |
| AC5 | Edited sections are internally consistent and cross-linked, with no contradictory deployment/navigation statements | IMPLEMENTED | docs/PRD.md:123, docs/ux-design-specification.md:161, docs/ux-design-specification.md:187, docs/architecture.md:83, docs/architecture.md:84, docs/navigation-rbac-contract.md:9 |

Summary: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Update PRD deployment/classification sections to match desktop distributed reality (AC: 1) | Completed (`[x]`) | VERIFIED COMPLETE | docs/PRD.md:21, docs/PRD.md:25, docs/PRD.md:123, docs/PRD.md:124, docs/PRD.md:125 |
| Update UX sections for shared app shell and role-variant navigation model (AC: 2) | Completed (`[x]`) | VERIFIED COMPLETE | docs/ux-design-specification.md:161, docs/ux-design-specification.md:187 |
| Add concise cohesive app contract section in architecture doc (AC: 3) | Completed (`[x]`) | VERIFIED COMPLETE | docs/architecture.md:81, docs/architecture.md:83, docs/architecture.md:84, docs/architecture.md:85 |
| Add/adjust epic-story references for sequencing and dependency clarity (AC: 4) | Completed (`[x]`) | VERIFIED COMPLETE | docs/epics.md:28, docs/epics.md:277, docs/sprint-status.yaml:57, docs/sprint-status.yaml:58, docs/sprint-status.yaml:59, docs/sprint-status.yaml:60 |
| Perform consistency pass across edited sections and fix conflicting statements (AC: 5) | Completed (`[x]`) | VERIFIED COMPLETE | docs/PRD.md:123, docs/ux-design-specification.md:161, docs/architecture.md:83, docs/navigation-rbac-contract.md:9 |
| Capture a brief changelog summary documenting exactly what was aligned and why (AC: 1-5) | Completed (`[x]`) | VERIFIED COMPLETE | docs/stories/2-2c-docs-alignment-cohesive-app.md:63, docs/stories/2-2c-docs-alignment-cohesive-app.md:64, docs/stories/2-2c-docs-alignment-cohesive-app.md:65, docs/stories/2-2c-docs-alignment-cohesive-app.md:66, docs/stories/2-2c-docs-alignment-cohesive-app.md:81 |

Summary: 6 of 6 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Story scope is documentation alignment; there are no story-specific unit/integration tests required for AC verification.
- Regression sanity check succeeded: `go test ./...` (pass).
- Gap: No automated documentation consistency check is present (e.g., lint/rule check for version coherence and contract wording).

### Architectural Alignment

- Alignment with architecture contract is strong: route ownership, role shell strategy, and backend authorization authority are explicitly codified in architecture and trace back to navigation contract baseline.
- No layering/dependency architecture violations were identified in this story scope.

### Security Notes

- No direct code-path security defects identified in this documentation-only story.
- Security authority statement is correctly preserved: backend authorization remains canonical over frontend visibility.

### Best-Practices and References

- Wails v2 docs (desktop app model and build/runtime guidance): https://wails.io/docs/gettingstarted/firstproject/
- React Router `useBlocker` (navigation blocking pattern referenced by architecture/UX resilience): https://reactrouter.com/api/hooks/useBlocker
- TanStack Query defaults and caching behavior (relevant to frontend architecture notes): https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults

### Action Items

**Code Changes Required:**
- None.

**Advisory Notes:**
- Note: Align UX spec Ant Design version references (`5.x`) with implemented stack (`6.2.1`) to avoid future implementation drift (no code change required for this story outcome).
