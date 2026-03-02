# Modern UX Plan: Sales & Dispatch

## Current State Analysis

Currently, the system completely lacks a dedicated Sales/Dispatch module. While the `stock_ledger` supports generic `OUT` movements, there are no entities for Sales Orders, Customers, or Dispatch Notes (Challans). The PRD explicitly requires strict FIFO enforcement and the restriction that _only_ Finished Goods can be sold.

## The Goal: "Fulfillment Center" UX

The Dispatch module must act as a strict gatekeeper, ensuring the right Finished Goods go to the right Customer, pulling from the oldest stock first to minimize expiration risks.

---

## 1. Sales Order & Dispatch Terminal

The UI should feel like a fulfillment terminal, distinct from the manufacturing screens.

### Layout & Flow

- **Step 1: The Customer & Target:**
    - User selects the **Customer** (From the `Parties` master where `party_type = CUSTOMER`).
    - User selects the **Market Segment** (Online vs. Regular) to ensure they are picking from the correct pool of Finished Goods.
- **Step 2: Building the Order (The Cart):**
    - A clean, POS-style grid where the user searches for `FINISHED_GOOD` items and enters the desired quantity (e.g., 500 x 100g Jars).
    - **Crucial Rule:** The search _only_ returns `FINISHED_GOOD` types. Bulk powder or raw spices are invisible here.
- **Step 3: The FIFO Auto-Allocator (The Smart Feature):**
    - When an item is added to the cart, the system instantly queries the database to find the oldest available batches of that Finished Good.
    - It presents a "Suggested Allocation" card:
        - "To fulfill 500 jars, pulling 300 from Batch #B-Oct-10 and 200 from Batch #B-Oct-12."
    - **Flexibility:** The user can click an "Override Allocation" button if they physically grabbed a newer box from the front of the shelf, ensuring the digital twin matches physical reality.
- **Step 4: Dispatch Generation:**
    - Clicking "Confirm Dispatch" creates a `DispatchNote` record and writes multiple `OUT` movements to the `stock_ledger`, specifically tagging the consumed Finished Good lot/batch numbers.
    - It automatically triggers a PDF Generation of the Delivery Challan.

## 2. Sales Returns (Reverse Logistics)

Returns are messy but critical for accurate valuation.

### Layout & Flow

- **The Return Form:**
    - User references the original Dispatch Note or selects the Customer.
    - User specifies the item and the quantity returned.
    - **The Condition Check:** User must select a condition:
        - `GOOD`: Stock is returned to the active Finished Goods ledger (increases available balance).
        - `DAMAGED`: Stock is accepted but immediately routed to a "Wastage/Quarantine" state. It does not increase the sellable balance, but the financial loss is recorded.

## Technical Implementation Path

1.  **Domain Entities (`entities.go`):**
    - Create `SalesOrder`, `SalesOrderLine`, `DispatchNote`, and `DispatchLine` structs.
    - Ensure `DispatchLine` strictly references the specific Finished Good `BatchID`/`LotNumber` being consumed.
2.  **Execution Service (`internal/app/inventory/sales_service.go`):**
    - Implement the FIFO allocation algorithm. It needs to query the ledger, sum balances per lot, sort by oldest `created_at`, and greedily allocate the requested quantity.
3.  **UI Components:**
    - Build `DispatchTerminal.tsx` with a focus on the POS-style cart and the clear presentation of the FIFO allocation.
