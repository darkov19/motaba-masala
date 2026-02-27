# UX Conformance Checklist (Epic 3 Gate)

## Purpose
Use this checklist before moving any UI-impact story to review. This enforces alignment with `docs/ux-design-specification.md`.

## A. Scope and References
- [ ] Story explicitly marks whether it has UI/UX impact.
- [ ] Story cites relevant UX spec sections.
- [ ] Story defines role-variant behavior where applicable:
  - [ ] Admin Command Center
  - [ ] Data Entry Operator Speed Hub

## B. Visual Modernization Consistency
- [ ] Uses approved visual direction (Motaba Modern Clean).
- [ ] Color usage aligns with spec (primary maroon, semantic states).
- [ ] Typography hierarchy is consistent and readable.
- [ ] Spacing and layout density are coherent and intentional.
- [ ] Card/input/button styling follows modern clean shell conventions.
- [ ] No obvious mismatch between module UI and shared app shell design language.

## C. Information Architecture and Comprehension
- [ ] Primary user goal is visible within 5 seconds on first view.
- [ ] Critical KPI/signal information is prioritized above secondary content.
- [ ] Navigation labels and grouping match module ownership and role expectations.
- [ ] Page supports drill-down flow (dashboard -> list -> detail) where relevant.

## D. Interaction Quality (Operator Speed and Reliability)
- [ ] Keyboard-first flow works end-to-end for primary task path.
- [ ] Tab order and focus states are predictable.
- [ ] Validation and error feedback is clear, actionable, and non-spammy.
- [ ] Submit/reset/next-action behavior supports rapid repetitive use.
- [ ] Unsaved-changes and recovery behavior matches resilience guidance.

## E. Role-Based UX Behavior
- [ ] Admin view supports monitoring/decision making (command-center intent).
- [ ] Operator view supports quick execution (action-hub intent).
- [ ] Unauthorized actions are clearly handled without exposing disallowed controls.

## F. Evidence Required in Story
- [ ] Story includes `## UX Acceptance Evidence (Required)` section.
- [ ] Evidence includes concise notes on what was verified.
- [ ] Evidence includes screenshots or short recording references for key views.
- [ ] Any non-applicable items are explicitly justified.

## Exit Rule
A UI-impact story is **not ready for review** until all applicable checklist items are checked, or justified with explicit approval.
