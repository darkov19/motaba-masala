# Architecture.md

## Inventory, Production & Packing Management System (LAN, Offline)

**Version:** 1.1  
**Deployment:** On-Premise (LAN), **Fully Offline** (No cloud / no internet dependency)  
**Users:** ~5 concurrent users  
**Hosting:** **Single Server PC in factory** (App + DB on same machine)  
**Client Devices:** Desktop/Laptop browsers only (no mobile/tablet optimization required)  
**Auth:** Username + Password (simple auth, **no role-based access**)  
**Locations:** Single location (one factory/store)

---

## 1. Architecture Overview

### 1.1 High-Level Design (3-Tier on a Single Machine)

- **Client Layer:** Browser (Chrome/Edge) on LAN PCs
- **Application Layer:** Backend API + business logic (runs on server PC)
- **Data Layer:** Relational Database (runs on same server PC)

All users access the app via LAN using a local IP:

- `http://<server-ip>:<port>` or (preferred) `https://<server-ip>`

---

## 2. Deployment Topology (Finalized)

### 2.1 Topology: Single On-Prem Server PC (Recommended for now)

Server PC runs:

- Backend API service
- Frontend web app hosting
- Database service
- Scheduled backup job

Client PCs:

- Access via browser over LAN

**Pros:** lowest cost, simplest ops  
**Cons:** server PC is single point of failure (mitigate via backups + UPS)

---

## 3. Recommended Tech Stack (Offline-Friendly)

### 3.1 Frontend

- React / Vue / Angular SPA (any is fine)
- Served as static assets from backend or reverse proxy
- Optimized for fast data entry (tables, search, keyboard navigation)

### 3.2 Backend

Choose one (team preference):

- **Node.js** (Express/NestJS)
- **Python** (Django/FastAPI)
- **.NET** (ASP.NET Core)

**Backend must be the source of truth** for:

- inventory ledger integrity
- BOM calculations
- batch yield/wastage
- unit conversions

### 3.3 Database

- **PostgreSQL** (recommended) or MySQL
- Strong transactions + indexing for ledgers and reports

### 3.4 Reverse Proxy (Optional but recommended)

- Nginx (Linux) or IIS (Windows)
- Provides stable port, optional HTTPS, static file hosting

---

## 4. Authentication & Users (Simple)

### 4.1 Requirements

- Username + password login
- All authenticated users have same access
- Track `created_by`, `updated_by` in records for accountability

### 4.2 Implementation

- Password hashing: **bcrypt or argon2**
- Session-based auth (cookie) recommended for LAN:
    - simpler than JWT for offline setups
    - easy logout and session invalidation

### 4.3 Password Rules (Basic)

- Minimum 8 characters
- Admin can reset passwords

---

## 5. Core Domain Components

### 5.1 Modules (Mapped to PRD)

1. Master Data (items, suppliers, customers, BOMs)
2. Procurement & Inward
3. Production (In-house mixing)
4. Bulk Inventory (In-house vs third-party bulk)
5. Packing & SKU Conversion
6. Dispatch
7. Stock Adjustment
8. Reports & Dashboards
9. Audit Log

---

## 6. Data Integrity Model (Most Important Design Rule)

### 6.1 Golden Rule: Stock = Sum of Ledger Movements

Never store “stock quantity” as an editable number.
Instead:

- store all movements in **stock ledger**
- compute current stock as totals (with caching/views if needed)

### 6.2 Ledger-Based Transactions

All stock changes must be recorded as transactions:

- Purchase Inward: +Raw / +Packaging / +ThirdPartyBulk
- Production Issue: -Raw
- Production Output: +InHouseBulk (+wastage tracked)
- Packing: -Bulk, -Packaging, +FinishedGoods
- Dispatch: -FinishedGoods
- Adjustment: +/- with reason

This prevents mismatch and gives full auditability.

---

## 7. Database Design (Entity-Level)

### 7.1 Masters

