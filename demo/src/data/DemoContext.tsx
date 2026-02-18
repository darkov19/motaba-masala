import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type {
    StockEntry, GRNEntry, ProductionBatch, PackingRun, DispatchOrder,
    Item, Supplier, Customer, Recipe,
} from './mockData';
import {
    INITIAL_RAW_MATERIALS, INITIAL_PACKING_MATERIALS, INITIAL_FINISHED_GOODS,
    INITIAL_BULK_ITEMS, INITIAL_SUPPLIERS, INITIAL_CUSTOMERS, INITIAL_RECIPES,
    buildInitialStock,
} from './mockData';

// ---- STATE ----
export interface DemoState {
    currentStep: number;
    items: Item[];
    suppliers: Supplier[];
    customers: Customer[];
    recipes: Recipe[];
    stock: StockEntry[];
    grnEntries: GRNEntry[];
    productionBatches: ProductionBatch[];
    packingRuns: PackingRun[];
    dispatchOrders: DispatchOrder[];
    thirdPartyBulk: StockEntry[]; // separate tracking for 3rd party bulk
    notifications: { id: string; message: string; type: 'success' | 'info' | 'warning' }[];
}

const initialState: DemoState = {
    currentStep: 0,
    items: [...INITIAL_RAW_MATERIALS, ...INITIAL_PACKING_MATERIALS, ...INITIAL_FINISHED_GOODS, ...INITIAL_BULK_ITEMS],
    suppliers: [...INITIAL_SUPPLIERS],
    customers: [...INITIAL_CUSTOMERS],
    recipes: [...INITIAL_RECIPES],
    stock: buildInitialStock(),
    grnEntries: [],
    productionBatches: [],
    packingRuns: [],
    dispatchOrders: [],
    thirdPartyBulk: [],
    notifications: [],
};

// ---- ACTIONS ----
type DemoAction =
    | { type: 'SET_STEP'; step: number }
    | { type: 'ADD_GRN'; grn: GRNEntry }
    | { type: 'ADD_PRODUCTION_BATCH'; batch: ProductionBatch }
    | { type: 'ADD_PACKING_RUN'; run: PackingRun }
    | { type: 'ADD_DISPATCH'; order: DispatchOrder }
    | { type: 'ADD_THIRD_PARTY_BULK'; grn: GRNEntry }
    | { type: 'ADD_NOTIFICATION'; notification: { id: string; message: string; type: 'success' | 'info' | 'warning' } }
    | { type: 'CLEAR_NOTIFICATIONS' }
    | { type: 'RESET' }
    | { type: 'ADD_ITEM'; item: Item }
    | { type: 'ADD_SUPPLIER'; supplier: Supplier }
    | { type: 'ADD_CUSTOMER'; customer: Customer }
    | { type: 'ADD_RECIPE'; recipe: Recipe };

