# Sprint Change Proposal: March 2, 2026

## Objective

Address critical feedback regarding stock segregation, recipe percentage scaling, flexible production inputs, and UX improvements for data entry.

## 1. Segregating Finished Goods Stock: Online vs. Regular

Currently, all Finished Goods sit in a single pool. We need to track them separately based on their intended market.

**Database Changes (`stock_ledger` & `batches` & `material_lots`):**

- Add a `market_segment` column (`VARCHAR` defaulting to `REGULAR`, allowed values: `REGULAR`, `ONLINE`).
- The `GetItemStockBalance` function must be updated to optionally group or filter by this segment.

**Impact:** When executing a "Packing Run", the user will need to specify if the resulting Finished Goods are for the "Online" or "Regular" market.

## 2. Recipe System: 100KG Standard Base (% Yield)

Currently, recipes require hardcoded absolute values (e.g., 20KG of X, 30KG of Y = 50KG of Z). This is rigid.

**Domain Changes (`Recipe` & `RecipeComponent`):**

- Add a `is_percentage_base` boolean to `recipes`.
- When true, the `output_qty_base` is strictly assumed to be `100` (representing 100KG or 100%).
- The `input_qty_base` on components will represent the percentage.
- **Validation Rule:** If `is_percentage_base` is true, the sum of all `input_qty_base` minus `expected_wastage_pct` must equal 100%.

**Impact:** During production, if a worker says "I am making 500KG of Garam Masala", the system multiplies the percentages by 5 to calculate the expected raw material consumption automatically.

## 3. Production Flexibility: Manually Adding Ingredients

Currently, the system rigidly deducts _exactly_ what the recipe dictates. Factory reality involves ad-hoc adjustments.

**Execution Service Changes (The missing Production Engine):**

- When a production run is initiated, the system loads the standard BOM (Bill of Materials) from the recipe.
- We need to introduce a `ProductionRun` payload that takes a list of `ActualConsumedComponents`.
- This payload will allow the worker to:
    1. Adjust the quantity of standard ingredients.
    2. Add an entirely new ingredient not on the base recipe.
- The `stock_ledger` deductions will be driven strictly by the _actual_ consumed list, not the theoretical recipe list.

## 4. Smart Auto-Generation: GRN and SKU Suggestions

The UX goal is to auto-fill input boxes but allow the user to override them.

**API Layer Changes:**

- Create two new endpoints in the Wails app: `SuggestNextSKU(itemType string)` and `SuggestNextGRN()`.
- These endpoints will query the database for the highest current sequence and return the next string format.

**Format Proposals:**

- **GRN Format:** `GRN-{YYYYMMDD}-{DailySequence}` (e.g., `GRN-20260302-001`). This makes it easy to find GRNs by the date they were entered.
- **SKU Format:** `{TypePrefix}-{ZeroPaddedSequence}`.
    - `RAW-001` (Raw Materials)
    - `BLK-001` (Bulk Powder)
    - `PKG-001` (Packing Material)
    - `FIN-001` (Finished Goods)

**Frontend UX:**

- When the "Create Item" or "Create GRN" form mounts, the frontend calls the respective `SuggestNext...` endpoint.
- The returned value is injected into the input field's state.
- Because it's a standard input field, the user can immediately delete it and type "MY-CUSTOM-SKU-123" if they prefer.

## 5. UI/UX Audit Fixes

Please refer to the detailed UI audit document for the list of frontend usability and aesthetic improvements:
**[View UI Audit Document](./ui_audit.md)**

## 6. Modern UX Plan: Recipes & Packaging Profiles

To transform the recipe and packaging profile creation from static forms to interactive visual builders, we have devised a comprehensive modern UX plan.
**[View Recipe & Packaging Profile UX Plan](./ui_ux_recipe_packaging_plan.md)**

## 7. Modern UX Plan: Batches & Execution (Production Engine)

To move beyond basic data entry and create a true "Live Mission Control" for factory execution (Production Runs and Packing Runs), we have outlined a dedicated UX and architectural plan.
**[View Batches & Execution UX Plan](./ui_ux_batch_execution_plan.md)**

## 8. Modern UX Plan: Sales & Dispatch

To complete the inventory lifecycle and ensure strict FIFO controls on outgoing stock, we have outlined a plan for a new "Fulfillment Center" style Dispatch module.
**[View Sales & Dispatch UX Plan](./ui_ux_sales_dispatch_plan.md)**

## 9. Modern UX Plan: Reporting & Analytics (Valuation & Wastage)

To fulfill the PRD's promise of instant real-time stock valuation and automated loss tracking, we have planned an "Executive Command Center" dashboard.
**[View Reporting & Analytics UX Plan](./ui_ux_reporting_plan.md)**

## 10. Modern UX Plan: Role-Specific Dashboards

To provide actionable landing pages rather than generic metrics, we have outlined a strategy for role-specific hubs (Executive Command Center vs. Factory Floor Hub).
**[View Dashboards UX Plan](./ui_ux_dashboards_plan.md)**
