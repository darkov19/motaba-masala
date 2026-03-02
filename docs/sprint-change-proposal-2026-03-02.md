# Sprint Change Proposal: March 2, 2026

**Date:** 2026-03-02
**Prepared by:** BMad Correct Course Workflow
**Status:** Approved

---

## Section 1: Issue Summary

### Problem Statement

As Epic 3 (Procurement & Inventory) completes and the team prepares to enter Epic 4 (Production), a set of critical domain requirements and UX direction have been identified that are not yet reflected in the backlog stories or architecture documentation. These were discovered through stakeholder review and factory floor operational analysis prior to Epic 4 kickoff.

### What Was Discovered

Nine inter-related changes were identified across four categories:

1. **Stock Segregation** — Finished Goods must be tracked in two separate pools: `REGULAR` (distributor) and `ONLINE` (e-commerce). This affects Packing Runs, Dispatch, and FIFO logic.
2. **Recipe % Base** — Recipes need to support a percentage-based mode where ingredients sum to 100%, enabling auto-scaling to any target output quantity (e.g., "make 500KG of Garam Masala").
3. **Production Flexibility** — The production engine must allow operators to override standard ingredient quantities and add ad-hoc ingredients not on the base recipe, with stock deductions driven by actuals.
4. **Auto-Suggest GRN & SKU** — Forms for GRN creation and Item creation should pre-fill sequence numbers on mount, reducing manual tracking and duplicate code errors.
5–9. **Modern UX Plans** — Five detailed UX specifications (Recipes, Batch Execution, Sales & Dispatch, Reporting & Analytics, Role-Specific Dashboards) have been authored and need to be linked to the relevant backlog epics and stories.

### When / How Discovered

Identified during post-Epic 3 retrospective planning and pre-Epic 4 architecture review on 2026-03-02. All backlog epics (4–7) are in `backlog` status — no in-progress stories are disrupted.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|------|--------|--------|
| Epic 2 (Master Data) | done | Story 2.3 (Recipe BOM) addendum note added; net-new Story 2.5 (PackagingProfile Edit) added — existing edit capability is missing per UX plan |
| Epic 3 (Procurement) | done | Net-new Story 3.5 (Auto-Suggest) added; no existing done stories modified |
| Epic 4 (Production) | backlog | Stories 4.1 and 4.2 enriched with % scaling, target quantity, ActualConsumedComponents, and live feasibility check |
| Epic 5 (Packing) | backlog | Stories 5.1 and 5.3 enriched with market segment selection and FG batch tagging |
| Epic 6 (Sales) | backlog | Stories 6.1 and 6.2 enriched with segment-filtered dispatch and FIFO within segment |
| Epic 7 (Reporting) | backlog | `stock_ledger` schema prerequisite documented; net-new Story 7.4 (Live Dashboards) added |

### Story Impact

| Story | Change Type | Summary |
|-------|------------|---------|
| 2.3 Recipe BOM | Addendum note | Planning note: `is_percentage_base` migration coming at Epic 4 start |
| 2.5 PackagingProfile Edit *(new)* | New story | `UpdatePackagingProfile` backend + `PackagingProfileBuilder.tsx` edit mode; fixes missing edit capability |
| 3.5 Auto-Suggest *(new)* | New story | `SuggestNextGRN()` + `SuggestNextSKU(type)` endpoints; form-mount pre-fill |
| 4.1 Batch Creation | Enriched | Target output qty input; pre-calculated ingredient requirements; shortage blocker |
| 4.2 Recipe Execution | Enriched | % recipe scaling; Actual Consumed payload; override per line; Add Extra Ingredient |
| 5.1 Packing Run | Enriched | Market segment selector added to run creation |
| 5.2 Packing Material Consumption | No change needed | Segment is set in 5.1 and tagged on output in 5.3; material deductions are segment-agnostic |
| 5.3 FG Stock Entry | Enriched | FG batch permanently tagged with market segment |
| 6.1 Sales Order | Enriched | Dispatch filtered to selected market segment |
| 6.2 FIFO Dispatch | Enriched | FIFO operates within segment boundary only |
| 7.4 Live Dashboards *(new)* | New story | AdminDashboard + OperatorDashboard with live aggregator endpoints |

### Artifact Conflicts Resolved

| Artifact | Change |
|----------|--------|
| `docs/architecture.md` — Core Models | Added `Recipe`, `RecipeComponent` with `IsPercentageBase`; added `MarketSegment` to `Batch` and `StockLedger` |
| `docs/architecture.md` — Epic→Architecture Mapping | Updated Epic 3 (SuggestNext endpoints) and Epic 4 (ExecutionService, YieldCalculator % scaling) |
| `docs/architecture.md` — Implementation Patterns | Added Pattern 6: Execution Service Pattern (atomic transactions, actual vs theoretical, pre-flight check) |
| `docs/epics.md` — Epics 4–7 | Added UX plan references and schema prerequisite notes to each epic overview |

### Technical Impact

**New DB migrations required (at epic start):**
- Epic 4 start: `ALTER TABLE recipes ADD COLUMN is_percentage_base BOOLEAN DEFAULT FALSE`
- Epic 4 start: `unit_cost REAL DEFAULT 0` and `total_value REAL DEFAULT 0` on `stock_ledger` — Production Runs (Epic 4) are the first to write financial context to the ledger; Epic 7 only reads what 4, 5, and 6 wrote
- Epic 5 start: `market_segment TEXT DEFAULT 'REGULAR'` on `batches` / FG stock table

