// ============================================
// MOCK DATA FOR MOTABA MASALA DEMO
// All data is in-memory — no DB, no API, no files
// ============================================

// ---- ITEM TYPES ----
export type ItemType = 'RAW' | 'PACKING' | 'BULK_INHOUSE' | 'BULK_THIRDPARTY' | 'FINISHED_GOOD';

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    unit: string;
    packWeight?: number; // grams per unit for FG
    costPerUnit: number; // ₹ per unit
}

export interface Supplier {
    id: string;
    name: string;
    type: 'raw' | 'packing' | 'bulk';
    contactPerson: string;
    phone: string;
}

export interface Customer {
    id: string;
    name: string;
    channel: 'local' | 'online';
    platform?: string;
}

export interface RecipeIngredient {
    itemId: string;
    itemName: string;
    unit: string;
}

export interface Recipe {
    id: string;
    outputItemId: string;
    outputItemName: string;
    expectedYieldPercent: number; // e.g. 97 means 97% yield
    ingredients: RecipeIngredient[];
}

export interface StockEntry {
    itemId: string;
    itemName: string;
    type: ItemType;
    quantity: number;
    unit: string;
    value: number; // ₹
}

export interface GRNEntry {
    id: string;
    date: string;
    supplierId: string;
    supplierName: string;
    items: {
        itemId: string;
        itemName: string;
        quantity: number;
        unit: string;
        ratePerUnit: number;
        totalValue: number;
    }[];
}

export interface ProductionBatch {
    id: string;
    date: string;
    recipeId: string;
    recipeName: string;
    batchNumber: string;
    consumedIngredients: {
        itemId: string;
        itemName: string;
        quantity: number;
        unit: string;
    }[];
    expectedOutput: number;
    actualOutput: number;
    wastage: number;
    unit: string;
}

export interface PackingRun {
    id: string;
    date: string;
    sourceBatchId: string;
    sourceType: 'inhouse' | 'thirdparty';
    outputItemId: string;
    outputItemName: string;
    bulkConsumed: number; // KG
    packingMaterialsConsumed: { itemId: string; itemName: string; quantity: number }[];
    unitsProduced: number;
    damagedPacks: number;
}

export interface DispatchOrder {
    id: string;
    date: string;
    customerId: string;
    customerName: string;
    channel: string;
    items: {
        itemId: string;
        itemName: string;
        quantity: number;
        unit: string;
    }[];
}

// ---- INITIAL DATA ----

export const INITIAL_RAW_MATERIALS: Item[] = [
    { id: 'RM-001', name: 'Red Chili (Whole)', type: 'RAW', unit: 'KG', costPerUnit: 350 },
    { id: 'RM-002', name: 'Coriander Seeds', type: 'RAW', unit: 'KG', costPerUnit: 180 },
    { id: 'RM-003', name: 'Cumin Seeds', type: 'RAW', unit: 'KG', costPerUnit: 420 },
    { id: 'RM-004', name: 'Black Pepper', type: 'RAW', unit: 'KG', costPerUnit: 850 },
    { id: 'RM-005', name: 'Turmeric (Whole)', type: 'RAW', unit: 'KG', costPerUnit: 220 },
    { id: 'RM-006', name: 'Cloves', type: 'RAW', unit: 'KG', costPerUnit: 1200 },
    { id: 'RM-007', name: 'Cinnamon Sticks', type: 'RAW', unit: 'KG', costPerUnit: 680 },
    { id: 'RM-008', name: 'Bay Leaves', type: 'RAW', unit: 'KG', costPerUnit: 320 },
    { id: 'RM-009', name: 'Cardamom (Green)', type: 'RAW', unit: 'KG', costPerUnit: 2800 },
    { id: 'RM-010', name: 'Fennel Seeds', type: 'RAW', unit: 'KG', costPerUnit: 280 },
];

export const INITIAL_PACKING_MATERIALS: Item[] = [
    { id: 'PM-001', name: 'Pouch - 50g', type: 'PACKING', unit: 'PCS', costPerUnit: 1.5 },
    { id: 'PM-002', name: 'Pouch - 100g', type: 'PACKING', unit: 'PCS', costPerUnit: 2.0 },
    { id: 'PM-003', name: 'Pouch - 200g', type: 'PACKING', unit: 'PCS', costPerUnit: 3.0 },
    { id: 'PM-004', name: 'Jar - 100g', type: 'PACKING', unit: 'PCS', costPerUnit: 12.0 },
    { id: 'PM-005', name: 'Box - ₹10 Pack', type: 'PACKING', unit: 'PCS', costPerUnit: 0.8 },
    { id: 'PM-006', name: 'Label Sticker Roll', type: 'PACKING', unit: 'ROLL', costPerUnit: 250 },
    { id: 'PM-007', name: 'Outer Carton Box', type: 'PACKING', unit: 'PCS', costPerUnit: 18 },
    { id: 'PM-008', name: 'Shrink Wrap Roll', type: 'PACKING', unit: 'ROLL', costPerUnit: 180 },
];

