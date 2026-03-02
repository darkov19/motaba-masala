# masala_inventory_managment - Epic Breakdown

**Author:** darko
**Date:** 2026-02-12
**Project Level:** V1.0
**Target Scale:** SMB (4-5 users)

---

## Overview

This document provides the complete epic and story breakdown for masala_inventory_managment, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

## Proposed Epics Structure

Based on the [PRD](./PRD.md) and [Product Brief](./product-brief.md), the system is decomposed into **7 Strategic Epics**. This structure prioritizes a strong technical foundation (offline/license support) followed by the natural flow of materials through the factory (Inbound -> Production -> Outbound).

### 1. Core Foundation & Infrastructure

**Goal:** Establish the offline-first runtime environment, secure database, and license enforcement mechanism.

- **Why First?** All functional modules depend on the LAN-based auth, RBAC, and strict hardware-bound licensing required by the business model.

### 2. Master Data & Configuration

**Goal:** Create the "Digital Twin" configuration layer (Items, Recipes, Packaging Profiles, Suppliers).

- **Contract-First Sequencing:** Story execution and references in this epic follow `2.2A -> 2.2B -> 2.2C -> 2.2D -> 2.2` before proceeding with later feature stories.

- **Scope:** CRUD for all masters, Unit Conversion logic (KG <-> Grams), Recipe BOM definition, and reusable Packaging Profile setup for composite packing-material consumption.

### 3. Procurement & Inventory (Inbound)

**Goal:** Manage the intake of Raw Materials and Packing Materials with cost tracking and subtype-aware stock identity.

- **Scope:** GRN, Lot Tracking, Stock Levels, and Re-order alerts. Includes Third-Party Bulk procurement flow and separate procurement of packing-material components (for profile-based packing).

### 4. Production & Processing (The Core)

**Goal:** Digitally track the physical transformation of spices to ensure accurate valuation and loss tracking.

- **Scope:** Batch creation, Recipe execution, Wastage recording, and "Value Add" calculation (Raw -> Bulk).

### 5. Packing & Finished Goods

**Goal:** Manage conversion of Bulk Powder into Retail SKUs with full traceability and profile-driven packing-material deduction.

- **Scope:** Packing material consumption (including composite profiles), FG Stock creation, and linking FG Batches back to Source Bulk Batches.

### 6. Sales & Dispatch

**Goal:** Manage the outflow of Finished Goods and revenue realization.

- **Scope:** Order management, FIFO dispatch logic, Invoice/Challan generation, and Sales Returns.

### 7. Reporting & Analytics

**Goal:** Provide visibility into financial value and operational efficiency.

- **Scope:** Real-time Stock Ledger, Valuation Reports, Wastage Analysis, and Audit Trails.

---

<!-- Epics and Stories details will be generated in the next steps -->

## Epic 1: Core Foundation & Infrastructure

**Goal:** Establish the offline-first runtime environment, secure database, and license enforcement mechanism.

### Story 1.1: Project Initialization & Repo Setup

**As a** Developer,
**I want** to set up the project repository with the correct tech stack and directory structure,
**So that** the team has a solid, consistent foundation for development.

**Acceptance Criteria:**

- **Given** a fresh development environment
- **When** I clone the repository and run the setup script
  **Technical Notes:** Ensure clean separation of concerns and directory structure. Preserve `bmad` directory.

### Story 1.2: Database Schema & Migration System

**As a** Developer,
**I want** a robust local database setup with a migration strategy,
**So that** we can reliably store data and handle schema updates on client machines without data loss.

**Acceptance Criteria:**

- **Given** the application is running
- **When** the server starts up
  **Technical Notes:** Use a robust migration tool. Ensure the database supports high concurrency (e.g., WAL mode if using file-based DB).

### Story 1.3: Hardware-Bound Licensing System

**As a** Business Owner,
**I want** the application to run only on authorized hardware with a valid license file,
**So that** I can prevent unauthorized copying and enforce subscription limits.

**Acceptance Criteria:**

- **Given** a valid license file linked to the machine's Hardware ID
- **When** the application starts
- **Then** it proceeds to the login screen
- **But** if the license is invalid, expired, or for a different machine
- **Then** it blocks access with a critical error message
- **And** checks for system clock tampering (backward jumps)

**Technical Notes:** Use reliable hardware fingerprinting. Sign license with asymmetric cryptography (Private/Public key). Store encrypted timestamp for clock check.

### Story 1.4: Local Authentication & RBAC

**As a** System Admin,
**I want** to create users with specific roles (Admin, Data Entry Operator),
**So that** I can control access to sensitive features like stock valuation.

**Acceptance Criteria:**