// ---- REDUCER ----
function demoReducer(state: DemoState, action: DemoAction): DemoState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.step };

        case 'ADD_GRN': {
            const newStock = [...state.stock];
            action.grn.items.forEach(grnItem => {
                const idx = newStock.findIndex(s => s.itemId === grnItem.itemId);
                if (idx >= 0) {
                    newStock[idx] = {
                        ...newStock[idx],
                        quantity: newStock[idx].quantity + grnItem.quantity,
                        value: newStock[idx].value + grnItem.totalValue,
                    };
                }
            });
            return {
                ...state,
                stock: newStock,
                grnEntries: [...state.grnEntries, action.grn],
            };
        }

        case 'ADD_THIRD_PARTY_BULK': {
            const newThirdParty = [...state.thirdPartyBulk];
            action.grn.items.forEach(grnItem => {
                const idx = newThirdParty.findIndex(s => s.itemId === grnItem.itemId);
                if (idx >= 0) {
                    newThirdParty[idx] = {
                        ...newThirdParty[idx],
                        quantity: newThirdParty[idx].quantity + grnItem.quantity,
                        value: newThirdParty[idx].value + grnItem.totalValue,
                    };
                } else {
                    newThirdParty.push({
                        itemId: grnItem.itemId,
                        itemName: grnItem.itemName,
                        type: 'BULK_THIRDPARTY',
                        quantity: grnItem.quantity,
                        unit: grnItem.unit,
                        value: grnItem.totalValue,
                    });
                }
            });
            return {
                ...state,
                thirdPartyBulk: newThirdParty,
                grnEntries: [...state.grnEntries, action.grn],
            };
        }

        case 'ADD_PRODUCTION_BATCH': {
            const newStock = [...state.stock];
            // Deduct consumed raw materials
            action.batch.consumedIngredients.forEach(ing => {
                const idx = newStock.findIndex(s => s.itemId === ing.itemId);
                if (idx >= 0) {
                    const deductValue = (newStock[idx].value / newStock[idx].quantity) * ing.quantity;
                    newStock[idx] = {
                        ...newStock[idx],
                        quantity: Math.max(0, newStock[idx].quantity - ing.quantity),
                        value: Math.max(0, newStock[idx].value - deductValue),
                    };
                }
            });
            // Add bulk output
            const recipe = state.recipes.find(r => r.id === action.batch.recipeId);
            if (recipe) {
                const bulkIdx = newStock.findIndex(s => s.itemId === recipe.outputItemId);
                // Calculate cost of bulk = total cost of consumed ingredients
                const totalInputCost = action.batch.consumedIngredients.reduce((sum, ing) => {
                    const stockItem = state.stock.find(s => s.itemId === ing.itemId);
                    if (stockItem && stockItem.quantity > 0) {
                        return sum + (stockItem.value / stockItem.quantity) * ing.quantity;
                    }
                    return sum;
                }, 0);
                if (bulkIdx >= 0) {
                    newStock[bulkIdx] = {
                        ...newStock[bulkIdx],
                        quantity: newStock[bulkIdx].quantity + action.batch.actualOutput,
                        value: newStock[bulkIdx].value + totalInputCost,
                    };
                }
            }
            return {
                ...state,
                stock: newStock,
                productionBatches: [...state.productionBatches, action.batch],
            };
        }

        case 'ADD_PACKING_RUN': {
            const newStock = [...state.stock];
            const newThirdParty = [...state.thirdPartyBulk];

            // Deduct bulk powder
            if (action.run.sourceType === 'thirdparty') {
                // Find a matching bulk item name for the output
                const outputItem = state.items.find(i => i.id === action.run.outputItemId);
                if (outputItem) {
                    // Try to match third-party bulk by name pattern
                    const tpIdx = newThirdParty.findIndex(s =>
                        outputItem.name.toLowerCase().includes(s.itemName.toLowerCase().replace(' (bulk)', '').replace('(bulk)', ''))
                        || s.itemName.toLowerCase().includes(outputItem.name.toLowerCase().split(' ')[0])
                    );
                    if (tpIdx >= 0) {
                        const deductValue = (newThirdParty[tpIdx].value / newThirdParty[tpIdx].quantity) * action.run.bulkConsumed;
                        newThirdParty[tpIdx] = {
                            ...newThirdParty[tpIdx],
                            quantity: Math.max(0, newThirdParty[tpIdx].quantity - action.run.bulkConsumed),
                            value: Math.max(0, newThirdParty[tpIdx].value - deductValue),
                        };
                    }
                }
            } else {
                // Find matching bulk item
                const outputItem = state.items.find(i => i.id === action.run.outputItemId);
                if (outputItem) {
                    // Match bulk by name — e.g. "Garam Masala 100g Pouch" -> "Garam Masala (Bulk)"
                    const bulkIdx = newStock.findIndex(s =>
                        s.type === 'BULK_INHOUSE' &&
                        outputItem.name.toLowerCase().includes(s.itemName.toLowerCase().replace(' (bulk)', ''))
                    );
                    if (bulkIdx >= 0 && newStock[bulkIdx].quantity > 0) {
                        const deductValue = (newStock[bulkIdx].value / newStock[bulkIdx].quantity) * action.run.bulkConsumed;
                        newStock[bulkIdx] = {
                            ...newStock[bulkIdx],
                            quantity: Math.max(0, newStock[bulkIdx].quantity - action.run.bulkConsumed),
                            value: Math.max(0, newStock[bulkIdx].value - deductValue),
                        };
                    }
                }
            }

            // Deduct packing materials
            action.run.packingMaterialsConsumed.forEach(pm => {
                const idx = newStock.findIndex(s => s.itemId === pm.itemId);
                if (idx >= 0) {
                    const deductValue = newStock[idx].quantity > 0 ? (newStock[idx].value / newStock[idx].quantity) * pm.quantity : 0;
                    newStock[idx] = {
                        ...newStock[idx],
                        quantity: Math.max(0, newStock[idx].quantity - pm.quantity),
                        value: Math.max(0, newStock[idx].value - deductValue),
                    };
                }
            });

            // Add finished goods
            const fgIdx = newStock.findIndex(s => s.itemId === action.run.outputItemId);
            if (fgIdx >= 0) {
                newStock[fgIdx] = {
                    ...newStock[fgIdx],
                    quantity: newStock[fgIdx].quantity + action.run.unitsProduced,
                    value: newStock[fgIdx].value + (action.run.bulkConsumed * 500), // simplified cost
                };
            }

            return {
                ...state,
                stock: newStock,
                thirdPartyBulk: newThirdParty,
                packingRuns: [...state.packingRuns, action.run],
            };
        }

        case 'ADD_DISPATCH': {
            const newStock = [...state.stock];
            action.order.items.forEach(dispItem => {
                const idx = newStock.findIndex(s => s.itemId === dispItem.itemId);
                if (idx >= 0 && newStock[idx].quantity > 0) {
                    const deductValue = (newStock[idx].value / newStock[idx].quantity) * dispItem.quantity;
                    newStock[idx] = {
                        ...newStock[idx],
                        quantity: Math.max(0, newStock[idx].quantity - dispItem.quantity),
                        value: Math.max(0, newStock[idx].value - deductValue),
                    };
                }
            });
            return {
                ...state,
                stock: newStock,
                dispatchOrders: [...state.dispatchOrders, action.order],
            };
        }

        case 'ADD_NOTIFICATION':
            return { ...state, notifications: [...state.notifications, action.notification] };

        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };

        case 'RESET':
            return { ...initialState, stock: buildInitialStock() };

        case 'ADD_ITEM':
            return { ...state, items: [...state.items, action.item] };

        case 'ADD_SUPPLIER':
            return { ...state, suppliers: [...state.suppliers, action.supplier] };

        case 'ADD_CUSTOMER':
            return { ...state, customers: [...state.customers, action.customer] };

        case 'ADD_RECIPE':
            return { ...state, recipes: [...state.recipes, action.recipe] };

        default:
            return state;
    }
}

// ---- CONTEXT ----
const DemoContext = createContext<{
    state: DemoState;
    dispatch: Dispatch<DemoAction>;
} | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(demoReducer, { ...initialState, stock: buildInitialStock() });
    return (
        <DemoContext.Provider value={{ state, dispatch }}>
            {children}
        </DemoContext.Provider>
    );
}

export function useDemoContext() {
    const ctx = useContext(DemoContext);
    if (!ctx) throw new Error('useDemoContext must be used within DemoProvider');
    return ctx;
}