export const INITIAL_FINISHED_GOODS: Item[] = [
    { id: 'FG-001', name: 'Garam Masala 50g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 50, costPerUnit: 0 },
    { id: 'FG-002', name: 'Garam Masala 100g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 100, costPerUnit: 0 },
    { id: 'FG-003', name: 'Garam Masala 200g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 200, costPerUnit: 0 },
    { id: 'FG-004', name: 'Red Chili Powder 50g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 50, costPerUnit: 0 },
    { id: 'FG-005', name: 'Red Chili Powder 100g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 100, costPerUnit: 0 },
    { id: 'FG-006', name: 'Turmeric Powder 100g Jar', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 100, costPerUnit: 0 },
    { id: 'FG-007', name: 'Coriander Powder 100g Pouch', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 100, costPerUnit: 0 },
    { id: 'FG-008', name: 'Garam Masala ₹10 Pack', type: 'FINISHED_GOOD', unit: 'PCS', packWeight: 15, costPerUnit: 0 },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'SUP-001', name: 'Rajasthan Spice Traders', type: 'raw', contactPerson: 'Ramesh Agarwal', phone: '91-98765-43210' },
    { id: 'SUP-002', name: 'Kerala Spice Farm Co.', type: 'raw', contactPerson: 'Thomas Mathew', phone: '91-94567-89012' },
    { id: 'SUP-003', name: 'Nagpur Packaging Solutions', type: 'packing', contactPerson: 'Priya Deshmukh', phone: '91-98234-56789' },
    { id: 'SUP-004', name: 'Gujarat Masala Wholesale', type: 'bulk', contactPerson: 'Bhavesh Patel', phone: '91-97654-32100' },
    { id: 'SUP-005', name: 'MP Dry Spices Hub', type: 'raw', contactPerson: 'Sanjay Sharma', phone: '91-93456-78901' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
    { id: 'CUST-001', name: 'Flipkart Marketplace', channel: 'online', platform: 'Flipkart' },
    { id: 'CUST-002', name: 'Amazon Seller Central', channel: 'online', platform: 'Amazon' },
    { id: 'CUST-003', name: 'Sharma General Store', channel: 'local' },
    { id: 'CUST-004', name: 'City Supermart', channel: 'local' },
    { id: 'CUST-005', name: 'Krishna Kirana Store', channel: 'local' },
    { id: 'CUST-006', name: 'Metro Cash & Carry', channel: 'local' },
];

export const INITIAL_RECIPES: Recipe[] = [
    {
        id: 'REC-001',
        outputItemId: 'BULK-001',
        outputItemName: 'Garam Masala (Bulk)',
        expectedYieldPercent: 97,
        ingredients: [
            { itemId: 'RM-003', itemName: 'Cumin Seeds', unit: 'KG' },
            { itemId: 'RM-002', itemName: 'Coriander Seeds', unit: 'KG' },
            { itemId: 'RM-004', itemName: 'Black Pepper', unit: 'KG' },
            { itemId: 'RM-006', itemName: 'Cloves', unit: 'KG' },
            { itemId: 'RM-007', itemName: 'Cinnamon Sticks', unit: 'KG' },
            { itemId: 'RM-008', itemName: 'Bay Leaves', unit: 'KG' },
            { itemId: 'RM-009', itemName: 'Cardamom (Green)', unit: 'KG' },
        ],
    },
    {
        id: 'REC-002',
        outputItemId: 'BULK-002',
        outputItemName: 'Red Chili Powder (Bulk)',
        expectedYieldPercent: 95,
        ingredients: [
            { itemId: 'RM-001', itemName: 'Red Chili (Whole)', unit: 'KG' },
        ],
    },
    {
        id: 'REC-003',
        outputItemId: 'BULK-003',
        outputItemName: 'Turmeric Powder (Bulk)',
        expectedYieldPercent: 96,
        ingredients: [
            { itemId: 'RM-005', itemName: 'Turmeric (Whole)', unit: 'KG' },
        ],
    },
    {
        id: 'REC-004',
        outputItemId: 'BULK-004',
        outputItemName: 'Coriander Powder (Bulk)',
        expectedYieldPercent: 96,
        ingredients: [
            { itemId: 'RM-002', itemName: 'Coriander Seeds', unit: 'KG' },
        ],
    },
];

// Bulk items (created dynamically but defined here for type reference)
export const INITIAL_BULK_ITEMS: Item[] = [
    { id: 'BULK-001', name: 'Garam Masala (Bulk)', type: 'BULK_INHOUSE', unit: 'KG', costPerUnit: 0 },
    { id: 'BULK-002', name: 'Red Chili Powder (Bulk)', type: 'BULK_INHOUSE', unit: 'KG', costPerUnit: 0 },
    { id: 'BULK-003', name: 'Turmeric Powder (Bulk)', type: 'BULK_INHOUSE', unit: 'KG', costPerUnit: 0 },
    { id: 'BULK-004', name: 'Coriander Powder (Bulk)', type: 'BULK_INHOUSE', unit: 'KG', costPerUnit: 0 },
];

// ---- INITIAL STOCK (all zero at start) ----
export const buildInitialStock = (): StockEntry[] => {
    const stock: StockEntry[] = [];

    INITIAL_RAW_MATERIALS.forEach(item => {
        stock.push({ itemId: item.id, itemName: item.name, type: item.type, quantity: 0, unit: item.unit, value: 0 });
    });

    INITIAL_PACKING_MATERIALS.forEach(item => {
        stock.push({ itemId: item.id, itemName: item.name, type: item.type, quantity: 0, unit: item.unit, value: 0 });
    });

    INITIAL_BULK_ITEMS.forEach(item => {
        stock.push({ itemId: item.id, itemName: item.name, type: item.type, quantity: 0, unit: item.unit, value: 0 });
    });

    INITIAL_FINISHED_GOODS.forEach(item => {
        stock.push({ itemId: item.id, itemName: item.name, type: item.type, quantity: 0, unit: item.unit, value: 0 });
    });

    return stock;
};