- `users`
- `items`
- `suppliers`
- `customers`
- `bom_production` + `bom_production_lines`
- `bom_packing` + `bom_packing_lines`

### 7.2 Transactions (Header + Lines)

- `purchase_inward` + `purchase_inward_lines`
- `production_batch`
    - `production_batch_consumption`
    - `production_batch_output`
- `packing_order`
    - `packing_order_lines`
    - `packing_material_consumption`
- `dispatch` + `dispatch_lines`
- `stock_adjustment` + `stock_adjustment_lines`

### 7.3 Unified Stock Ledger (Recommended)

- `stock_ledger`
    - `id`
    - `txn_type` (PURCHASE/PRODUCTION/PACKING/DISPATCH/ADJUSTMENT)
    - `txn_id` (header id)
    - `item_id`
    - `location_id` (single location initially, keep column for future-proofing)
    - `qty_in`, `qty_out`
    - `uom`
    - `batch_ref` (optional, for batch/expiry if enabled later)
    - `created_at`
    - `created_by`

**Indexes (must-have):**

- `(item_id, location_id, created_at)`
- `(txn_type, txn_id)`
- `(created_at)`

---

## 8. Units of Measure (UOM) & Conversions

### 8.1 Rules

- Each item has a **base UOM** (KG, PCS, ROLL, BOX)
- Conversions stored in master/config:
    - KG ↔ grams (1 KG = 1000 g)
    - pcs per box, boxes per carton (if needed)

### 8.2 Enforcement

- Store BOM lines in base UOM for consistency
- Convert at UI input time but validate in backend

---

## 9. Offline-First Considerations (No Internet)

### 9.1 System Must Work Without Internet

- No external auth providers
- No cloud storage
- No external APIs required in Phase 1

### 9.2 Updates

- Manual update process:
    - installer package / zip update
    - database migrations executed locally
- Maintain an internal `app_version` table for tracking

---

## 10. Reporting Architecture

### 10.1 Reports (Operational)

- Stock summary: Raw / Packaging / Bulk (In-house vs Third-party) / Finished
- Production yield & wastage
- Packing output & packaging consumption
- Dispatch summary by customer

### 10.2 Implementation

- SQL views (and materialized views if needed)
- Export to CSV/PDF (optional)

---

## 11. Backups & Disaster Recovery (Mandatory)

### 11.1 Backup Policy (Offline)

- Daily automated DB backup to:
    - External HDD/SSD (recommended)
    - Or NAS inside LAN (if available)
- Retention:
    - last 7 daily backups + last 3 monthly backups (suggested)

### 11.2 Restore

- Documented restore steps:
    - restore DB backup
    - start services
    - verify with health check screen

### 11.3 Hardware Safety (Strongly Recommended)

- UPS for server PC
- Scheduled restart/maintenance window

---

## 12. Security (LAN Appropriate)

- Use HTTPS if possible (self-signed cert ok)
- Password hashing (bcrypt/argon2)
- DB accessible only from server machine (firewall rules)
- Audit log for:
    - production batch close
    - packing finalize
    - dispatch finalize
    - stock adjustments

---

## 13. Performance & Scalability

### 13.1 Expected Load (Confirmed)

- ~5 concurrent users
- Moderate dataset size (ledger rows grow continuously)

### 13.2 Scaling Options (Future)

- Move DB to separate machine if needed
- Add reporting read replicas (optional)
- Archive old ledger rows yearly (optional)

---

## 14. Finalized Decisions (Based on Client Inputs)

- Concurrency: **5**
- Hosting: **single server PC in factory**
- Internet: **fully offline**
- Mobile: **not required**
- Barcode scanning: **not required**
- Locations: **single location only**
- Auth: **simple login, no role-based access**

---

## 15. Remaining Optional Choices (Not blockers)

1. Do we need batch/expiry tracking now or keep it as “ready for Phase 2”?
2. Do we need invoice/price/tax fields in purchase + dispatch now or later?
3. Export formats required (CSV only vs CSV+PDF)?