- **Given** an Admin user logged in
- **When** they create a new user and assign the "Data Entry Operator" role
- **Then** that user can access operational screens but CANNOT access "Stock Value" reports
- **And** passwords must be hashed (bcrypt)

**Technical Notes:** Stateless authentication recommended (e.g., token-based). Middleware for Role checks.

### Story 1.5: Automated Local Backup Service

**As a** System Admin,
**I want** the system to automatically back up the database daily to a secondary location,
**So that** I can recover data in case of corruption or accidental deletion.

**Acceptance Criteria:**

- **Given** the application is running
- **When** the scheduled time (e.g., 2 AM or auto-trigger) arrives
- **Then** a zipped copy of the SQLite DB is saved to the configured backup folder
- **And** backups older than 7 days are automatically deleted (Rolling retention)

**Technical Notes:** Use a reliable scheduling library. Ensure backup is non-blocking.

### Story 1.6: Server Resilience & Stability

**As a** System Admin,
**I want** the server to be robust against common accidents (accidental closure, hangs),
**So that** the production line isn't interrupted by minor errors.

**Acceptance Criteria:**

- **Given** the Server is running
- **When** I click the "X" button
- **Then** it minimizes to System Tray instead of quitting
- **And** shows a notification "Server is running in background"
- **Given** the server process becomes unresponsive (>30s)
- **When** the Watchdog detects this
- **Then** it automatically restarts the service layer
- **Given** a second instance of Server.exe is launched
- **When** it tries to start
- **Then** it focuses the existing window and terminates itself

### Story 1.7: Client Resilience & Recovery

**As a** Factory Data Operator,
**I want** my work to be saved automatically and connection glitches handled gracefully,
**So that** I don't lose data when the network drops or my PC restarts.

**Acceptance Criteria:**

- **Given** I am typing a long GRN
- **When** the network cable is unplugged
- **Then** the UI shows a "Reconnecting..." overlay
- **And** when plugged back in, it reconnects automatically
- **Given** I have unsaved data in a form
- **When** the client app crashes or I accidentally close it
- **Then** upon restarting, it offers to "Resume Draft" with my data intact
- **Given** I try to navigate away with unsaved changes
- **When** I click a menu item
- **Then** a modal warns "Unsaved Changes. Leave anyway?"

### Story 1.8: Data Integrity Protection

**As a** Business Owner,
**I want** to ensure data is never corrupted by concurrent edits or crashes,
**So that** the inventory numbers are legally reliable.

**Acceptance Criteria:**

- **Given** User A and User B open the same Item
- **When** User A saves changes
- **And** User B tries to save afterwards
- **Then** User B gets an error: "Record modified by another user. Reload required."
- **Given** the server boots up
- **When** it detects a corrupted SQLite file (integrity check fails)
- **Then** it alerts the admin and offers to restore from the latest backup

### Story 1.9: License & Security UX

**As a** System Admin,
**I want** clear warnings about license expiry and hardware changes,
**So that** I can resolve issues without production downtime.

**Acceptance Criteria:**

- **Given** the license expires in < 30 days
- **Then** a warning banner is shown daily
- **Given** the license has expired < 7 days ago
- **Then** the system allows Read-Only access (Grace Period)
- **Given** the Server hardware (Motherboard/Disk) has changed
- **When** I start the app
- **Then** it shows a "Hardware ID Mismatch" error with a "Copy ID" button

### Story 1.10: Installer Hardening

**As a** Deployment Technician,
**I want** the installer to handle firewall rules and shortcuts,
**So that** deployment is plug-and-play.

**Acceptance Criteria:**

- **Given** the Server Installer is running
- **Then** it adds an Inbound Rule to Windows Firewall for the app port (8090)
- **Given** the Client Installer is running
- **Then** it offers a checkbox "Start automatically when Windows starts"

### Story 1.11: Resilience Verification Suite

**As a** QA Tester,
**I want** a set of verification tests for these resilience features,
**So that** we can prove the system is robust.

**Acceptance Criteria:**

- **Given** a running system
- **When** I kill the server process (Simulate Crash)
- **Then** the DB handles recovery via WAL on restart
- **When** I change the Server IP address
- **Then** Clients reconnect via UDP discovery within 5 seconds

- **And** I can set a "Re-order Level" alert threshold

**Technical Notes:** Item types: RAW, BULK_POWDER, PACKING_MATERIAL, FINISHED_GOOD.

---

## Epic 2: Master Data & Configuration

**Goal:** Create the "Digital Twin" configuration layer (Items, Recipes, Packaging Profiles, Suppliers).

### Story 2.1: Item Master Management

