# Story 2.2D: AppShell UX Conformance Hardening

Status: review

## Story

As a project stakeholder,
I want the shared AppShell implementation to conform to the approved UX behavior and visual direction,
so that Server and Client experiences remain cohesive before Epic 2 feature expansion continues.

## Acceptance Criteria

1. Window title bar and app header remain fixed while only workspace content scrolls in both `Server.exe` and `Client.exe`. [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach; docs/ux-design-specification.md#7.1 Consistency Rules]
2. Admin landing experience on dashboard route reflects command-center intent (decision-oriented cues) rather than a generic placeholder-only workspace. [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach; docs/ux-design-specification.md#5.1 Critical User Paths]
3. Operator landing experience on dashboard route reflects speed-hub intent (task-first execution cues) and remains distinct from Admin presentation density. [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach; docs/ux-design-specification.md#7.1 Consistency Rules]
4. Shell visual density and polish (sidebar hierarchy, spacing, typography emphasis, and scrollbar/chrome consistency) align with approved UX direction. [Source: docs/ux-design-specification.md#3.1 Color System; docs/ux-design-specification.md#6.1 Component Strategy; docs/ux-design-specification.md#7.1 Consistency Rules]
5. Startup/request failure feedback is deduplicated and actionable, avoiding repetitive toast spam and preserving user context. [Source: docs/ux-design-specification.md#7.1 Consistency Rules; docs/ux-design-specification.md#5.2 Resilience Components]
6. Regression coverage validates corrected shell behavior and role-specific surfaces, with updated screenshot evidence for server/client review. [Source: docs/stories/2-2b-app-shell-role-variants.md#Acceptance Criteria; docs/sprint-change-proposal-2026-02-26.md]

## Tasks / Subtasks

- [x] Update shell layout and CSS to enforce fixed titlebar/header with content-only scrolling (AC: 1)
- [x] Replace placeholder-centric dashboard surface with role-appropriate Admin and Operator landing cues while preserving shared route IDs (AC: 2, 3)
- [x] Refine shell visual tokens and navigation presentation to match approved UX density/polish direction (AC: 4)
- [x] Improve startup/request error feedback to be deduplicated and actionable (AC: 5)
- [x] Update/add frontend regression tests covering shell behavior and role-specific dashboard surfaces (AC: 1-3, 5, 6)
- [ ] Capture updated server/client screenshot evidence and attach to story completion notes (AC: 6) - pending manual Windows capture

## Dev Notes

- This is a corrective hardening story created from the approved sprint change proposal dated 2026-02-26.
- Do not alter route identity or RBAC ownership; preserve the `2.2A` navigation contract and backend authorization authority.
- Keep implementation scope focused on shell behavior and UX conformance. Do not expand functional module scope.
- Complete this story before continuing Story 2.2 implementation to prevent cascading UI rework.

### References

- [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach]
- [Source: docs/ux-design-specification.md#7.1 Consistency Rules]
- [Source: docs/ux-design-specification.md#5.1 Critical User Paths]
- [Source: docs/ux-design-specification.md#5.2 Resilience Components]
- [Source: docs/navigation-rbac-contract.md]
- [Source: docs/stories/2-2b-app-shell-role-variants.md]
- [Source: docs/sprint-change-proposal-2026-02-26.md]

## Dev Agent Record

### Context Reference

- Pending (`2-2d-shell-ux-conformance.context.xml` not yet generated)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-26: Story drafted from Correct Course workflow output and approved Sprint Change Proposal.
- 2026-02-26: Implemented shell UX conformance updates in AppShell/App CSS/App routing and added maximize control; frontend lint/tests passing.
- 2026-02-26: Fixed mode-aware quit confirmation copy so client runtime no longer shows server-specific exit messaging.

### Completion Notes List

- Implemented fixed titlebar/header shell behavior with content-only scrolling and polished themed scrollbar treatment.
- Replaced generic placeholder dashboard with role-specific landing surfaces (Admin Command Center / Operator Speed Hub).
- Reduced startup duplicate request error noise by mounting only active route view components.
- Added maximize/restore titlebar control using Wails runtime window toggle APIs.
- Corrected quit confirmation text/buttons to follow runtime mode (`Server` vs `Client`).
- Updated shell regression tests and validated frontend suites.
- Remaining: capture fresh server/client screenshot evidence for final signoff (manual Windows run).

### Screenshot Checklist (2026-02-26)

| Screenshot | Reported Issue | Resolution Status | Evidence Path |
| --- | --- | --- | --- |
| `Screenshots/server/server_title_bar_and_header_gets_scrolled.png` | Titlebar/header scroll with content | Code fixed: shell chrome fixed, content-only scroll | `frontend/src/App.css`, `frontend/src/shell/AppShell.tsx` |
| `Screenshots/server/server_add_min_max_button.png` | Missing maximize/restore control | Code fixed: maximize/restore control added in titlebar | `frontend/src/App.tsx` |
| `Screenshots/server/server_imporve_scrollbar_to_match_the_theme.png` | Scrollbar not matching theme | Code fixed: themed sidebar/content scrollbars | `frontend/src/App.css` |
| `Screenshots/server/server_requests_failied_on_startup.png` | Duplicate startup request-failure toasts | Code fixed: only active route component mounts | `frontend/src/App.tsx` |
| `Screenshots/client/client_requests_failied_on_startup.png` | Duplicate startup request-failure toasts | Code fixed: only active route component mounts | `frontend/src/App.tsx` |
| `Screenshots/server/server_part_that_visible_on_all_tabs.png` | Shared placeholder content shown across tabs | Code fixed: role-specific dashboard + active-view rendering | `frontend/src/App.tsx` |
| `Screenshots/server/server_dashboard.png` | Dashboard not aligned to intended role UX | Code fixed: Admin Command Center surface | `frontend/src/App.tsx` |
| `Screenshots/client/client_dashboard.png` | Dashboard not aligned to intended role UX | Code fixed: Operator Speed Hub surface | `frontend/src/App.tsx` |
| `Screenshots/server/server_navigation.png` | Navigation density/polish mismatch | Code fixed: spacing, hierarchy, selected styles updated | `frontend/src/App.css` |
| `Screenshots/client/client_server_confimtation_for_client.png` | Client shows server exit confirmation copy | Code fixed: mode-aware quit dialog title/buttons | `frontend/src/hooks/useUnsavedChanges.ts`, `frontend/src/App.tsx` |

Note: All items are code-fixed and test/lint validated. Fresh runtime screenshots are still required for visual signoff.

### Validation Runs

- `npm --prefix frontend run test:run` -> PASS (28 tests)
- `npm --prefix frontend run lint` -> PASS

### File List

- docs/stories/2-2d-shell-ux-conformance.md
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/shell/AppShell.tsx
- frontend/src/style.css
- frontend/src/hooks/useUnsavedChanges.ts
- frontend/src/__tests__/AppShellRBAC.test.tsx
- frontend/src/__tests__/AppNavigationBlocker.test.tsx

## Change Log

- 2026-02-26: Initial draft created from approved sprint change proposal.
- 2026-02-26: Status moved to in-progress after implementing shell UX conformance code changes and regression test updates.
- 2026-02-26: Status moved to review with screenshot checklist completed and manual Windows screenshot capture marked as final pending signoff step.
