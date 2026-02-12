# Product Requirements Document (PRD)

## Inventory, Production & Packing Management System

**Version:** 1.0  
**Client Type:** Spice Manufacturing & Packing Unit  
**Purpose:** Quotation, Architecture Design & Full Data Flow Definition

---

## 1. Purpose & Objectives

### 1.1 Purpose

To build a centralized software system to manage:

- Raw material procurement
- In-house production (mixing)
- Bulk powder inventory
- Packing and SKU conversion
- Third-party bulk procurement (backup)
- Finished goods inventory
- Dispatch and sales operations

The system will replace Excel-based tracking with a structured, auditable, and scalable solution.

---

### 1.2 Business Objectives

- Real-time visibility of stock at all stages
- Reduce stock-outs using third-party bulk backup
- Improve production yield and loss tracking
- Reduce packing and dispatch errors
- Enable growth for online channels
- Create a scalable base for future automation

---

## 2. Scope Definition

### 2.1 In Scope

- Inventory management (raw, bulk, packing, finished)
- Production batch management
- Packing & SKU conversion
- Third-party bulk procurement & repacking
- Dispatch & sales tracking
- Batch & expiry tracking (optional)
- Reporting & dashboards
- Role-based access

---

### 2.2 Out of Scope (Phase 2+)

- Full accounting & GST
- Payroll / HR
- Machine-level IoT integration
- Advanced ERP integrations

---

## 3. High-Level System Architecture

### 3.1 Core Architectural Layers

- Presentation Layer (Web UI)
- Application Layer (Business Logic)
- Data Layer (Relational Database)
- Reporting Layer
- Integration Layer (APIs - optional)

---

### 3.2 Core Modules

1. Master Data Management
2. Procurement & Inward
3. Production Management
4. Bulk Inventory Management
5. Packing & Conversion
6. Third-Party Bulk Backup Flow
7. Finished Goods Inventory
8. Dispatch & Sales
9. Stock Control & Adjustments
10. Reporting & Analytics
11. User & Role Management
12. Audit & Traceability

---

## 4. Master Data Management (MDM)

### 4.1 Item Master

Each item must have:

| Field            | Description                                               |
| ---------------- | --------------------------------------------------------- |
| Item Code        | Unique system identifier                                  |
| Item Name        | Display name                                              |
| Item Type        | Raw / Bulk-InHouse / Bulk-ThirdParty / Packing / Finished |
| Base Unit        | KG / PCS / ROLL / BOX                                     |
| Conversion Rules | Gram ↔ KG, pcs per box                                    |
| Pack Size        | For finished goods (e.g. 50g)                             |
| Status           | Active / Inactive                                         |

---

### 4.2 BOM (Bill of Materials)

#### Production BOM

- Bulk product
- Raw material lines
- Standard quantity per batch
- Expected yield %

#### Packing BOM

- Finished SKU
- Bulk powder per unit
- Packaging material per unit/box

---

### 4.3 Party Masters

- Supplier Master
- Customer Master
- Channel Master (Flipkart, etc.)

---

## 5. Procurement & Inward Module

### 5.1 Functional Requirements

- Purchase inward entry
- Supplier selection
- Quantity & unit capture
- Optional price & tax
- Batch/lot & expiry capture
- Quality/approval status

### 5.2 Supported Item Types

- Raw materials
- Packing materials
- Third-party bulk masala

---

## 6. Production Management (In-House)

### 6.1 Production Batch

| Field        | Description               |
| ------------ | ------------------------- |
| Batch ID     | Unique                    |
| Product      | Bulk product              |
| Planned Qty  | Planned input             |
| Actual Input | Actual raw used           |
| Output Qty   | Bulk output               |
| Wastage Qty  | Loss                      |
| Yield %      | Auto-calculated           |
| Date/Shift   | Metadata                  |
| Operator     | Optional                  |
| Status       | Draft / Approved / Closed |