**As a** Store Keeper,
**I want** to create and manage Items with specific types (Raw, Bulk, Pack, FG) and Units,
**So that** I can set up the inventory catalog.

**Acceptance Criteria:**

- **Given** the Item Master screen
- **When** I create a new Raw Material "Coriander Seeds" with Base Unit "KG"
- **Then** it is saved to the database
- **And** the same `masters.items` route provides separate type-specific views for Raw, Bulk Powder, Packing Material, and Finished Goods records
- **And** when I create Packing Material items, I can assign a subtype (e.g., `JAR_BODY`, `JAR_LID`, `CUP_STICKER`) for operational grouping
- **And** I can define a reusable Packaging Profile (e.g., `Jar Pack`) that maps one packing selection to multiple packing-material components and per-unit quantities

**Source Mapping:** PRD `FR-001A` (Item Master canonical structure + type-specific views), PRD `FR-009A` (composite packing profile behavior).

### Story 2.2D: AppShell UX Conformance Hardening

**As a** project stakeholder,
**I want** the shared AppShell implementation to match the approved UX behavior and visual direction across Server and Client modes,
**So that** the product experience stays cohesive and later feature UIs do not inherit shell-level UX drift.

**Acceptance Criteria:**

- **Given** the app shell is loaded on `Server.exe` and `Client.exe`
- **When** the user scrolls page content
- **Then** the window title bar and app header remain fixed
- **And** only the workspace content region scrolls
- **And** shell chrome behavior is consistent with desktop UX expectations

- **Given** an Admin user logs in
- **When** the dashboard route is active
- **Then** the landing surface reflects command-center intent (decision-oriented summary cues), not a generic placeholder-only workspace

- **Given** a Data Entry Operator logs in
- **When** the dashboard route is active
- **Then** the landing surface reflects speed-hub intent (task-first quick actions and recent/operational context), not Admin-focused presentation density

- **Given** sidebar and shell surfaces are rendered
- **When** compared against approved UX design direction
- **Then** spacing, typography hierarchy, and visual density align with Story 2.2B UX references
- **And** shell theming details (including scrollbar/chrome polish) are internally consistent

- **Given** startup or initial request failures occur
- **When** feedback is displayed
- **Then** errors are deduplicated and actionable
- **And** the UI avoids repetitive toast spam that obscures context

- **Given** shell UX conformance work is complete
- **When** validation runs
- **Then** regression tests cover corrected shell behavior and role-specific surfaces
- **And** screenshot evidence for server/client shell states is captured for review

**Technical Notes:** This corrective story follows Story 2.2C and must complete before Story 2.2 implementation continues.
Must preserve route/module naming and role constraints from `docs/navigation-rbac-contract.md`.

### Story 2.2E: Authentication UX, Session Lifecycle, and Admin User Management

**As a** System Admin and authenticated user,
**I want** a complete authentication lifecycle (login, session handling, logout) and an actionable Admin users screen,
**So that** access control works end-to-end in the real UI and Admin can provision users safely.

**Acceptance Criteria:**

- **Given** no valid session token exists
- **When** the app starts
- **Then** the user sees a login screen before entering shell routes
- **And** shell/module routes are not accessible until successful login

- **Given** valid credentials are submitted
- **When** login succeeds
- **Then** the user enters the role-appropriate shell landing experience
- **And** protected requests use the authenticated session token

- **Given** an authenticated session has expired (24h JWT baseline)
- **When** the user attempts a protected action
- **Then** the app redirects to login with a clear session-expired message
- **And** the user must re-authenticate

- **Given** an authenticated user chooses logout
- **When** logout is confirmed
- **Then** session token/state is cleared from storage
- **And** the app returns to login state

- **Given** an Admin opens `System > Users` (`/system/users`)
- **When** they submit username, password, and role
- **Then** the app calls backend create-user flow and shows success/error feedback
- **And** non-Admin users cannot access this surface

- **Given** auth lifecycle implementation is complete
- **When** validation runs
- **Then** tests cover login success/failure, expiry redirect, logout behavior, and admin-only users access

**Technical Notes:** This story closes the auth UX/session lifecycle gap identified by Correct Course on 2026-02-26.
Must preserve backend-authoritative authorization boundaries and `docs/navigation-rbac-contract.md` route identity.

### Story 2.2: Unit Conversion Engine

**As a** Developer,
**I want** a standardized way to handle conversions between Buying Units (KG) and Usage Units (Grams),
**So that** inventory calculations are thorough and accurate.

**Acceptance Criteria:**

- **Given** an item "Chili Powder" tracked in KG
- **When** a recipe requires "500 Grams"
- **Then** the system correctly deducts "0.5 KG" from stock
- **And** verifies precision to avoid rounding errors

