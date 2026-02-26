# Product Brief: Inventory & Production Management System

## Client Type

Spice Manufacturing + Packing Unit (with Third-Party Bulk Backup)

---

## 1. Background

The client is a spice manufacturer who:

- Buys raw spices and produces spice mixes (like Garam Masala)
- Stores bulk powder after production
- Packs bulk powder into different retail pack sizes
- Sometimes procures bulk masala from third-party suppliers when in-house stock is not available
- Re-packs third-party bulk material into their own branded packaging
- Dispatches products to local customers and online channels (like Flipkart)

Currently, these activities are tracked in Excel, which is manual and limited.  
The goal is to build a software system that matches their real factory workflow.

---

## 2. Main Business Processes

### A. Raw Material & Packing Material Purchase

- Purchase raw spices (in KG)
- Purchase packing materials (boxes, stickers, rolls, bags)
- Purchase third-party bulk masala (when own production is short)
- Track supplier, quantity, and price (for valuation)
- Maintain current stock and value for all items

---

### B. Production (Spice Mixing - In-House)

- Create production batches (example: Garam Masala 100kg)
- Consume raw materials based on recipe (Ingredients auto-fetched / auto-catch, but quantity entered manually)
- Record bulk powder output (example: 97kg)
- Record production loss/wastage
- Store bulk powder as stock for future packing

---

### C. Bulk Powder Stock (Semi-Finished)

- Track leftover bulk powder by product
- Track third-party bulk masala separately if required
- Allow packing from bulk powder later
- Option to mix or separate batches (as per client process)

---

### D. Packing / Conversion to Finished Goods

- Convert bulk powder into retail SKUs (50g, 100g, Rs10, etc.)
- Automatically reduce bulk powder stock
- Automatically reduce packing material stock
- Create finished goods stock in pieces/boxes
- Track packing losses or damaged packs

---

### E. Third-Party Bulk Procurement & Repacking (Backup Flow)

When in-house manufactured products are out of stock, the client:

- Procures **bulk masala** from third-party suppliers
- Stores this bulk material as stock
- Re-packs the bulk material into:
    - Their **own branded packaging**
    - Smaller retail pack sizes (50g, 100g, Rs10, etc.)
- Sells the final product **under their own brand**

Important notes:

- No white labeling of other brands’ finished products
- Only **bulk procurement + own brand repacking**
- Packaging materials (boxes, stickers, rolls) are consumed as usual
- Finished goods are created as normal branded SKUs

Business purpose:
This process is used as a **backup** to avoid stock-outs when in-house production is not available.

---

### F. Dispatch & Sales

- Dispatch finished goods to:
    - Local customers
    - Online channels (Flipkart, etc.)
- Reduce finished goods stock
- Track customer/channel-wise dispatch
- Optional: handle sales returns

---

## 3. Key Data to Manage

### Item Types

- Raw Materials (KG)
- Bulk Powder – In-House (KG – semi-finished)
- Bulk Powder – Third-Party (KG – purchased bulk)
- Packing Materials (pcs, rolls, boxes)
- Finished Goods (pcs, boxes)

---

### Masters to Maintain

- Item Master (single canonical item registry with type-specific views: Raw, Bulk Powder, Packing Material, Finished Goods)
- Type-specific item extensions (details per type, linked to the canonical item record)
- Supplier Master
- Customer / Channel Master
- Packaging structure (pcs per box, etc.)

---

## 4. Important Functional Requirements

- Unit conversions (KG ↔ grams ↔ pcs)
- Batch-wise production tracking
- Wastage/loss recording
- Expiry and batch tracking (if required)
- Physical stock adjustment / stock audit
- Stock reports (raw, bulk, finished, packing)
- Production, packing, and dispatch reports
- Clear tracking of:
    - In-house bulk
    - Third-party bulk
- Stock Valuation: Track value at every stage (e.g., Raw Material: 100 kg Chili = ₹10 Lakhs, 1000 Jars = ₹2 Lakhs).
- Recipe Logic: Auto-fetch ingredients in production but do NOT auto-fill quantities.

---

## 5. Business Goals of the System

- Replace Excel with a controlled system
- Know real-time stock at every stage
- Avoid stock-outs using third-party bulk as backup
- Reduce mistakes in packing and dispatch
- Track losses and improve production yield
- Get clear visibility of:
    - What is produced in-house
    - What is procured as bulk
    - What is packed
    - What is dispatched
- Prepare for scale and online channel compliance

---

## 6. Out of Scope (Optional for Future)

- Full accounting
- GST filing
- Payroll / HR
- Advanced machine integration
