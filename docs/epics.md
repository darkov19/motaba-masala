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

**Goal:** Create the "Digital Twin" configuration layer (Items, Recipes, Suppliers).

- **Scope:** CRUD for all masters, Unit Conversion logic (KG <-> Grams), and Recipe BOM definition.

### 3. Procurement & Inventory (Inbound)

**Goal:** Manage the intake of Raw Materials and Packing Materials with cost tracking.

- **Scope:** GRN, Lot Tracking, Stock Levels, and Re-order alerts. Includes Third-Party Bulk procurement flow.

### 4. Production & Processing (The Core)

**Goal:** Digitally track the physical transformation of spices to ensure accurate valuation and loss tracking.

- **Scope:** Batch creation, Recipe execution, Wastage recording, and "Value Add" calculation (Raw -> Bulk).

### 5. Packing & Finished Goods

**Goal:** Manage conversion of Bulk Powder into Retail SKUs with full traceability.

- **Scope:** Packing material consumption, FG Stock creation, and linking FG Batches back to Source Bulk Batches.

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
**I want** to create users with specific roles (Admin, Store, Factory),
**So that** I can control access to sensitive features like stock valuation.

**Acceptance Criteria:**

- **Given** an Admin user logged in
- **When** they create a new user and assign the "Factory" role
- **Then** that user can access Production screens but CANNOT access "Stock Value" reports
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

---

## Epic 2: Master Data & Configuration

**Goal:** Create the "Digital Twin" configuration layer (Items, Recipes, Suppliers).

### Story 2.1: Item Master Management

**As a** Store Keeper,
**I want** to create and manage Items with specific types (Raw, Bulk, Pack, FG) and Units,
**So that** I can set up the inventory catalog.

**Acceptance Criteria:**

- **Given** the Item Master screen
- **When** I create a new Raw Material "Coriander Seeds" with Base Unit "KG"
- **Then** it is saved to the database
- **And** I can set a "Re-order Level" alert threshold

**Technical Notes:** Item types: RAW, BULK_POWDER, PACKING_MATERIAL, FINISHED_GOOD.

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

### Story 2.3: Recipe (BOM) Management

**As a** Production Manager,
**I want** to define Recipes for Bulk Powders, specifying input ingredients and expected output,
**So that** production batches can auto-calculate consumption.

**Acceptance Criteria:**

- **Given** a Recipe for "Garam Masala Bulk"
- **When** I add ingredients (Cumin, Coriander, etc.) with standard quantities
- **Then** I can save the Bill of Materials (BOM)
- **And** define a standard "Expected Wastage %" for yield benchmarking

**Technical Notes:** Recipe Header (Output Item) -> Recipe Details (Input Items + Qty).

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

**Technical Notes:** Validation: Input Quantity > 0.

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

---

## Epic 4: Production & Processing (The Core)

**Goal:** Digitally track the physical transformation of spices to ensure accurate valuation and loss tracking.

### Story 4.1: Production Batch Creation

**As a** Production Manager,
**I want** to plan a Production Batch for a specific Product (e.g., 200KG Chili Powder),
**So that** the floor team knows what to produce.

**Acceptance Criteria:**

- **Given** the Production Schedule
- **When** I create a new Batch `#BATCH-1001` for "Chili Powder Bulk"
- **Then** the status is set to "Planned"
- **And** I can print a "Job Card" showing the required ingredients (from Recipe)

**Technical Notes:** Batch Statuses: Planned, In-Progress, Completed.

### Story 4.2: Recipe Execution & Material Consumption

**As a** Production Manager,
**I want** to issue raw materials to the batch based on the recipe,
**So that** raw material stock is consumed correctly.

**Acceptance Criteria:**

- **Given** a Batch in "In-Progress"
- **When** I open the "Issue Materials" screen
- **Then** the system shows the _Standard_ recipe quantities (e.g., 200KG Chili Raw)
- **But** the "Actual Issued" column starts BLANK (must be typed to ensure verification)
- **When** I verify and save, "Chili Raw" stock decreases by the actual amount

**Technical Notes:** Link consumption to specific Raw Material Lots (FIFO suggestion).

### Story 4.3: Bulk Output & Wastage Recording

**As a** Production Manager,
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

**Goal:** Manage conversion of Bulk Powder into Retail SKUs with full traceability.

### Story 5.1: Packing Run Creation

**As a** Production Manager,
**I want** to execute a "Packing Run" to convert Bulk Powder into Retail Packs (e.g., 50g Pouches),
**So that** we have sellable Finished Goods.

**Acceptance Criteria:**

- **Given** I have 100KG "Chili Powder (Bulk)" in stock
- **When** I start a Packing Run for "Chili Powder 50g Pouch"
- **And** I select the Source Bulk Batch `#BATCH-1001`
- **Then** the system validates that sufficient bulk quantity exists

**Technical Notes:** Parent-Child relationship: One Bulk Batch -> Many Packing Batches.

### Story 5.2: Packing Material Consumption

**As a** Production Manager,
**I want** to track the consumption of pouches, boxes, and labels during packing,
**So that** packing material inventory is accurate.

**Acceptance Criteria:**

- **Given** a Packing Run for 2000 pieces of "50g Pouch"
- **When** I complete the run
- **Then** the system deducts:
    - 2000 Units of "Pouch Material"
    - 100KG of "Bulk Powder" (2000 \* 50g)
- **And** alerts if stock is insufficient

**Technical Notes:** Handle "Over-packing" (packing slightly more than standard weight) if required, or stick to standard theoretical consumption for MVP.

### Story 5.3: Finished Goods Stock Entry

**As a** Store Keeper,
**I want** to record the final output of the packing run into FG Stock,
**So that** it is available for sales.

**Acceptance Criteria:**

- **Given** the packing is complete
- **When** I confirm the output Quantity (e.g., 100 Boxes of 20 Pouches each)
- **Then** "Chili Powder 50g Pouch" Finished Goods stock increases
- **And** the "Cost Price" of the FG is calculated (Bulk Cost + Packing Material Cost + Overheads)

**Technical Notes:** Roll up costs: (Bulk Cost/g \* Pack Weight) + Packing Cost.

---

## Epic 6: Sales & Dispatch

**Goal:** Manage the outflow of Finished Goods and revenue realization.

### Story 6.1: Sales Order & Dispatch Note

**As a** Sales Manager,
**I want** to create a Dispatch Note for a Customer, selecting items from Finished Goods stock,
**So that** we can ship products.

**Acceptance Criteria:**

- **Given** a customer order
- **When** I select items to dispatch
- **Then** the system shows _Current Available Stock_
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
- **Then** the system automatically selects the Batch with the _earliest expiry date_
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

---

_End of Epic Breakdown_