**Technical Notes:** Store everything in Base Unit internally. UI handles display conversion.
Must align route/module naming and role constraints with `docs/navigation-rbac-contract.md` (Story 2.2A baseline).
This story is intentionally sequenced after Story 2.2D shell UX conformance hardening to ensure implementation continues on a verified cohesive shell baseline.

### Story 2.3: Recipe (BOM) Management

**As a** Data Entry Operator,
**I want** to define Recipes for Bulk Powders, specifying input ingredients and expected output,
**So that** production batches can auto-calculate consumption.

**Acceptance Criteria:**

- **Given** a Recipe for "Garam Masala Bulk"
- **When** I add ingredients (Cumin, Coriander, etc.) with standard quantities
- **Then** I can save the Bill of Materials (BOM)
- **And** define a standard "Expected Wastage %" for yield benchmarking

**Technical Notes:** Recipe Header (Output Item) -> Recipe Details (Input Items + Qty).
Navigation access and role capability assumptions must remain consistent with `docs/navigation-rbac-contract.md`.
**Planned Extension (Epic 4 prerequisite):** Recipes will gain an `is_percentage_base` flag (migration at Epic 4 start). When enabled, component quantities represent percentages of a 100-unit base, and the Recipe Builder UI will enforce that the sum of components equals 100%. Production runs use this to auto-scale to any target output quantity.

### Story 2.4: Supplier & Customer Masters

**As a** Admin,
**I want** to manage a list of Suppliers and Customers,
**So that** I can link purchases and sales to specific entities.

**Acceptance Criteria:**

- **Given** the Master screens
- **When** I add a Supplier
- **Then** I can record their contact details and standard lead time
- **And** similarly for Customers/Channels (e.g., "Main Distributor", "Flipkart")

**Technical Notes:** Standard CRUD.
Role and module access assumptions must remain consistent with `docs/navigation-rbac-contract.md`.

### Story 2.5: Packaging Profile Edit Capability

**As a** Data Entry Operator,
**I want** to edit an existing Packaging Profile after it has been created,
**So that** I can correct component quantities or add new components without deleting and recreating the profile.

**Acceptance Criteria:**

- **Given** an existing Packaging Profile (e.g., "100g Glass Jar Pack")
- **When** I click "Edit" on the profile in the list
- **Then** the PackagingProfile Builder opens pre-populated with all existing components
- **And** I can update the `QtyPerUnit` for any existing component
- **And** I can add new packing material components to the profile
- **And** I can remove a component from the profile
- **When** I save the updated profile
- **Then** the changes are persisted and the profile is available for future Packing Runs
- **And** any Packing Runs already completed using the old profile version are unaffected (historical integrity)

**Technical Notes:** Currently the PackagingProfileForm has no edit path — only create is supported (identified in `ui_ux_recipe_packaging_plan.md`). Implement `UpdatePackagingProfile` backend method and wire the "Edit" action in the profile list to open the Builder in edit mode. Use the `PackagingProfileBuilder.tsx` component (introduced as Epic 4 UX prerequisite) for the edit UI. See [Recipe & Packaging Profile UX Plan](./ui_ux_recipe_packaging_plan.md).

---

<!-- Next Epics: Procurement, Production, Packing -->

## Epic 3: Procurement & Inventory (Inbound)

**Goal:** Manage the intake of Raw Materials and Packing Materials with cost tracking.

### Story 3.1: Goods Received Note (GRN) - Standard

**As a** Store Keeper,
**I want** to record the receipt of Raw Materials and Packing Materials from suppliers,
**So that** inventory stock is increased and costs are tracked.

**Acceptance Criteria:**

- **Given** a delivery of 100KG Chili
- **When** I create a GRN against a Supplier
- **Then** the stock of "Chili (Raw)" increases by 100 KG
- **And** the "Last Purchase Price" and "Weighted Average Cost" of the item are updated
- **And** I can enter the Invoice Number for reference
- **And** for packing materials, I can procure profile components (e.g., Jar Body, Jar Lid, Cup Sticker) as separate line items with independent stock balances

**Technical Notes:** Validation: Input Quantity > 0. Packing profile components remain separately stocked at procurement time and are only grouped during packing execution.

### Story 3.2: Lot Tracking System

**As a** Quality Manager,
**I want** to assign a unique Internal Lot Number to every incoming shipment,
**So that** we can trace any defect back to the specific supplier delivery.

**Acceptance Criteria:**

- **Given** I am creating a GRN
- **When** I save the entry
- **Then** the system automatically generates a Lot Number (e.g., `LOT-20260212-001`)
- **And** this Lot Number is printed on a label (feature for future, just store for now)
- **And** all stock movements of this material track this Lot ID

