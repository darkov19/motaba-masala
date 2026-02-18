export type ItemType = 'RAW' | 'BULK' | 'PACKING' | 'FG';
export type BatchStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
export type DispatchStatus = 'DRAFT' | 'CONFIRMED' | 'DISPATCHED';
export type UnitType = 'KG' | 'GRAM' | 'PCS' | 'BOX';

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    baseUnit: UnitType;
    currentStock: number;
    avgCost: number;
    reorderLevel: number;
    packWeight?: number;
    createdAt: string;
}

export interface RecipeIngredient {
    itemId: string;
    quantity: number;
    unit: UnitType;
}

export interface Recipe {
    id: string;
    name: string;
    outputItemId: string;
    outputQuantity: number;
    outputUnit: UnitType;
    expectedWastePct: number;
    ingredients: RecipeIngredient[];
    createdAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    contact: string;
    phone: string;
    leadTimeDays: number;
    createdAt: string;
}

export interface Customer {
    id: string;
    name: string;
    contact: string;
    phone: string;
    channel: string;
    createdAt: string;
}

export interface GRNItem {
    itemId: string;
    quantity: number;
    unitPrice: number;
    lotNumber: string;
}

export interface GRN {
    id: string;
    supplierId: string;
    invoiceNumber: string;
    date: string;
    items: GRNItem[];
    createdAt: string;
}

export interface BatchConsumption {
    itemId: string;
    standardQty: number;
    actualQty: number;
}

export interface Batch {
    id: string;
    recipeId: string;
    status: BatchStatus;
    plannedQty: number;
    actualOutput: number;
    wastage: number;
    yieldPct: number;
    costPerUnit: number;
    consumedMaterials: BatchConsumption[];
    date: string;
    createdAt: string;
}

export interface PackingMaterialUsed {
    itemId: string;
    quantity: number;
}

export interface PackingRun {
    id: string;
    sourceBatchId: string;
    fgItemId: string;
    bulkItemId: string;
    outputQuantity: number;
    bulkConsumed: number;
    packingMaterials: PackingMaterialUsed[];
    fgCostPerUnit: number;
    date: string;
    createdAt: string;
}

export interface DispatchItem {
    fgItemId: string;
    quantity: number;
    unitPrice: number;
    batchRef: string;
}

export interface DispatchNote {
    id: string;
    customerId: string;
    status: DispatchStatus;
    date: string;
    items: DispatchItem[];
    totalValue: number;
    createdAt: string;
}

export interface StockTransaction {
    id: string;
    date: string;
    type: 'GRN' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'PACKING_IN' | 'PACKING_OUT' | 'DISPATCH';
    itemId: string;
    quantity: number;
    reference: string;
    description: string;
}

export interface DemoData {
    items: Item[];
    recipes: Recipe[];
    suppliers: Supplier[];
    customers: Customer[];
    grns: GRN[];
    batches: Batch[];
    packingRuns: PackingRun[];
    dispatches: DispatchNote[];
    transactions: StockTransaction[];
    nextIds: {
        item: Record<ItemType, number>;
        grn: number;
        batch: number;
        packing: number;
        dispatch: number;
        lot: number;
        transaction: number;
    };
}
