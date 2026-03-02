# Modern UX Plan: Batches & Execution (Production Engine)

## Current State Analysis

Currently, the system treats "Batches" as simple database records (ID, ItemID, Quantity). There is no "Execution" layer. If a user creates a batch of "Turmeric Powder," the system does not actually consume the underlying "Raw Turmeric" stock.

The missing core feature is the **Production Engine**. The UX needs to shift from a "Data Entry Form" to a "Live Mission Control" for the factory floor.

## The Goal: "Live Execution" UX

We need to create two distinct execution flows: **Production Runs** (Raw -> Bulk Powder) and **Packing Runs** (Bulk Powder -> Finished Goods). The UX must be highly visual, showing real-time stock availability, preventing impossible actions, and confirming success.

---

## 1. Production Run: The "Mix Station" UX

This screen is used by floor operators when they are physically mixing and grinding raw spices.

### Layout & Flow

- **Step 1: The Target:**
    - User selects the Recipe they want to run.
    - User enters the **Target Output Quantity** (e.g., 500 KG).
- **Step 2: The Live Calculation (The core UX innovation):**
    - The screen transitions into a "Live Dashboard".
    - Based on the recipe percentage and the target output, the system calculates the exact KGs required for every ingredient.
    - **Stock Lights:** Next to each calculated ingredient, the system queries the live `stock_ledger`.
        - 🟢 **Green Check:** We have enough raw stock in the warehouse to make this batch.
        - 🔴 **Red Warning:** "Shortage: Need 50kg of Cumin, only 20kg available." The "Execute" button is disabled.
- **Step 3: Flexibility (Ad-hoc Adjustments):**
    - Because factory reality isn't perfect, every ingredient line has an "Override" input box. If a worker drops a bag, they can manually type "Actually, I used 52kg instead of 50kg."
    - A button "Add Extra Ingredient" allows them to dump in a partial bag of something else to correct the mix.
- **Step 4: Execution:**
    - Clicking "Execute" fires the massive transaction: Deducts all specific raw material lots (`OUT` in ledger) and generates the new Bulk Powder `Batch` (`IN` in ledger).

---

## 2. Packing Run: The "Packaging Line" UX

This screen is used when taking a drum of Bulk Powder and putting it into retail jars/pouches.

### Layout & Flow

- **Step 1: The Source & Profile:**
    - User selects the **Source Batch** (Which drum of Bulk Powder are we using? Shows live remaining quantity).
    - User selects the **Packaging Profile** (e.g., "100g Glass Jar Pack").
    - User selects the **Market Segment** (Online vs. Regular).
    - User enters **Target Pack Quantity** (e.g., "I want to pack 1,000 jars").
- **Step 2: The Feasibility Check:**
    - The screen instantly breaks down the math:
        - "Requires 100 KG of Bulk Powder." (🟢 Available: 150 KG)
        - "Requires 1,000 Glass Jars." (🟢 Available: 5,000 pcs)
        - "Requires 1,000 Lids." (🔴 Shortage: Only 800 available!)
    - The "Start Packing" button locks until shortages are resolved (or the target pack quantity is lowered).
- **Step 3: Execution:**
    - Clicking "Start Packing" generates the `FINISHED_GOOD` stock linked to the parent Bulk Batch, ensuring 100% traceability for food safety.

## Technical Implementation Path

1.  **Backend Services (`internal/app/inventory/execution_service.go`):**
    - Create a new dedicated execution service handling these massive atomic transactions.
    - It must use SQL transactions (`tx.BeginTx`) to lock rows, prevent race conditions, and write multiple ledger entries at once.
2.  **State Management (React Query):**
    - The "Live Calculation" relies on polling or fetching the latest stock balances instantly as the user types the "Target Quantity". We will use `useQuery` with the target quantity as a dependency key so it auto-recalculates.
3.  **UI Components:**
    - Build `ProductionRunTerminal.tsx` and `PackingRunTerminal.tsx`. These should look like industrial dashboard screens, using large, legible fonts suitable for a factory tablet, replacing the current small data-grid layout.
