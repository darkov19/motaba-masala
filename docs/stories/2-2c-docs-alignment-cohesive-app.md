# Story 2.2C: Cohesive App Documentation Alignment

Status: drafted

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

- [ ] Update PRD deployment/classification sections to match desktop distributed reality (AC: 1)
- [ ] Update UX sections for shared app shell and role-variant navigation model (AC: 2)
- [ ] Add concise cohesive app contract section in architecture doc (AC: 3)
- [ ] Add/adjust epic-story references for sequencing and dependency clarity (AC: 4)
- [ ] Perform consistency pass across edited sections and fix conflicting statements (AC: 5)
- [ ] Capture a brief changelog summary documenting exactly what was aligned and why (AC: 1-5)

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

### Completion Notes List

- Pending implementation.

### File List

- docs/stories/2-2c-docs-alignment-cohesive-app.md

## Change Log

- 2026-02-25: Initial draft created.