**Technical Notes:** Lot Table: ID, ItemID, GRN_Ref, Qty, ExpiryDate.

### Story 3.2B: Procurement Lots Route Enablement

**As a** Quality Manager and Data Entry Operator,
**I want** the `procurement.lots` route to render an operational lot lookup surface with role-safe access,
**So that** inbound lot traceability is usable from the shell contract instead of remaining a placeholder.

**Acceptance Criteria:**

- **Given** an authenticated Admin or Data Entry Operator
- **When** they open route `procurement.lots`
- **Then** the application renders a functional lots page (not placeholder messaging)
- **And** it lists lot records with core traceability fields (Lot Number, GRN Reference, Supplier, Item, Quantity, Created At)
- **And** keyboard-first navigation supports filter input and search submission

- **Given** the lots page is used for lookup
- **When** the user applies filters (`search`, `lot_number`, `grn_number`, `supplier`, optional `item_id`)
- **Then** results are fetched via backend lot-listing contract and displayed deterministically
- **And** empty/error states are explicit and non-spammy

- **Given** route and action authorization boundaries
- **When** unauthorized or forbidden access is attempted
- **Then** backend-authoritative access controls are enforced (`401/403`)
- **And** frontend role guards do not bypass server authorization behavior

- **Given** this story is completed
- **When** automated tests run
- **Then** route rendering, filtering behavior, and `400/401/403` contract mappings are covered by frontend/API tests

**Technical Notes:** Reuse Story 3.2 lot query contracts (`ListMaterialLots`, `/inventory/lots/list`) and complete only the route/page enablement and UX conformance gap.

### Story 3.3: Third-Party Bulk Procurement

**As a** Store Keeper,
**I want** to purchase "Bulk Powder" directly from a third party when our own production is down,
**So that** we can continue packing and selling.

**Acceptance Criteria:**

- **Given** a need to buy 500KG "Garam Masala Bulk"
- **When** I enter a GRN for this item
- **Then** it is added to "Bulk Stock" (not Raw Material stock)
- **And** it is flagged as "Source: External" for traceability
- **And** it becomes available for the Packing Process immediately

**Technical Notes:** Re-use GRN logic but allow selection of Bulk Items. Differentiate via Item 'Source' flag if needed, or just Item Type.

### Story 3.4: Stock Reconciliation & Audit

**As a** Store Keeper,
**I want** to manually adjust stock levels based on physical counts,
**So that** the system matches reality (fixing drift/errors).

**Acceptance Criteria:**

- **Given** a physical count of "50 KG" but system says "52 KG"
- **When** I enter a Stock Reconciliation
- **Then** the system adjusts stock to 50 KG
- **And** creates a "Stock Adjustment" transaction with a mandatory Reason Code (e.g., "Spoilage", "Audit Correction")
- **And** logs this event in the Audit Trail

**Technical Notes:** No deletion of transactions. Make a correcting entry (+/-).

### Story 3.5: Auto-Suggest GRN Number & Item SKU

**As a** Data Entry Operator,
**I want** the system to suggest the next GRN number and Item SKU when I open the relevant forms,
**So that** I don't have to manually track sequences or risk duplicate codes.

**Acceptance Criteria:**

- **Given** I open the "Create GRN" form
- **When** the form mounts
- **Then** the GRN Number field is pre-filled with the next suggested value in the format `GRN-{YYYYMMDD}-{DailySequence}` (e.g., `GRN-20260302-001`)
- **And** I can clear and type a custom GRN number if I prefer

- **Given** I open the "Create Item" form
- **When** the form mounts and I select an Item Type
- **Then** the SKU field is pre-filled with the next suggested value for that type prefix:
    - `RAW-001` (Raw Materials)
    - `BLK-001` (Bulk Powder)
    - `PKG-001` (Packing Material)
    - `FIN-001` (Finished Goods)
- **And** I can clear and type a custom SKU if I prefer
- **And** the suggestion updates if I change the Item Type before saving

- **Given** two operators open the form simultaneously
- **When** both submit with the same suggested value
- **Then** the DB unique constraint on SKU / GRN number rejects the duplicate
- **And** the losing operator sees a clear error and the form offers a new suggestion

**Technical Notes:** Two new read-only Wails endpoints: `SuggestNextGRN()` and `SuggestNextSKU(itemType string)`. Each runs a MAX+1 query against the relevant table filtered by date (GRN) or type prefix (SKU). Frontend calls on form mount via `useEffect`; result is injected into field state. No reservation/locking — uniqueness enforced by DB constraint at save time.

