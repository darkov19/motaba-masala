# Sprint Change Proposal - UX Conformance Correction (Story 2.2B)

Date: 2026-02-26
Author: darko (facilitated via Correct Course workflow)
Change Trigger Story: 2.2B (Shared AppShell with Role Variants)
Execution Mode: Incremental

## 1. Issue Summary

### Problem Statement

During post-implementation review of Story 2.2B, the implemented AppShell experience in both `Server.exe` and `Client.exe` diverges from the approved UX specification in `docs/ux-design-specification.md`.

### Discovery Context

The issue was identified through visual verification of runtime screenshots after Story 2.2B had been marked `done`.

### Evidence

- `Screenshots/server/server_dashboard.png`
- `Screenshots/client/client_dashboard.png`
- `Screenshots/server/server_title_bar_and_header_gets_scrolled.png`
- `Screenshots/server/server_part_that_visible_on_all_tabs.png`
- `Screenshots/server/server_imporve_scrollbar_to_match_the_theme.png`
- `Screenshots/server/server_requests_failied_on_startup.png`
- `Screenshots/client/client_requests_failied_on_startup.png`

### Observed Mismatches

- Generic placeholder-centric workspace is shown instead of role-specific landing experience expectations.
- Shell chrome/scroll behavior appears inconsistent with expected desktop-shell interaction.
- Sidebar and shell visual density/polish are not aligned with approved UX direction.
- Startup error UX is repetitive and non-actionable in current screenshot evidence.

## 2. Impact Analysis

### Epic Impact

- **Epic 2 remains viable** and can continue.
- Story `2.2B` is functionally complete but **UX-conformance incomplete** relative to approved design intent.
- A corrective story is required before proceeding with additional feature UI work to avoid compounding divergence.

### Story Impact

- Keep `2.2B` as historical `done` (do not rewrite history).
- Add a corrective story: **`2.2D - Shell UX Conformance Hardening`**.
- Prioritize `2.2D` before additional Epic 2 feature story implementation.

### Artifact Conflicts

- **PRD:** No core product-scope conflict identified; no PRD changes required.
- **Architecture:** Contract is currently too high-level to prevent shell UX drift; add explicit conformance constraints.
- **UX Specification:** Intent exists, but implementation gate criteria are not explicit enough to enforce behavior-level conformance.
- **Planning/Tracking:** `docs/epics.md` sequencing and `docs/sprint-status.yaml` require update to include `2.2D`.

### Technical Impact

