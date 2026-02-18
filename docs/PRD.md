# masala_inventory_managment - Product Requirements Document

**Author:** darko
**Date:** 2026-02-12
**Version:** 1.0

---

## Executive Summary

A comprehensive inventory and production management system designed to replace manual Excel workflows with a robust, real-time tracking solution for spice manufacturing. The system ensures accurate stock valuation, batch tracking, and seamless management of both in-house production and third-party procurement.

### What Makes This Special

Instant real-time visibility of **Stock Value** at every stage (Raw -> Bulk -> Finished), coupled with **Automated Loss Tracking** that reveals inefficiencies. A true end-to-end digital twin of the factory floor that eliminates the "black box" of production and sales.

---

## Project Classification

**Technical Type:** On-Premise B2B Web Application
**Domain:** Manufacturing & Supply Chain
**Complexity:** Medium (Business Logic intensive)

**Deployment:** On-Premise Windows Server with browser-based LAN clients
**Users:** Factory Managers, Store Keepers, Admin/Owner (4-5 concurrent users)

### Domain Context

The system operates in a **Food Manufacturing** context, specifically Spices.
**Key Constraints:**

- **Unit Complexity:** seamless conversion between purchasing units (KG, Tons) and packing units (Grams, Pieces, Boxes).
- **Process Variance:** Must handle two distinct flows: In-house manufacturing (Raw -> Bulk -> Pack) and Third-party procurement (Bulk -> Pack).
- **Valuation:** Inventory value must be tracked dynamically as materials change form.

---

## Success Criteria

1.  **Inventory Accuracy:** Physical stock vs. System stock variance reduced to < 5% within the first 3 months.
2.  **Valuation Speed:** "Real-time" stock valuation available instantly (vs. days of manual calculation).
3.  **Loss Visibility:** Weekly "Wastage Report" identifies top 3 loss-making batches automatically.
4.  **Process Adherence:** 100% of production batches and dispatches recorded in the system (No side-channel operations).

### Business Metrics

**Financial:** Monthly stock valuation for bank/internal audit is generated in < 1 hour.
**Operational:** Eliminate stock-outs of critical raw materials through re-order level alerts.

---

## Product Scope

### MVP - Minimum Viable Product

**Core Modules (All Essential Flows Included):**

1.  **Masters Management:** Items (Raw, Bulk, Pack, FG), Suppliers, Customers, Recipes (BOM).
2.  **Procurement:** Purchase Orders & GRN for Raw Spices, Packing Material, and **Third-Party Bulk**.
3.  **Production (In-House):**
    - Batch Management (Process Inputs -> Bulk Output).
    - Recipe-based consumption (Auto-fetch ingredients).
    - Wastage/Loss recording at production stage.
4.  **Stock Management:**
    - Multi-stage tracking: Raw Material -> Bulk Powder -> Finished Goods.
    - **Unit Conversion Engine:** Handle KG -> Grams/Pieces seamlessly.
5.  **Packing Process:**
    - Conversion of Bulk (In-House OR Third-Party) -> Retail Packs.
    - Packing Material consumption tracking.
6.  **Sales & Dispatch:** Order management and inventory deduction.
7.  **Reporting:**
    - Real-time Stock Ledger (Quantity + Value).
    - Production Yield Reports.
    - Wastage Analysis.

### Growth Features (Post-MVP)

- **Advanced Demand Forecasting:** AI-based prediction of raw material needs.
- **Supplier Portal:** Allow suppliers to view requirements and submit quotes.
- **Mobile App:** Dedicated native mobile app for floor staff (MVP is Mobile-Responsive Web on LAN).

### Vision (Future)

- **Full ERP Integration:** Tally/Accounting software sync.
- **IoT Integration:** Connected weighing scales for auto-data capture.
- **Blockchain:** Traceability for source-to-fork certification.

---

## Domain-Specific Requirements

- **Food Safety / Traceability:**
    - **Expiration Date Tracking:** Mandatory for all Raw Materials and Finished Goods.
    - **Batch Recall Support:** System must be able to identify all Customers who received a specific Batch of Masala if a raw material defect is found.
- **Unit of Measurement (UOM) Handling:**
    - **Dual UOM:** Buying in KGs, consuming in Grams, packing in Pieces. System handles conversion automatically based on defined "Pack Weight".
    - **Loss Factors:** Standard process loss % defined per product to benchmark actual vs expected yield.

This section shapes all functional and non-functional requirements below.

---

## Innovation & Novel Patterns

**Digital Twin of the Factory:**
Unlike standard inventory apps that just count stock, this system models the _transformation_ of materials.

- **Real-Time "Value Add" Tracking:** As labor and packaging are added to raw spices, the system instantly updates the _value_ of the stock, not just the count.

