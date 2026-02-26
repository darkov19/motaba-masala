# Story 2.2D: AppShell UX Conformance Hardening

Status: done

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

GPT-5 Codex

### Debug Log References

- 2026-02-26: Story drafted from Correct Course workflow output and approved Sprint Change Proposal.
- 2026-02-26: Implemented shell UX conformance updates in AppShell/App CSS/App routing and added maximize control (`f8823d2a`, `d4987bb9`); frontend lint/tests passing.
- 2026-02-26: Fixed mode-aware quit confirmation copy so client runtime no longer shows server-specific exit messaging (`d4987bb9`).
- 2026-02-26: Fixed Packaging Profiles dirty-state/type-guard regression that blocked Windows production build (`71b4d41f`).
- 2026-02-26: Updated shell scrollbar implementation across multiple passes (native fallback + ultra-thin constant style) (`050050f2`, `fb84177f`, `631ae241`).
- 2026-02-26: Added titlebar drag-region fix for Wails-native frameless behavior (`b10cb928`).
- 2026-02-26: Hardened tray restore/focus flow so dashboard/quit dialog reliably surfaces from tray (`ca5efe24`).
- 2026-02-26: Updated Windows build script to emit console-log binaries for server/client diagnostics (`9b2998e5`).

### Completion Notes List

- Implemented fixed titlebar/header shell behavior with content-only scrolling and right-panel footer placement.
- Replaced generic placeholder dashboard with role-specific landing surfaces (Admin Command Center / Operator Speed Hub).
- Reduced startup duplicate request error noise by mounting only active route view components.
- Added maximize/restore titlebar control using Wails runtime window toggle APIs and enabled Wails-native titlebar dragging.
- Corrected quit confirmation text/buttons to follow runtime mode (`Server` vs `Client`).
- Updated master-data workspace UX (split table+form layout, role-based read-only surfaces, packaging profile behavior fixes).
- Fixed server tray re-open reliability by restoring/focusing window before opening dashboard/quit dialog.
- Added Windows build support for console-visible server/client binaries to improve runtime diagnostics during validation.
- Updated shell regression tests and validated frontend + server test/build suites.
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

### Additional Stakeholder-Driven Fixes (Post-Screenshot Audit)

| Issue | Resolution Status | Evidence Path |
| --- | --- | --- |
| Footer copyright should appear only on right panel | Fixed | `frontend/src/shell/AppShell.tsx`, `frontend/src/App.css` |
| App scrollbar looked inconsistent/hideous in packaged app | Fixed via native + thin constant scrollbar tuning | `frontend/src/App.css` |
| Title bar was not draggable like regular windows | Fixed using Wails drag regions | `frontend/src/App.css` |
| Server app tray reopen/quit dialog unreliable | Fixed by backend restore/focus helper before tray events | `cmd/server/main.go` |
| Need direct runtime logs from server/client binaries on Windows | Fixed via console-enabled build outputs | `scripts/windows-hard-sync-build-run.ps1` |

### Validation Runs

- `npm --prefix frontend run build` -> PASS
- `npm --prefix frontend run test:run` -> PASS (31 tests)
- `npm --prefix frontend run lint` -> PASS
- `go test ./internal/infrastructure/system` -> PASS
- `GOCACHE=/tmp/go-cache go test ./cmd/server` -> PASS

### File List

- docs/stories/2-2d-shell-ux-conformance.md
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/shell/AppShell.tsx
- frontend/src/shell/RoleShellNavigation.tsx
- frontend/src/style.css
- frontend/src/hooks/useUnsavedChanges.ts
- frontend/src/context/ConnectionContext.tsx
- frontend/src/components/forms/ItemMasterForm.tsx
- frontend/src/components/forms/PackagingProfileForm.tsx
- frontend/src/__tests__/AppShellRBAC.test.tsx
- frontend/src/__tests__/AppShellLayout.test.tsx
- frontend/src/__tests__/AppNavigationBlocker.test.tsx
- frontend/src/__tests__/AppLicenseStatus.test.tsx
- frontend/src/components/forms/__tests__/ItemMasterForm.test.tsx
- frontend/src/components/forms/__tests__/PackagingProfileForm.test.tsx
- frontend/src/context/__tests__/ConnectionContext.test.tsx
- cmd/server/main.go
- scripts/windows-hard-sync-build-run.ps1
- wails.json

## Change Log

- 2026-02-26: Initial draft created from approved sprint change proposal.
- 2026-02-26: Status moved to in-progress after implementing shell UX conformance code changes and regression test updates.
- 2026-02-26: Status moved to review with screenshot checklist completed and manual Windows screenshot capture marked as final pending signoff step.
- 2026-02-26: Applied additional UX remediation from stakeholder validation and audit loop (`d4987bb9`, `71b4d41f`, `050050f2`, `b10cb928`, `fb84177f`, `631ae241`).
- 2026-02-26: Added server tray reopen/focus reliability hardening from runtime validation (`ca5efe24`).
- 2026-02-26: Added Windows console-log build support for server/client troubleshooting in native runs (`9b2998e5`).
- 2026-02-26: Senior Developer Review remediation applied (quit-flow force-quit isolation, fixed-shell regression test, runtime-derived shell footer user label).

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-26

### Outcome

Approve

Justification: All code-level findings raised during review were remediated and verified in-session. Screenshot evidence for AC6 was explicitly waived by stakeholder approval during this review session.

### Summary

The story now meets shell UX conformance objectives and preserves role/RBAC contract behavior. Critical quit-flow safety risk identified during review was fixed, a dedicated layout regression test was added for fixed chrome/content scroll structure, and hardcoded user identity text in shell footer was removed.

