# Modern UX Plan: Reporting & Analytics (Valuation & Wastage)

## Current State Analysis

Currently, the reporting module is a stub. The `stock_ledger` tracks physical quantity movements (`IN`, `OUT`, `ADJUSTMENT`) but lacks the financial context (`unit_cost` or `value_change`). There is no UI for Production Yield or Wastage Analysis, which are core promises of the PRD ("Instant real-time visibility of Stock Value... Automated Loss Tracking").

## The Goal: "Executive Command Center"

The reporting module must provide the Admin/Owner with instant, actionable insights. Instead of raw data dumps, the system should highlight anomalies, calculate financial exposure, and automatically identify the most inefficient production runs.

---

## 1. Real-Time Valuation Dashboard

This is the primary financial view, restricting access to Admin roles.

### Layout & Flow

- **The KPI Header:**
    - Total Inventory Value (Large, prominent).
    - Value Breakdown by Category (Raw Materials, Bulk Powder, Packing Material, Finished Goods).
- **The Valuation Grid (The Core):**
    - A table showing every item, its current physical stock balance, and its Weighted Average Cost (WAC) or FIFO-based value.
    - **Visual Trend:** A sparkline showing the 30-day stock level trend.
- **Drill-Down Capability:**
    - Clicking an item opens its specific `Stock Ledger`, showing the chronological history of every `IN`, `OUT`, and `ADJUSTMENT` movement, along with the running financial balance.

## 2. Automated Wastage & Yield Analysis

This report acts as an automated auditor for the factory floor.

### Layout & Flow

- **The "Top Losers" Widget (Actionable Insight):**
    - A card immediately highlighting the top 3 batches in the last 7 days that deviated most negatively from their Recipe's `ExpectedWastagePct`.
    - _Example:_ "Batch #B-Turmeric-105: Expected 2% loss, Actual 8% loss. Financial impact: -$150."
- **Yield Comparison Matrix:**
    - A visual comparison of different production runs for the same recipe.
    - Allows the manager to see if a specific operator or specific raw material supplier correlates with higher wastage.
- **Wastage Categorization Chart:**
    - A pie chart or bar graph breaking down `stock_adjustments` by their `ReasonCode` (Spoilage, Damage, Audit Correction) to identify systemic operational issues.

## Technical Implementation Path

1.  **Database Evolution (`stock_ledger`):**
    - We must add `unit_cost` and `total_value` columns to the `stock_ledger` table.
    - When a GRN is created, the inbound lot cost populates the ledger.
    - When a Production Run occurs, the "Cost Averager" service must calculate the blended cost of consumed raw materials and transfer that exact financial value to the newly created Bulk Batch ledger entry.
2.  **Reporting API (`internal/app/report/service.go`):**
    - Replace the stubs with complex, read-only SQL aggregation queries.
    - Implement `GetWastageAnalysis(timeRange)` and `GetYieldVariances()`.
3.  **UI Components:**
    - Build `ValuationDashboard.tsx` and `WastageReport.tsx` utilizing Ant Design's Data Display components (Statistics, Charts) combined with deep-linking to specific batch records.
