# Sprint Change Proposal — Resilience & Robustness Hardening

**Date:** 2026-02-14
**Triggered By:** Standalone resilience audit during development (no specific story)
**Author:** darko (assisted by AI)
**Mode:** Incremental
**Status:** ✅ APPROVED (2026-02-15)
**Scope:** Moderate — Reopen Epic 1 with 6 new stories, update 5 documentation artifacts

---

## 1. Issue Summary

**Problem Statement:** A systematic resilience audit identified **18 failure scenarios** across 6 categories (Server Failures, Client Failures, Network Failures, Data Integrity, Licensing, User Error). Of these, **13 require new code** and **5 are already handled** by the existing architecture but lack formal verification.

**Discovery:** Identified during general development work on 2026-02-14. The audit was prompted by the realization that the distributed Wails application (Server + Clients over LAN) has no explicit resilience mechanisms beyond SQLite WAL mode and UDP re-discovery.

**Evidence:** Full analysis documented in [resilience-audit-report.md](./resilience-audit-report.md), covering:

- 6 Critical scenarios (server close, server crash, server hang, network switch failure, firewall blocks, DB corruption, license expiry, clock tamper, hardware change, DB deletion)
- 4 High/Medium scenarios (disk space, client crash, LAN disconnect, concurrent edits, IP change, dual instances)
- 2 Low scenarios (client close, client reboot)

**Core Change:** Add 6 new stories (1.6–1.11) to Epic 1, covering server resilience, client resilience, data integrity, license UX, installer hardening, and verification of existing protections. All must complete before starting Epic 2.

---

## 2. Impact Analysis

### 2.1 Epic Impact

| Epic                         | Impact          | Detail                                                                                                                                                            |
| :--------------------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Epic 1** (Core Foundation) | 🔴 **Direct**   | Reopened — 6 new stories (1.6–1.11) added. Epic remains "contexted" status.                                                                                       |
| **Epic 2** (Master Data)     | 🟡 **Blocked**  | Cannot start until resilience stories complete (especially 1.7 client resilience and 1.8 data integrity, which are prerequisites for data-entry-heavy workflows). |
| **Epics 3-7**                | 🟢 **Indirect** | Story personas unaffected. Will benefit from cross-cutting resilience (auto-draft, optimistic locking, connection indicator).                                     |

No epics need to be added, removed, or resequenced (beyond the addition of stories to Epic 1).

### 2.2 Artifact Impact

#### Documentation Files (5 files)