---

## Epic 4: Production & Processing (The Core)

**Goal:** Digitally track the physical transformation of spices to ensure accurate valuation and loss tracking.

**UX Reference:** [Batches & Execution UX Plan](./ui_ux_batch_execution_plan.md) — `ProductionRunTerminal.tsx` and `PackingRunTerminal.tsx` replace standard forms with live "Mission Control" dashboards. Recipe Builder UX ([Recipe & Packaging Plan](./ui_ux_recipe_packaging_plan.md)) applies to the % base recipe editor introduced as an Epic 4 prerequisite.

### Story 4.1: Production Batch Creation

**As a** Data Entry Operator,
**I want** to plan a Production Batch for a specific Product (e.g., 200KG Chili Powder),
**So that** the floor team knows what to produce.

**Acceptance Criteria:**

- **Given** the Production Schedule
- **When** I create a new Batch `#BATCH-1001` for "Chili Powder Bulk"
- **And** I enter the Target Output Quantity (e.g., 500 KG)
- **Then** the status is set to "Planned"
- **And** the system pre-calculates required ingredient quantities (scaling % recipe by target if `is_percentage_base = true`)
- **And** I can view a "Job Card" showing ingredient requirements with live stock availability indicators (sufficient / shortage) per ingredient
- **And** the "Start Production" action is blocked if any required ingredient is in shortage

**Technical Notes:** Batch Statuses: Planned, In-Progress, Completed. Target quantity drives the YieldCalculator scaling at batch creation time.

### Story 4.2: Recipe Execution & Material Consumption

**As a** Data Entry Operator,
**I want** to issue raw materials to the batch based on the recipe,
**So that** raw material stock is consumed correctly.

**Acceptance Criteria:**

- **Given** a Batch in "In-Progress"
- **When** I open the "Issue Materials" screen
- **Then** the system shows the _Standard_ recipe quantities scaled to the target output (e.g., for a % recipe: Target 500KG × 40% = 200KG Chili Raw)
- **But** the "Actual Issued" column starts BLANK (must be typed to ensure verification)
- **And** the operator may adjust any ingredient quantity (Override input per line)
- **And** the operator may add an ingredient not on the base recipe ("Add Extra Ingredient")
- **When** I verify and save, stock decreases by the ACTUAL consumed quantities (not the theoretical recipe quantities)
- **And** the `stock_ledger` deductions reference the specific consumed lots

**Technical Notes:** Link consumption to specific Raw Material Lots (FIFO suggestion). Backend uses `ProductionRun` payload with `ActualConsumedComponents []ConsumedComponent` struct. Ledger deductions are driven entirely by the actual list.

### Story 4.3: Bulk Output & Wastage Recording

**As a** Data Entry Operator,
**I want** to record the final weight of the Bulk Powder produced and any wastage,
**So that** we know the yield and close the loop.

**Acceptance Criteria:**

- **Given** the grinding/mixing is done
- **When** I weigh the final output (e.g., 195 KG) and Sweepings/Waste (e.g., 2 KG)
- **Then** "Chili Powder Bulk" stock increases by 195 KG
- **And** "Process Loss" is recorded as 3 KG (2KG Waste + 1KG Invisible/Moisture loss)
- **And** the Batch is marked "Completed"

**Technical Notes:** Calculate Yield % automatically. Alert if Loss > Standard Tolerance.

### Story 4.4: "Value Add" Cost Validation

**As a** Admin,
**I want** the system to calculate the cost per KG of the produced bulk,
**So that** our inventory value remains accurate after transformation.

**Acceptance Criteria:**

- **Given** I consumed 200KG Raw Material @ ₹100/kg (₹20,000 Total)
- **And** produced 195KG Bulk Output
- **When** the batch completes
- **Then** the Cost of the Bulk Item should be `(Total Input Cost / Output Qty)` = ₹20,000 / 195 = ~₹102.56/kg
- **And** this value is used for future Packing calculations

**Technical Notes:** Weighted Average calculation. Exclude wastage from Qty divisor to load cost onto good stock.

---

<!-- Next Epics: Packing, Sales, Reporting -->

## Epic 5: Packing & Finished Goods

**Goal:** Manage conversion of Bulk Powder into Retail SKUs with full traceability and profile-driven packing-material deduction.

**UX Reference:** [Batches & Execution UX Plan](./ui_ux_batch_execution_plan.md) — `PackingRunTerminal.tsx` handles the Packing Run flow including market segment selection, profile-driven feasibility check, and atomic dispatch.

### Story 5.1: Packing Run Creation