### Validation Approach

- **Parallel Run:** Run the new system alongside the old Excel sheets for 2 weeks to verify "Closing Stock" values match.
- **Floor Test:** Have factory workers use the tablet interface to ensure "Recipe Execution" is simpler than their current paper logs.

---

## On-Premise Deployment & Infrastructure

### Deployment Model

- **Architecture:** Client-Server model using **Distributed Wails** applications.
    - **Server Node:** Windows PC running `Server.exe` (Hosts SQLite DB, API, and Admin UI).
    - **Client Nodes:** Windows PCs running `Client.exe` (Factory/Store terminals connecting via LAN).
- **Networking:**
    - **UDP Discovery:** Client apps automatically find the Server on the LAN (Zero-Config).
    - **Communication:** Secure JSON-RPC over TCP/HTTP between Client and Server.
- **No Internet Required:** Fully functional offline LAN ecosystem.
- **Updates:** Technician updates `Server.exe`; Clients auto-update or are updated via shared folder.

### Licensing & Subscription

- **Business Model:** Annual subscription per customer deployment.
- **Hardware-Bound License:**
    - **Server Bound:** License is tied strictly to the **Server PC's** Hardware ID (Motherboard + Disk).
    - **Client Freedom:** Client terminals do NOT require separate licenses; they validate against the Server.
- **Clock Tamper Protection:**
    - Server maintains encrypted counter file.
    - Time rollback detection locks the Server App (and thus all Clients).
- **Expiry Behavior:**
    - **Hard Lock:** On expiry, Server API stops responding. All Clients show "License Expired" screen.

### API Specification

- **Internal API:** specialized JSON-RPC for Wails-to-Go communication (Internal) AND Client-to-Server communication (LAN).
- **LAN-Only Access:** Server listens on specific port (e.g., 8090) accessible only within local subnet.

### Authentication & Authorization

- **User-Based RBAC:**
    - Roles (Admin, Data Entry Operator) are tied to **User Accounts**, not Machines.
    - _Example:_ Admin can log in on any Client PC and access full Admin features.
- **Secure Auth:** Setup SRP (Secure Remote Password) or hashed token exchange for LAN authentication.

### Multi-User Support

- **Concurrency:** Support 4-5 simultaneous users (1 Server User + 4 LAN Clients).
- **Installation:** `Client.exe` installed on factory floor machines.

---

## User Experience Principles

- **Factory-First Design:** High contrast, large text, and big buttons for Production/Store screens (usage on tablets/rugged devices).
- **Speed over Style:** Data entry screens (GRN/Dispatch) designed for keyboard-only usage (Tab-key navigation) for speed.
- **Visual Cues:** Red/Green indicators for Stock Levels and QC Status (No reading required to know status).

### Key Interactions

- **"One-Click" Batch Creation:** Pre-fill standard recipe quantities to speed up production logging.
- **Scanner Ready:** Input fields compatible with Barcode Scanners for future quick-entry.

---

## Functional Requirements

### 1. Procurement & Inventory

- **FR-001: GRN (Goods Received Note):** Record incoming Raw Materials and Packing Materials.
- **FR-002: Lot Tracking:** Assign internal Lot Numbers to incoming raw materials for traceability.
- **FR-003: Re-order Alerts:** Visual indicators when stock dips below defined minimums.
- **FR-004: Stock Reconciliation:** Feature to record physical stock counts and adjust system stock with reason codes (e.g., "Audit Found", "Spoilage").

### 2. Production (In-House)

- **FR-005: Recipe Engine:** Select Product -> System fetches ingredients (BOM) -> User enters _actual_ consumed quantities (Starts **Blank** to force manual verification).
- **FR-006: Bulk Output:** Record the exact weight of bulk powder produced.
- **FR-007: Wastage Recording:** Capture spillages/process loss during grinding/mixing.

### 3. Usage & Packing (The Core Logic)

- **FR-008: Strict Batch Traceability:** Every Retail Pack MUST be linked to a specific Source Batch (Bulk Powder).
    - _Example:_ User selects "Packing Run for 100g Garam Masala" -> Selects "Source: Bulk Batch #B-101".
- **FR-009: Auto-Deduction:**
    - Reduces _Bulk Powder Stock_ (in KG).
    - Reduces _Packing Material Stock_ (Boxes, Pouches in Pcs).
    - Increases _Finished Goods Stock_ (in Pcs/Boxes).

### 4. Third-Party Bulk Flow

- **FR-010: Direct Purchase:** Buying "Bulk Powder" acts like a Raw Material purchase but categorizes it as "Semi-Finished" stock.
- **FR-011: Repacking:** Follows the same packing logic as in-house bulk, keeping the source traceable to the external supplier's batch.

