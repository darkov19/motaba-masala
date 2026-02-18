// ============================================
// Masala Inventory Demo — Mock Master Data
// ============================================

// === Type Definitions ===

export type ItemType = 'RAW' | 'BULK' | 'PACKING' | 'FG';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  unit: string;
  packWeight?: number; // grams, for FG items only
}

export interface RecipeIngredient {
  itemId: string;
  stdQtyPer100KG: number;
}

export interface Recipe {
  id: string;
  name: string;
  outputItemId: string;
  expectedYieldPct: number;
  ingredients: RecipeIngredient[];
}

export interface Supplier {
  id: string;
  name: string;
  location: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  channel: string;
  location: string;
}

export interface StockEntry {
  qty: number;
  avgCost: number;
}

export interface BatchRecord {
  id: string;
  batchNo: string;
  productName: string;
  type: 'production' | 'packing';
  inputQty: number;
  outputQty: number;
  wastage: number;
  yieldPct: number;
  costPerUnit: number;
  date: string;
  source: 'in-house' | 'external';
}

export interface TransactionRecord {
  id: string;
  date: string;
  type: 'GRN' | 'PRODUCTION' | 'THIRD_PARTY' | 'PACKING' | 'DISPATCH';
  description: string;
  entries: { itemName: string; qty: number; unit: string; value: number; direction: 'in' | 'out' }[];
}

// === Master Data ===

export const ITEMS: Item[] = [
  { id: 'RM-001', name: 'Coriander Seeds', type: 'RAW', unit: 'KG' },
  { id: 'RM-002', name: 'Cumin Seeds', type: 'RAW', unit: 'KG' },
  { id: 'RM-003', name: 'Black Pepper', type: 'RAW', unit: 'KG' },
  { id: 'RM-004', name: 'Cardamom (Green)', type: 'RAW', unit: 'KG' },
  { id: 'RM-005', name: 'Red Chili (Whole)', type: 'RAW', unit: 'KG' },
  { id: 'BP-001', name: 'Garam Masala (Bulk)', type: 'BULK', unit: 'KG' },
  { id: 'PM-001', name: '100g Laminated Pouch', type: 'PACKING', unit: 'PCS' },
  { id: 'PM-002', name: 'Printed Box (20 Pouches)', type: 'PACKING', unit: 'PCS' },
  { id: 'PM-003', name: 'Label Sticker', type: 'PACKING', unit: 'PCS' },
  { id: 'FG-001', name: 'Garam Masala 100g Pouch', type: 'FG', unit: 'PCS', packWeight: 100 },
];

export const RECIPES: Recipe[] = [
  {
    id: 'REC-001',
    name: 'Garam Masala — Standard Blend',
    outputItemId: 'BP-001',
    expectedYieldPct: 97,
    ingredients: [
      { itemId: 'RM-001', stdQtyPer100KG: 30 },
      { itemId: 'RM-002', stdQtyPer100KG: 25 },
      { itemId: 'RM-003', stdQtyPer100KG: 20 },
      { itemId: 'RM-004', stdQtyPer100KG: 10 },
      { itemId: 'RM-005', stdQtyPer100KG: 15 },
    ],
  },
];

export const SUPPLIERS: Supplier[] = [
  { id: 'SUP-001', name: 'Rajesh Spices Pvt Ltd', location: 'Mumbai, Maharashtra', phone: '+91 98765 43210' },
  { id: 'SUP-002', name: 'Maharashtra Spice Traders', location: 'Pune, Maharashtra', phone: '+91 87654 32109' },
  { id: 'SUP-003', name: 'Gupta Trading Co.', location: 'Delhi', phone: '+91 76543 21098' },
];

export const CUSTOMERS: Customer[] = [
  { id: 'CUS-001', name: 'Sharma General Store', channel: 'Retail — Local', location: 'Mumbai' },
  { id: 'CUS-002', name: 'Flipkart Marketplace', channel: 'E-Commerce', location: 'Online' },
  { id: 'CUS-003', name: 'Metro Cash & Carry', channel: 'Wholesale', location: 'Pune' },
];

export const STANDARD_COSTS: Record<string, number> = {
  'RM-001': 120,
  'RM-002': 280,
  'RM-003': 600,
  'RM-004': 1800,
  'RM-005': 200,
  'PM-001': 2.5,
  'PM-002': 18,
  'PM-003': 0.5,
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  RAW: 'Raw Material',
  BULK: 'Bulk Powder',
  PACKING: 'Packing Material',
  FG: 'Finished Good',
};

export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  RAW: 'orange',
  BULK: 'blue',
  PACKING: 'purple',
  FG: 'green',
};

// === Helpers ===

export const getItemById = (id: string): Item | undefined => ITEMS.find(i => i.id === id);
export const getItemName = (id: string): string => getItemById(id)?.name ?? id;
export const getItemsByType = (type: ItemType): Item[] => ITEMS.filter(i => i.type === type);