### Key Findings (by severity - HIGH/MEDIUM/LOW)

#### HIGH

- Resolved: Force-quit state no longer leaks from route-navigation confirmation flows into app-exit behavior.
  - Evidence: `frontend/src/hooks/useUnsavedChanges.ts:75-92`, `frontend/src/hooks/useUnsavedChanges.ts:167-187`

#### MEDIUM

- Resolved: Added explicit regression coverage for fixed titlebar outside workspace scroll container (AC1 layout contract).
  - Evidence: `frontend/src/__tests__/AppShellLayout.test.tsx:66-89`, `frontend/src/shell/AppShell.tsx:33-48`, `frontend/src/App.tsx:204-210`

#### LOW

- Resolved: Removed hardcoded shell footer identity and replaced with runtime-derived display name + role fallback.
  - Evidence: `frontend/src/shell/RoleShellNavigation.tsx:13-37`, `frontend/src/shell/RoleShellNavigation.tsx:98-103`

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Window title bar/app shell chrome fixed; content scroll isolated | IMPLEMENTED | `frontend/src/App.css:1-7`, `frontend/src/App.css:183-188`, `frontend/src/App.css:392-403`, `frontend/src/shell/AppShell.tsx:33-48`, `frontend/src/App.tsx:204-210`, `frontend/src/__tests__/AppShellLayout.test.tsx:66-89` |
| 2 | Admin dashboard reflects command-center intent | IMPLEMENTED | `frontend/src/App.tsx:434-459`, `frontend/src/App.tsx:534-543` |
| 3 | Operator dashboard reflects speed-hub intent and distinct density | IMPLEMENTED | `frontend/src/App.tsx:461-484`, `frontend/src/App.tsx:534-543` |
| 4 | Shell density/polish aligns with UX direction | IMPLEMENTED | `frontend/src/App.css:202-359`, `frontend/src/App.css:361-390`, `frontend/src/App.css:80-181` |
| 5 | Startup/request failure feedback deduped and actionable | IMPLEMENTED | `frontend/src/App.tsx:486-531`, `frontend/src/components/layout/ReconnectionOverlay.tsx:17-27`, `frontend/src/context/ConnectionContext.tsx:148-153` |
| 6 | Regression coverage and screenshot evidence for review | IMPLEMENTED (WAIVED EVIDENCE) | Regression coverage: `frontend/src/__tests__/AppShellRBAC.test.tsx`, `frontend/src/__tests__/AppNavigationBlocker.test.tsx`, `frontend/src/context/__tests__/ConnectionContext.test.tsx`; Screenshot evidence explicitly waived by stakeholder during this review session |

Summary: 6 of 6 acceptance criteria accepted for this review.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Update shell layout/CSS for fixed titlebar/header and content-only scrolling | `[x]` | VERIFIED COMPLETE | `frontend/src/shell/AppShell.tsx:33-48`, `frontend/src/App.css:1-7`, `frontend/src/App.css:392-403` |
| Replace placeholder dashboard with Admin/Operator role landing cues | `[x]` | VERIFIED COMPLETE | `frontend/src/App.tsx:434-484`, `frontend/src/App.tsx:534-543` |
| Refine shell visual tokens/navigation density/polish | `[x]` | VERIFIED COMPLETE | `frontend/src/App.css:202-359`, `frontend/src/App.css:361-390` |
| Improve startup/request feedback dedupe/actionability | `[x]` | VERIFIED COMPLETE | `frontend/src/App.tsx:486-531`, `frontend/src/components/layout/ReconnectionOverlay.tsx:10-27`, `frontend/src/context/ConnectionContext.tsx:148-153` |
| Update/add frontend regression tests for shell behavior and role surfaces | `[x]` | VERIFIED COMPLETE | `frontend/src/__tests__/AppShellRBAC.test.tsx`, `frontend/src/__tests__/AppNavigationBlocker.test.tsx`, `frontend/src/__tests__/AppShellLayout.test.tsx`, `frontend/src/context/__tests__/ConnectionContext.test.tsx` |
| Capture updated server/client screenshot evidence | `[ ]` | WAIVED BY STAKEHOLDER | Waiver recorded during this review session on 2026-02-26 |

Summary: 5 of 5 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Executed:
  - `npm --prefix frontend run test:run` -> PASS (31 tests)
  - `npm --prefix frontend run lint` -> PASS
  - `npm --prefix frontend run build` -> PASS
  - `go test ./internal/infrastructure/system` -> PASS
  - `GOCACHE=/tmp/go-cache go test ./cmd/server` -> PASS
- Remaining gap accepted by stakeholder waiver:
  - Fresh server/client screenshot capture not required for approval in this review cycle.

### Architectural Alignment

Implementation remains aligned to navigation/RBAC contract and backend-authoritative access model.

- Evidence: `frontend/src/shell/rbac.ts:18-37`, `frontend/src/shell/rbac.ts:80-82`, `frontend/src/App.tsx:349-360`

### Security Notes

No critical auth/authz or injection findings in reviewed scope.

### Best-Practices and References

- React Conditional Rendering: https://react.dev/learn/conditional-rendering
- React Router v6.30.3 Overview: https://reactrouter.com/6.30.3/start/overview
- Ant Design ConfigProvider: https://ant.design/components/config-provider/
- Wails Runtime Window API: https://wails.io/docs/reference/runtime/window/
- Wails Frameless/Drag Regions: https://wails.io/docs/guides/frameless/
- MDN `scrollbar-width`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-width

### Action Items

**Code Changes Required:**
- None. All review findings requiring code changes were resolved in-session.

**Advisory Notes:**
- Note: Fresh screenshot evidence was waived for this review cycle; capture can still be done later for archival UX evidence.