**As a** Data Entry Operator,
**I want** to execute a "Packing Run" to convert Bulk Powder into Retail Packs (e.g., 50g Pouches),
**So that** we have sellable Finished Goods.

**Acceptance Criteria:**

- **Given** I have 100KG "Chili Powder (Bulk)" in stock
- **When** I start a Packing Run for "Chili Powder 50g Pouch"
- **And** I select the Source Bulk Batch `#BATCH-1001`
- **And** I select the Market Segment (`REGULAR` or `ONLINE`) for the output Finished Goods
- **Then** the system validates that sufficient bulk quantity exists
- **And** when I select a profile-based pack type (e.g., Jar Pack), the run preloads all mapped packing-material components and required per-unit quantities
- **And** the run validation checks both bulk quantity and all mapped packing-material component availability before allowing completion

**Technical Notes:** Parent-Child relationship: One Bulk Batch -> Many Packing Batches. Packing profiles define the component set consumed per output unit.

### Story 5.2: Packing Material Consumption

**As a** Data Entry Operator,
**I want** to track the consumption of pouches, boxes, labels, and other profile components during packing,
**So that** packing material inventory is accurate.

**Acceptance Criteria:**

- **Given** a Packing Run for 2000 pieces of "50g Pouch"
- **When** I complete the run
- **Then** the system deducts:
    - 2000 Units of "Pouch Material"
    - 100KG of "Bulk Powder" (2000 \* 50g)
- **And** alerts if stock is insufficient
- **Given** a Packing Run uses a profile-based pack type (e.g., Jar)
- **When** I complete the run for 1000 units
- **Then** the system deducts all mapped components together (e.g., 1000 Jar Bodies + 1000 Lids + 1000 Cup Stickers)
- **And** blocks commit if any one component is short

**Technical Notes:** Handle "Over-packing" (packing slightly more than standard weight) if required, or stick to standard theoretical consumption for MVP. For profile-based packs, use atomic component deduction and block completion on any component shortfall.

### Story 5.3: Finished Goods Stock Entry

**As a** Store Keeper,
**I want** to record the final output of the packing run into FG Stock,
**So that** it is available for sales.

**Acceptance Criteria:**

- **Given** the packing is complete
- **When** I confirm the output Quantity (e.g., 100 Boxes of 20 Pouches each)
- **Then** "Chili Powder 50g Pouch" Finished Goods stock increases in the selected Market Segment pool (`REGULAR` or `ONLINE`)
- **And** the FG batch is permanently tagged with that segment for all downstream dispatch and reporting queries
- **And** the "Cost Price" of the FG is calculated (Bulk Cost + Packing Material Cost + Overheads)
- **And** when a packaging profile is used, FG cost includes all consumed profile components (e.g., Jar Body + Lid + Cup Sticker) based on their effective item costs

**Technical Notes:** Roll up costs: (Bulk Cost/g \* Pack Weight) + Packing Cost. For profile-based packs, `Packing Cost` is the sum of all mapped component costs at consumed quantities.

---

## Epic 6: Sales & Dispatch

**Goal:** Manage the outflow of Finished Goods and revenue realization.

**UX Reference:** [Sales & Dispatch UX Plan](./ui_ux_sales_dispatch_plan.md) — `DispatchTerminal.tsx` with POS-style cart, FIFO auto-allocator, and market segment filtering. Returns flow handles GOOD vs DAMAGED condition routing.

### Story 6.1: Sales Order & Dispatch Note

**As a** Sales Manager,
**I want** to create a Dispatch Note for a Customer, selecting items from Finished Goods stock,
**So that** we can ship products.

**Acceptance Criteria:**

- **Given** a customer order
- **When** I select a Customer and a Market Segment (`REGULAR` or `ONLINE`)
- **And** I select items to dispatch
- **Then** the system shows _Current Available Stock_ filtered to that segment
- **And** prevents selecting Finished Good stock from a different segment
- **And** prevents selecting "Bulk Powder" (as per FR-012)
- **And** reduces stock upon confirmation

**Technical Notes:** Status: Draft -> Confirmed -> Dispatched.

### Story 6.2: FIFO Dispatch Suggestion

**As a** Store Keeper,
**I want** the system to suggest the oldest batches first (FIFO),
**So that** we minimize stock expiring.

**Acceptance Criteria:**

- **Given** I am dispatching "Garam Masala 100g"
- **When** I need 50 Boxes
- **Then** the system automatically selects the oldest Batch within the selected Market Segment with the _earliest expiry date_
- **And** batches from the other segment are never suggested or allocated
- **But** allows me to manually override if needed

**Technical Notes:** Default sorting by Expiry Date ASC.

### Story 6.3: Invoice Generation (PDF)