| File                                | Change Required                                                                                                                                                            |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PRD.md` (L246-254)            | Expand Reliability section with specific resilience NFRs (server stability, client resilience, data integrity, license grace period, installer hardening)                  |
| `docs/architecture.md` (after L131) | Add new "Resilience & Stability Patterns" section covering system tray, watchdog, auto-draft, optimistic locking, connection status, mutex                                 |
| `docs/ux-design-specification.md`   | Add "Resilience Components" section: connection indicator, reconnect overlay, draft recovery dialog, unsaved changes dialog, warning banners, hardware change error screen |
| `docs/epics.md` (after L138)        | Add Stories 1.6–1.11 with full acceptance criteria                                                                                                                         |
| `docs/sprint-status.yaml` (L40-46)  | Add 6 new story entries (1.6 through 1.11) as `backlog` status                                                                                                             |

#### No Impact

| Artifact                        | Reason                                                                        |
| :------------------------------ | :---------------------------------------------------------------------------- |
| Existing code (Stories 1.1–1.5) | All additive changes — no existing code modified                              |
| `docs/stories/*.md`             | Existing story files unchanged; new story files created during drafting phase |
| Previous sprint change proposal | Independent — role harmonization (2026-02-13) is unrelated                    |

---

## 3. Recommended Approach

**Selected: Option 1 — Direct Adjustment** ✅

| Factor        | Assessment                                                                                                                                                                       |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Effort**    | **Medium** — 6 new stories spanning server Go code, client React code, NSIS scripts, and test suites                                                                             |
| **Risk**      | **Low** — All additive changes. No existing functionality modified. Tests will validate.                                                                                         |
| **Timeline**  | Estimated 1-2 sprints. Can be parallelized (1.6 server + 1.7 client simultaneously).                                                                                             |
| **Rationale** | These are essential production-readiness features for an on-premise LAN application. Without them, accidental server closure alone could disrupt an entire factory's operations. |

**Why not Rollback?** Nothing to roll back — this is new functionality, not a fix to existing work.

**Why not MVP Review?** The MVP scope is not changing. These are **robustness requirements** that should have been in the original PRD. The functional scope (7 epics of inventory/production features) remains identical.

---

## 4. Detailed Change Proposals

### 4.1 New Stories (Epic 1)

#### Story 1.6: Server Resilience & Stability

| Mitigation                     | Code Area                                  | Complexity |
| :----------------------------- | :----------------------------------------- | :--------- |
| System Tray minimization (1.1) | `cmd/server/main.go` + Wails window events | Medium     |
| Watchdog Timer (1.4)           | `internal/infrastructure/watchdog/`        | Medium     |
| Disk Space Monitor (1.3)       | `internal/infrastructure/monitor/`         | Low        |
| Single Instance Lock (6.2)     | `cmd/server/main.go` — Windows Mutex       | Low        |

#### Story 1.7: Client Resilience & Recovery

| Mitigation                        | Code Area                           | Complexity |
| :-------------------------------- | :---------------------------------- | :--------- |
| Auto-Draft to LocalStorage (2.1)  | React `useAutoSave` hook            | Low        |
| Unsaved Changes Warning (2.2)     | React Router `useBlocker`           | Low        |
| Connection Status + Overlay (3.1) | React component + heartbeat service | Medium     |

#### Story 1.8: Data Integrity Protection

| Mitigation                | Code Area                                | Complexity |
| :------------------------ | :--------------------------------------- | :--------- |
| Optimistic Locking (4.1)  | `updated_at` column + server-side check  | Medium     |
| DB Integrity Check (4.2)  | `internal/infrastructure/db/recovery.go` | Low        |
| Missing DB Recovery (6.1) | Startup detection + backup restore       | Low        |

#### Story 1.9: License & Security UX

| Mitigation                     | Code Area                           | Complexity |
| :----------------------------- | :---------------------------------- | :--------- |
| License Grace Period (5.1)     | `internal/infrastructure/license/`  | Medium     |
| Hardware Change Error UX (5.3) | Frontend error screen + copy button | Low        |

#### Story 1.10: Installer Hardening

| Mitigation               | Code Area                             | Complexity |
| :----------------------- | :------------------------------------ | :--------- |
| Firewall Rule (3.4)      | NSIS script `nsExec::ExecToLog`       | Low        |
| Auto-Start on Boot (2.3) | NSIS optional startup folder shortcut | Low        |

#### Story 1.11: Resilience Verification Suite

| Verification                 | Method                                                      |
| :--------------------------- | :---------------------------------------------------------- |
| WAL crash recovery (1.2)     | Integration test: kill process mid-write, verify recovery   |
| UDP re-discovery (3.2)       | Integration test: change server IP, verify client reconnect |
| Network switch failure (3.3) | Manual test: verify server UI works without network         |
| Client reboot recovery (2.3) | Manual test: verify auto-start + draft recovery             |
| Clock tamper detection (5.2) | Integration test: set clock back, verify lockout            |

### 4.2 PRD Changes

**Section:** Reliability (L246-254)

Expand the generic "Resilience" requirement into 5 specific sub-sections:

- **Server Stability:** System tray, watchdog, disk monitor, single instance
- **Client Resilience:** Auto-draft, connection indicator, unsaved changes warning
- **Data Integrity:** Optimistic locking, startup integrity check, missing DB recovery
- **License Grace Period:** 30-day warning, 7-day read-only, hardware change UX
- **Installer Hardening:** Firewall rules, auto-start option

### 4.3 Architecture Changes

**Location:** After "Hardware Licensing Pattern" (L131)

Add new section "6. Resilience & Stability Patterns" covering:

- Server stability patterns (tray, watchdog goroutine, disk monitor, mutex)
- Client resilience patterns (auto-draft hook, connection heartbeat, navigation guard)
- Data integrity patterns (optimistic locking with `updated_at`, startup `PRAGMA integrity_check`)

### 4.4 UX Design Specification Changes

Add "Resilience Components" section with 6 new component specifications:

1. Connection Status Indicator (🟢/🔴 in header)
2. Reconnection Overlay (full-screen, auto-retry)
3. Draft Recovery Dialog (modal on form load)
4. Unsaved Changes Dialog (modal on close/navigate)
5. Warning Banners (disk space, license expiry)
6. Hardware Change Error Screen (full-screen with copyable ID)

---

## 5. Implementation Handoff

**Change Scope: Moderate** — Requires epic restructuring and multiple artifact updates before development.

### Handoff Plan

| Phase               | Responsibility | Agent/Role                                                       | Action |
| :------------------ | :------------- | :--------------------------------------------------------------- | :----- |
| 1. Artifact Updates | SM             | Update PRD, Architecture, UX spec, Epics, Sprint Status          |
| 2. Story Drafting   | SM             | Draft story files for 1.6–1.11 with full ACs and technical notes |
| 3. Story Context    | SM             | Create `.context.xml` for each new story                         |
| 4. Implementation   | Dev Agent      | Implement stories 1.6–1.11 in sequence                           |
| 5. Verification     | SM             | Code review after each story completion                          |

### Suggested Implementation Order

1. **Story 1.6** (Server Resilience) — Foundation: system tray prevents the #1 accident
2. **Story 1.8** (Data Integrity) — Critical: optimistic locking needed before multi-user epics
3. **Story 1.7** (Client Resilience) — Essential UX for LAN app
4. **Story 1.9** (License UX) — Builds on existing licensing code
5. **Story 1.10** (Installer) — Can be done in parallel with any story
6. **Story 1.11** (Verification) — Final validation, runs last

### Success Criteria

1. All 13 "Needs New Code" mitigations have passing tests
2. All 5 "Already Handled" scenarios have documented verification
3. All 5 documentation artifacts updated and consistent
4. All new stories pass SM code review
5. Resilience audit report updated with ✅ status for each scenario

---

_Sprint Change Proposal generated for darko on 2026-02-14._
