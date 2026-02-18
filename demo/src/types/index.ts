// ============================================================
// Motaba Masala Demo — Core Domain Types
// Maps to PRD Epics 2-7
// ============================================================

// --- Enums ---

export type ItemType = 'RAW' | 'BULK' | 'PACKING' | 'FG';
export type ItemUnit = 'KG' | 'G' | 'PCS' | 'BOX' | 'ROLL';
export type BatchStatus = 'Planned' | 'In-Progress' | 'Completed';
export type PackingStatus = 'Pending' | 'Completed';
export type DispatchStatus = 'Draft' | 'Confirmed' | 'Dispatched';
export type GRNType = 'Standard' | 'ThirdPartyBulk';
export type BulkSource = 'InHouse' | 'External';
export type StockMovementType = 'GRN' | 'PRODUCTION_CONSUME' | 'PRODUCTION_OUTPUT' | 'WASTAGE' | 'PACK_BULK_DEDUCT' | 'PACK_MATERIAL_DEDUCT' | 'PACK_FG_ADD' | 'DISPATCH';

// --- Master Data (Epic 2) ---

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    baseUnit: ItemUnit;
    avgCost: number;       // Weighted average cost per base unit
    currentStock: number;  // In base unit
    reorderLevel: number;
    packWeight?: number;   // Grams per piece (for FG items)
}

export interface RecipeIngredient {
    itemId: string;
    standardQty: number;   // In base unit (KG)
}

export interface Recipe {
    id: string;
    name: string;
    outputItemId: string;         // Bulk item produced
    ingredients: RecipeIngredient[];
    expectedYieldPercent: number; // e.g. 97 means 97% yield
    expectedWastagePercent: number;
}

export interface Supplier {
    id: string;
    name: string;
    contact: string;
    leadTimeDays: number;
}

export interface Customer {
    id: string;
    name: string;
    contact: string;
    channel: string; // e.g. "Distributor", "Flipkart", "Direct"
}

// --- Procurement (Epic 3) ---

export interface GRNLineItem {
    itemId: string;
    qty: number;
    unitPrice: number;
}

export interface GRNEntry {
    id: string;
    type: GRNType;
    supplierId: string;
    items: GRNLineItem[];
    invoiceNo: string;
    date: string;
    totalValue: number;
}

// --- Production (Epic 4) ---

export interface ConsumedMaterial {
    itemId: string;
    standardQty: number;
    actualQty: number;
}

export interface ProductionBatch {
    id: string;
    recipeId: string;
    status: BatchStatus;
    consumedMaterials: ConsumedMaterial[];
    outputQty: number;
    wastageQty: number;
    yieldPercent: number;
    costPerUnit: number;
    date: string;
    source: BulkSource;
}

// --- Packing (Epic 5) ---

export interface PackingMaterialUsed {
    itemId: string;
    qty: number;
}

export interface PackingRun {
    id: string;
    sourceBatchId: string;
    sourceType: BulkSource;
    outputItemId: string;  // FG item
    outputQty: number;     // In pieces
    bulkConsumed: number;  // In KG
    packingMaterialsUsed: PackingMaterialUsed[];
    status: PackingStatus;
    date: string;
    costPerUnit: number;
}

// --- Dispatch (Epic 6) ---

export interface DispatchLineItem {
    itemId: string;
    qty: number;
    unitPrice: number;
}

export interface DispatchNote {
    id: string;
    customerId: string;
    items: DispatchLineItem[];
    date: string;
    status: DispatchStatus;
    totalValue: number;
}

// --- Reporting (Epic 7) ---

export interface StockMovement {
    id: string;
    itemId: string;
    type: StockMovementType;
    qty: number;
    value: number;
    timestamp: string;
    referenceId: string; // GRN/Batch/Packing/Dispatch ID
    description: string;
}

// --- App State ---

export interface DemoState {
    items: Item[];
    recipes: Recipe[];
    suppliers: Supplier[];
    customers: Customer[];
    grnEntries: GRNEntry[];
    productionBatches: ProductionBatch[];
    packingRuns: PackingRun[];
    dispatches: DispatchNote[];
    stockMovements: StockMovement[];
}