**New backend:**
- `internal/app/inventory/execution_service.go` — atomic Production Run and Packing Run transactions
- `SuggestNextGRN()` and `SuggestNextSKU(itemType string)` Wails endpoints (Story 3.5)
- `GetAdminDashboardStats()` and `GetOperatorDashboardAlerts()` aggregator endpoints (Story 7.4)

**New frontend components:**
- `ProductionRunTerminal.tsx`, `PackingRunTerminal.tsx` (Epic 4/5)
- `RecipeBuilder.tsx`, `PackagingProfileBuilder.tsx` (Epic 4 prerequisite)
- `DispatchTerminal.tsx` (Epic 6)
- `AdminDashboard.tsx`, `OperatorDashboard.tsx` (Epic 7 / Story 7.4)

---

## Section 3: Recommended Approach

**Direct Adjustment** — all changes have been applied directly to backlog stories and architecture docs. No done stories were broken. No rollback required. No MVP scope reduction needed.

**Rationale:** All impacted epics (4–7) are in `backlog` status. The changes were caught at exactly the right time — before any of these stories were drafted or contexted. The cost of correction is documentation only.

**Risk:** Low. The only structural risks are the three future DB migrations, which are schema-additive (new columns with defaults) and non-breaking.

**Timeline impact:** None to Epic 3 (complete). Epic 4 kickoff gains a clear prerequisite: apply `is_percentage_base` migration and implement RecipeBuilder UX before drafting Story 4.1.

---

## Section 4: Detailed Change Proposals (Summary)

All proposals were reviewed and approved incrementally. Full before/after text applied to:

| # | Artifact | Section | Status |
|---|----------|---------|--------|
| 1.1 | `architecture.md` | Core Models — Batch + StockLedger | ✅ Applied |
| 1.2 | `epics.md` | Story 5.1 — market segment selector | ✅ Applied |
| 1.3 | `epics.md` | Story 5.3 — FG segment tagging | ✅ Applied |
| 1.4 | `epics.md` | Story 6.1 — segment-filtered dispatch | ✅ Applied |
| 1.5 | `epics.md` | Story 6.2 — FIFO within segment | ✅ Applied |
| 2.1 | `architecture.md` | Core Models — Recipe + RecipeComponent | ✅ Applied |
| 2.2 | `architecture.md` | Epic→Arch Mapping — Epic 4 | ✅ Applied |
| 2.3 | `epics.md` | Story 2.3 — planned extension note | ✅ Applied |
| 2.4 | `epics.md` | Story 4.2 — % scaling + ActualConsumed | ✅ Applied |
| 3.1 | `architecture.md` | Pattern 6: Execution Service | ✅ Applied |
| 3.2 | `epics.md` | Story 4.1 — target qty + feasibility | ✅ Applied |
| 4.1 | `architecture.md` | Epic→Arch Mapping — Epic 3 (SuggestNext) | ✅ Applied |
| 4.2 | `epics.md` | Story 3.5 *(new)* — Auto-Suggest GRN & SKU | ✅ Applied |
| 5.1 | `epics.md` | Epic 4 overview — UX plan link | ✅ Applied |
| 5.2 | `epics.md` | Epic 5 overview — UX plan link | ✅ Applied |
| 5.3 | `epics.md` | Epic 6 overview — UX plan link | ✅ Applied |
| 5.4 | `epics.md` | Epic 7 overview — UX plan link + schema note | ✅ Applied |
| 5.5 | `epics.md` | Story 7.4 *(new)* — Live Role-Specific Dashboards | ✅ Applied |

---

## Section 5: Implementation Handoff

**Change scope classification: Moderate**

All direct artifact edits are complete. The following actions are required from the development workflow:

### Sprint Status Updates Required

The following new stories have been added to `docs/sprint-status.yaml`:

```yaml
2-5-packaging-profile-edit-capability: backlog
3-5-auto-suggest-grn-sku: backlog
7-4-live-role-specific-dashboards: backlog
```

Additionally: `epic-3` status updated from `contexted` → `done`.

### Epic Tech-Spec Updates Required

Before Epic 4 contexting begins, the `docs/tech-spec-epic-4.md` (when created) must incorporate:
- `is_percentage_base` recipe migration as story 4.0 prerequisite
- `execution_service.go` architecture as the primary backend pattern
- RecipeBuilder UX spec from `ui_ux_recipe_packaging_plan.md`

### Handoff Recipients

| Recipient | Action |
|-----------|--------|
| **Scrum Master** | Stories 2.5, 3.5, and 7.4 added to `sprint-status.yaml` ✅; Epic 3 marked `done` ✅ |
| **Development Team** | Epic 4 kickoff: apply `is_percentage_base` migration before any recipe-related stories |
| **Product Owner** | Review new stories 3.5 and 7.4 for prioritization within their epics |

### Success Criteria

- [ ] `sprint-status.yaml` includes stories 3.5 and 7.4 in backlog
- [ ] Epic 4 tech-spec references execution service pattern and % recipe prerequisite
- [ ] DB migrations for `is_percentage_base` AND `stock_ledger` financial columns (`unit_cost`, `total_value`) are both planned as first tasks of Epic 4
- [ ] No done stories (Epics 1–3) have been modified in ways that require re-testing