Affected implementation zones:

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/shell/AppShell.tsx`
- Potentially `frontend/src/shell/RoleShellNavigation.tsx`
- Shell regression tests and screenshot baselines

Risk of not correcting now:

- Future module screens will inherit non-conforming shell patterns, increasing rework cost across Epic 3+.

## 3. Recommended Approach

### Selected Path

**Option 1: Direct Adjustment** via a new corrective story (`2.2D`).

### Rationale

- Fastest path with least disruption.
- Preserves current architecture and RBAC contract.
- Creates explicit, auditable correction scope.
- Avoids costly rollback churn and unnecessary MVP re-scope.

### Estimate and Risk

- Effort: **Medium**
- Risk: **Low**
- Timeline impact: **+2 to 4 working days** (implementation, test updates, visual verification)

## 4. Detailed Change Proposals

## 4.1 Stories / Planning Artifacts

### A) `docs/epics.md` - Epic 2 sequencing and corrective story insertion

OLD:

- `2.2A -> 2.2B -> 2.2C -> 2.2`
- No corrective story for shell UX conformance.

NEW:

- `2.2A -> 2.2B -> 2.2C -> 2.2D -> 2.2`
- Add `Story 2.2D: AppShell UX Conformance Hardening` with acceptance criteria for:
    - Shell chrome behavior (fixed titlebar/header; content-only scroll).
    - Role-appropriate landing experience (Admin command-center cues, Operator speed-hub cues).
    - Visual conformance (sidebar density/spacing/typography/color behavior).
    - Error UX conformance (deduplicated, actionable startup/network errors).
    - Regression coverage (tests + screenshot baseline for server/client shell).

Justification:

- Preserves historical completion while making corrective scope explicit and trackable.

### B) `docs/sprint-status.yaml` - status tracking

OLD:

- `2-2b-app-shell-role-variants: done`
- `2-2c-docs-alignment-cohesive-app: done`
- No `2-2d-*` key.

NEW:

- Keep `2-2b` and `2-2c` as `done`.
- Add `2-2d-shell-ux-conformance: drafted`.

Justification:

- Enables backlog and execution routing without rewriting prior status.

## 4.2 PRD

### `docs/PRD.md`

OLD:

- Current PRD scope and UX principles already support the intended direction.

NEW:

- **No change proposed**.

Justification:

- The issue is implementation/spec conformance drift, not product requirement mismatch.

## 4.3 Architecture

### `docs/architecture.md` - `Implementation Patterns -> 0. Cohesive App Contract`

OLD:

- Cohesive app contract exists at conceptual level.

NEW:

- Add explicit conformance constraints:
    - Shell layering contract: titlebar/header fixed; only workspace content scrolls.
    - Role-variant UX contract: admin/default presentation differs from operator/default presentation while route IDs remain shared.
    - Visual quality gate: no placeholder-only default landing for completed shell stories.
    - Error feedback contract: startup/network errors must be deduplicated and actionable.
    - Verification gate: screenshot baseline checks for server/client shell.

Justification:

- Reduces interpretation ambiguity and prevents recurrence of the same drift.

## 4.4 UI/UX Specification

### `docs/ux-design-specification.md` - `4.1 Chosen Design Approach` + `7.1 Consistency Rules`

OLD:

- Intent documented, but behavior-level implementation gates are implicit.

NEW:

- Add explicit “Conformance Criteria (implementation gate)” block covering:
    - Header/titlebar persistence behavior during scroll.
    - Sidebar density/presentation expectations by role.
    - Default landing behavior expectations by role.
    - Startup/error notification behavior (clear, non-duplicative, actionable).
    - Visual acceptance evidence requirement (server/client screenshots).

Justification:

- Converts design intent into verifiable acceptance language for implementation and QA.

## 4.5 Code / Tests (Implementation Scope)

### `frontend/src/App.css`, `frontend/src/App.tsx`, `frontend/src/shell/AppShell.tsx` (+ related tests)

OLD:

- Shell behavior and visuals in screenshots are not fully conformant with approved UX direction.

NEW:

- Implement targeted shell UX corrections under `2.2D`:
    - Fixed chrome + content-only scroll behavior.
    - Stronger role-variant landing surfaces.
    - Refined shell visual tokens and navigation presentation.
    - Deduplicated startup failure messaging with clearer recovery actions.
    - Regression tests and screenshot baselines for both runtime modes.

Justification:

- Ensures conformance is measurable and sustained.

## 5. Implementation Handoff

### Scope Classification

**Moderate** - requires backlog/story planning updates plus frontend shell implementation and regression updates.

### Routing

- **Primary Route:** Product Owner / Scrum Master (backlog sequencing + story drafting for `2.2D`).
- **Secondary Route:** Development Team (implement `2.2D` code/test changes).
- **Support Route:** UX/Architecture review pass for acceptance signoff.

### Responsibilities

- PO/SM:
    - Create and prioritize `2.2D` before additional Epic 2 feature UI work.
    - Update planning artifacts (`epics`, `sprint-status`).
- Dev Team:
    - Implement shell/UI corrections and regression tests.
    - Produce before/after screenshot evidence for server and client modes.
- UX/Architect reviewer:
    - Validate conformance to updated UX + architecture constraints.

### Success Criteria

- `2.2D` drafted, approved, and tracked in sprint status.
- Shell behavior and visuals match UX conformance criteria.
- Startup error UX is actionable and non-duplicative.
- Regression tests pass and screenshot evidence is archived.

## Proposal Decision Record

- Change Trigger: Approved as Story `2.2B` UX conformance drift.
- Strategy: Option 1 Direct Adjustment.
- Mechanism: Add corrective Story `2.2D` and execute immediately before further feature UI expansion.
