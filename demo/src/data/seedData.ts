import type { Item, Recipe, Supplier, Customer } from '../types';

// ============================================================
// Pre-seeded realistic demo data
// ============================================================

export const seedItems: Item[] = [
    // --- Raw Materials ---
    { id: 'raw-cumin', name: 'Cumin Seeds', type: 'RAW', baseUnit: 'KG', avgCost: 220, currentStock: 0, reorderLevel: 50 },
    { id: 'raw-coriander', name: 'Coriander Seeds', type: 'RAW', baseUnit: 'KG', avgCost: 150, currentStock: 0, reorderLevel: 50 },
    { id: 'raw-chili', name: 'Red Chili', type: 'RAW', baseUnit: 'KG', avgCost: 280, currentStock: 0, reorderLevel: 40 },
    { id: 'raw-turmeric', name: 'Turmeric Root', type: 'RAW', baseUnit: 'KG', avgCost: 120, currentStock: 0, reorderLevel: 60 },
    { id: 'raw-pepper', name: 'Black Pepper', type: 'RAW', baseUnit: 'KG', avgCost: 650, currentStock: 0, reorderLevel: 20 },
    { id: 'raw-fenugreek', name: 'Fenugreek Seeds', type: 'RAW', baseUnit: 'KG', avgCost: 180, currentStock: 0, reorderLevel: 30 },

    // --- Packing Materials ---
    { id: 'pack-pouch-50', name: '50g Pouch', type: 'PACKING', baseUnit: 'PCS', avgCost: 2.5, currentStock: 0, reorderLevel: 5000 },
    { id: 'pack-pouch-100', name: '100g Pouch', type: 'PACKING', baseUnit: 'PCS', avgCost: 3.5, currentStock: 0, reorderLevel: 5000 },
    { id: 'pack-box', name: 'Shipping Box (20)', type: 'PACKING', baseUnit: 'PCS', avgCost: 15, currentStock: 0, reorderLevel: 500 },

    // --- Bulk Products (Semi-Finished) ---
    { id: 'bulk-garam', name: 'Garam Masala Bulk', type: 'BULK', baseUnit: 'KG', avgCost: 0, currentStock: 0, reorderLevel: 100 },
    { id: 'bulk-chili', name: 'Chili Powder Bulk', type: 'BULK', baseUnit: 'KG', avgCost: 0, currentStock: 0, reorderLevel: 100 },
    { id: 'bulk-turmeric', name: 'Turmeric Powder Bulk', type: 'BULK', baseUnit: 'KG', avgCost: 0, currentStock: 0, reorderLevel: 100 },

    // --- Finished Goods ---
    { id: 'fg-garam-100', name: 'Garam Masala 100g Pouch', type: 'FG', baseUnit: 'PCS', avgCost: 0, currentStock: 0, reorderLevel: 200, packWeight: 100 },
    { id: 'fg-chili-50', name: 'Chili Powder 50g Pouch', type: 'FG', baseUnit: 'PCS', avgCost: 0, currentStock: 0, reorderLevel: 200, packWeight: 50 },
    { id: 'fg-turmeric-100', name: 'Turmeric Powder 100g Pouch', type: 'FG', baseUnit: 'PCS', avgCost: 0, currentStock: 0, reorderLevel: 200, packWeight: 100 },
];

export const seedRecipes: Recipe[] = [
    {
        id: 'recipe-garam',
        name: 'Garam Masala Mix',
        outputItemId: 'bulk-garam',
        ingredients: [
            { itemId: 'raw-cumin', standardQty: 30 },
            { itemId: 'raw-coriander', standardQty: 25 },
            { itemId: 'raw-pepper', standardQty: 15 },
            { itemId: 'raw-chili', standardQty: 10 },
            { itemId: 'raw-fenugreek', standardQty: 10 },
        ],
        expectedYieldPercent: 95,
        expectedWastagePercent: 5,
    },
    {
        id: 'recipe-chili',
        name: 'Chili Powder',
        outputItemId: 'bulk-chili',
        ingredients: [
            { itemId: 'raw-chili', standardQty: 100 },
        ],
        expectedYieldPercent: 96,
        expectedWastagePercent: 4,
    },
    {
        id: 'recipe-turmeric',
        name: 'Turmeric Powder',
        outputItemId: 'bulk-turmeric',
        ingredients: [
            { itemId: 'raw-turmeric', standardQty: 100 },
        ],
        expectedYieldPercent: 94,
        expectedWastagePercent: 6,
    },
];

export const seedSuppliers: Supplier[] = [
    { id: 'sup-rajasthan', name: 'Rajasthan Spice Co.', contact: '+91-9876543210', leadTimeDays: 3 },
    { id: 'sup-gujarat', name: 'Gujarat Masala Traders', contact: '+91-9123456789', leadTimeDays: 5 },
];

export const seedCustomers: Customer[] = [
    { id: 'cust-metro', name: 'Metro Wholesale Mart', contact: '+91-8765432100', channel: 'Distributor' },
    { id: 'cust-flipkart', name: 'Flipkart Marketplace', contact: 'seller@fk.in', channel: 'Online' },
];