### 5. Sales & Dispatch

- **FR-012: Finished Goods Only:** Restriction—Bulk Powder (Work-in-Progress) cannot be added to Sales Orders.
- **FR-013: FIFO Enforcement:** System suggests dispatching oldest batches first (user can override).
- **FR-014: Dispatch Note:** Generates delivery challans/invoices deducting specific FG batches.
- **FR-015: Sales Returns:** Workflow to accept returned goods, assess condition (Good/Damaged), and update stock accordingly.

---

## Non-Functional Requirements

### Performance

- **Page Load:** Dashboard and Input forms load in < 2 seconds.
- **Search:** Item/Order search results appear in < 500ms.

### Security

- **Data Encryption:** All data in transit (TLS 1.2+) and at rest (DB Encryption).
- **Access Logs:** Detailed logging of who accessed specific sensitive reports (Valuation).

### Scalability

- **Data Volume:** Capable of handling 5+ years of transaction history without performance degradation.
- **Concurrency:** Support multiple simultaneous users (Admin + Data Entry Operator) without locking.

### Accessibility

- **Responsive:** UI enables legible usage on Tablet devices (7" screens +).

### Integration

- **Export Capability:** All grids/reports exportable to CSV/Excel for offline analysis.
- **PDF Generation:** Auto-generate invoices, POs, and Dispatch Challans in PDF format.

### Data Integrity & Security

- **Role-Based Access Control (RBAC):**
    - _Admin/Owner:_ Full Access + Valuation Reports + User Management.
    - _Data Entry Operator:_ GRN Entry, Batch Entry, Dispatch Entry (No valuation visibility).
- **Audit Trail:** Immutable logs for all stock adjustments (Who edited stock and when).

### Reliability

- **Automated Local Backup:**
    - Daily automated database dump to a secondary location on the same machine (e.g., `D:\backups\` if DB is on `C:\`).
- **Server Stability:**
    - **System Tray:** Server minimizes to tray to prevent accidental closure.
    - **Watchdog:** Monitor detects hanging process and auto-restarts service layer.
    - **Disk Space Monitor:** Warning when disk space < 500MB to prevent write failures.
    - **Single Instance Lock:** Mutex ensures only one server instance runs to prevent data corruption.
- **Client Resilience:**
    - **Auto-Draft:** Form data saved to LocalStorage every 5s to recover from crashes.
    - **Connection Indicator:** Visual status (Online/Offline) with auto-reconnect overlay.
    - **Unsaved Changes:** Blocking warning when navigating away or closing with active edits.
- **Data Integrity:**
    - **Optimistic Locking:** `updated_at` checks prevent concurrent overwrite of same record.
    - **Startup Integrity Check:** `PRAGMA integrity_check` on boot; prompts restoration if corruption detected.
    - **Missing DB Recovery:** Auto-detect missing DB file and offer restoration from backup.
- **License Grace Period:**
    - 30-day expiry warning banner.
    - 7-day post-expiry **Read-Only Mode** before full lockout to allow production continuity.
    - **Hardware Change:** Clear error screen with copyable Hardware ID for support resolution.
- **Installer Hardening:**
    - Installer automatically adds Firewall rules for Server port.
    - Option for Client auto-start on Windows boot.
    - **Rolling Retention:** Keep last 7 daily backups + last 4 weekly snapshots. Older backups are automatically purged.
    - **Backup Status Indicator:** Admin dashboard displays "Last Backup: X hours ago ✅" or "⚠️ No backup in 48 hours!" so the admin is always aware.
    - **Restore Capability:** Admin can restore from any available backup via the admin panel.
- **Offline-First:** The application is designed to run entirely without internet. All functionality works on LAN only.
- **Resilience:** Server must handle unexpected shutdowns gracefully (e.g., power outages) and recover database state on restart.

---

## Implementation Planning

### Epic Breakdown Required

Requirements must be decomposed into epics and bite-sized stories (200k context limit).

**Next Step:** Run `workflow epics-stories` to create the implementation breakdown.

---

## References

- **Product Brief:** `/docs/product-brief.md`
- **Project Config:** `/bmad/bmm/config.yaml`

---

## Next Steps

1.  **Epic & Story Breakdown** - Run: `workflow epics-stories`
2.  **UX Design** (if UI) - Run: `workflow ux-design`
3.  **Architecture** - Run: `workflow create-architecture`

---

_This PRD captures the essence of masala_inventory_managment - Instant real-time visibility of **Stock Value** and **Automated Loss Tracking**._

_Created through collaborative discovery between darko and AI facilitator._