**As a** Admin,
**I want** to generate a PDF Invoice/Challan for the dispatch,
**So that** the driver has valid documentation.

**Acceptance Criteria:**

- **Given** a confirmed Dispatch
- **When** I click "Print Invoice"
- **Then** a PDF is generated with Customer Details, Line Items, and Total Value
- **And** it is saved locally for records

**Technical Notes:** Use a robust PDF generation library. Template should be professional.

### Story 6.4: Sales Returns

**As a** Sales Manager,
**I want** to process returns from customers,
**So that** stock is added back (if good) or written off (if damaged).

**Acceptance Criteria:**

- **Given** a return of 10 boxes
- **When** I enter the Return Note
- **Then** I must specify "Condition": Good (Return to Stock) or Damaged (Write Off)
- **And** the stock ledger updates accordingly

**Technical Notes:** Link to original Invoice if possible.

---

## Epic 7: Reporting & Analytics

**Goal:** Provide visibility into financial value and operational efficiency.

**UX Reference:** [Reporting & Analytics UX Plan](./ui_ux_reporting_plan.md) and [Dashboards UX Plan](./ui_ux_dashboards_plan.md).

**Schema prerequisite:** `stock_ledger` table requires `unit_cost REAL` and `total_value REAL` columns (new migration at **Epic 4 start** — Production Runs are the first writers of financial context; Epic 7 reads what Epics 4–6 wrote). GRN creation populates inbound cost; Production Run execution transfers blended cost to bulk batch ledger entries.

### Story 7.1: Real-Time Stock Ledger

**As a** Business Owner,
**I want** to see a view of all items with their current Quantity and Value,
**So that** I know my total inventory position instantly.

**Acceptance Criteria:**

- **Given** the Dashboard
- **When** I view "Stock Summary"
- **Then** I see columns: Item Name, Category (Raw/Bulk/FG), Qty, Unit, Avg Cost, Total Value
- **And** a "Grand Total Value" at the bottom

**Technical Notes:** `SELECT sum(qty * avg_cost)`. Performance optimization: Cached stats if needed, or indexed queries.

### Story 7.2: Wastage Analysis Report

**As a** Business Owner,
**I want** a weekly report showing top wastage-generating products/batches,
**So that** I can identify inefficiencies.

**Acceptance Criteria:**

- **Given** production data
- **When** I run the "Wastage Report"
- **Then** it shows Total Wastage Qty and % Loss per Product
- **And** highlights batches exceeding the "Standard Loss %" in RED

**Technical Notes:** Aggregation query.

### Story 7.3: Audit Trail & Data Integrity

**As a** Admin,
**I want** a "Black Box" log of all sensitive actions (Stock adjustments, Price changes),
**So that** I can investigate discrepancies.

**Acceptance Criteria:**

- **Given** an action is performed
- **When** I view the Audit Log
- **Then** I see: Timestamp, User, Action Type, Old Value, New Value
- **And** this log cannot be deleted from the UI

**Technical Notes:** Immutable table `audit_logs`.

### Story 7.4: Live Role-Specific Dashboards

**As a** Business Owner (Admin) and Factory Operator,
**I want** a dashboard that immediately shows what needs my attention when I log in,
**So that** I don't have to navigate menus to find critical information.

**Acceptance Criteria:**

- **Given** an Admin logs in
- **When** the dashboard route loads
- **Then** the Admin sees the "Executive Command Center":
    - Real-time total inventory value (Raw + Bulk + Packing + FG)
    - "Bleed" alert widget: batches with actual wastage > expected wastage %
    - Critical re-order alerts: items below `minimum_stock` threshold
    - Recent activity stream: high-value system events with user attribution

- **Given** a Data Entry Operator logs in
- **When** the dashboard route loads
- **Then** the Operator sees the "Factory Floor Hub":
    - Quick Action buttons: Receive Goods (GRN), Start Production Run, Start Packing Run, Dispatch Order
    - Resume draft card: if `useAutoSave` has a stored draft, prompt to resume
    - Stock-out blockers: active recipes impossible to run due to shortages

- **Given** a single backend call is made on dashboard load
- **Then** one aggregator endpoint returns all data needed for the role view (`GetAdminDashboardStats` / `GetOperatorDashboardAlerts`)

**Technical Notes:** Dedicated components `AdminDashboard.tsx` and `OperatorDashboard.tsx` under `frontend/src/pages/dashboards/`. Role determined from JWT token claim. Default `/` route redirects by role. Remove monolithic `renderDashboard` logic from `App.tsx`. See [Dashboards UX Plan](./ui_ux_dashboards_plan.md).

---

_End of Epic Breakdown_