---

### 6.2 Production Logic

- Deduct raw stock based on BOM
- Allow actual override
- Track variance
- Record wastage with reason

---

## 7. Bulk Inventory Management

### 7.1 Bulk Types

- In-House Bulk
- Third-Party Bulk

### 7.2 Rules

- Track bulk stock by product
- Optional batch-wise tracking
- FIFO/FEFO consumption
- Configurable batch mixing

---

## 8. Packing & SKU Conversion

### 8.1 Packing Order

Captures:

- Source bulk product
- Source bulk type (In-House / Third-Party)
- Finished SKU
- Planned quantity
- Actual quantity
- Bulk consumed
- Packing material consumed
- Packing loss

---

### 8.2 System Behavior

- Reduce bulk stock
- Reduce packing material stock
- Increase finished goods stock
- Track rejects and variances

---

## 9. Third-Party Bulk Backup Flow

### 9.1 Business Logic

Used when in-house bulk is insufficient.

Flow:

1. Purchase third-party bulk
2. Store as Third-Party Bulk Stock
3. Use in Packing Module
4. Convert to finished goods

---

### 9.2 Tracking

- Supplier tracking
- Separate stock from in-house bulk
- Dependency reporting

---

## 10. Finished Goods Inventory

### 10.1 Tracking

- SKU-wise stock
- Units: pcs / boxes
- Batch/expiry (optional)
- Channel readiness (future)

---

## 11. Dispatch & Sales

### 11.1 Dispatch Entry

- Customer / Channel
- SKU & quantity
- Batch (if required)
- Dispatch date
- Reduce finished goods stock

---

### 11.2 Sales Flow Options

- Order → Pick → Dispatch → Invoice
  OR
- Direct Dispatch

---

## 12. Stock Control & Adjustments

### 12.1 Stock Adjustment

- Physical stocktake
- Reason codes
- Approval workflow
- Audit trail

---

## 13. Reporting & Analytics

### 13.1 Core Reports

- Raw material stock
- Bulk stock (In-house vs Third-party)
- Finished goods stock
- Production yield & wastage
- Packing output
- Dispatch summary
- Stock aging
- Slow-moving SKUs

---

### 13.2 Management KPIs

- Yield %
- Loss %
- Stock-out frequency
- Third-party dependency %
- SKU-wise throughput

---

## 14. User Roles & Security

### 14.1 Roles

- Admin
- Purchase
- Production
- Packing
- Dispatch
- Manager

---

### 14.2 Controls

- Role-based access
- Approval rights
- Full audit logs

---

## 15. Core Data Models (High Level)

### 15.1 Key Entities

- Item
- BOM
- Supplier
- Customer
- PurchaseInward
- ProductionBatch
- BulkStockLedger
- PackingOrder
- FinishedGoodsLedger
- Dispatch
- StockAdjustment
- User
- AuditLog

---

## 16. End-to-End Data Flow

### In-House Flow

Raw Purchase
→ Raw Stock
→ Production Batch
→ In-House Bulk Stock
→ Packing Order
→ Finished Goods Stock
→ Dispatch

### Backup Flow

Third-Party Bulk Purchase
→ Third-Party Bulk Stock
→ Packing Order
→ Finished Goods Stock
→ Dispatch

---

## 17. Non-Functional Requirements

- Multi-user concurrency
- Data integrity & auditability
- Medium-scale factory performance
- Daily backup
- Scalable database design
- Configurable workflows

---

## 18. Future Scalability

- GST & accounting integration
- Barcode scanning
- Warehouse bin management
- Marketplace API integrations
- Mobile app for shop floor

---

## 19. Quotation & Effort Estimation Areas

- Core inventory engine
- Production module
- Packing module
- Third-party bulk logic
- Reporting layer
- UI/UX screens
- Role & security
- Data migration from Excel
- Testing & UAT
- Training & deployment
