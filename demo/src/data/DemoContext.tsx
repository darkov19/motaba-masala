import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
    DemoState, Item, Recipe, Supplier, Customer,
    GRNEntry, GRNLineItem, ProductionBatch, ConsumedMaterial,
    PackingRun, PackingMaterialUsed, DispatchNote, DispatchLineItem,
    StockMovement, GRNType, BulkSource,
} from '../types';
import { seedItems, seedRecipes, seedSuppliers, seedCustomers } from './seedData';

// ============================================================
// Action types
// ============================================================

type Action =
    | { type: 'ADD_ITEM'; payload: Item }
    | { type: 'ADD_RECIPE'; payload: Recipe }
    | { type: 'ADD_SUPPLIER'; payload: Supplier }
    | { type: 'ADD_CUSTOMER'; payload: Customer }
    | { type: 'ADD_GRN'; payload: { supplierId: string; items: GRNLineItem[]; invoiceNo: string; grnType: GRNType } }
    | { type: 'CREATE_BATCH'; payload: { recipeId: string } }
    | { type: 'EXECUTE_RECIPE'; payload: { batchId: string; consumed: ConsumedMaterial[] } }
    | { type: 'COMPLETE_BATCH'; payload: { batchId: string; outputQty: number; wastageQty: number } }
    | { type: 'CREATE_PACKING_RUN'; payload: { sourceBatchId: string; outputItemId: string; outputQty: number; packingMaterials: PackingMaterialUsed[] } }
    | { type: 'CREATE_DISPATCH'; payload: { customerId: string; items: DispatchLineItem[] } };

// ============================================================
// Helpers
// ============================================================

let _counter = 1;
const genId = (prefix: string) => `${prefix}-${String(_counter++).padStart(4, '0')}`;
const now = () => new Date().toISOString();

// ============================================================
// Reducer
// ============================================================

function demoReducer(state: DemoState, action: Action): DemoState {
    switch (action.type) {

        // ---- Master Data ----

        case 'ADD_ITEM':
            return { ...state, items: [...state.items, action.payload] };

        case 'ADD_RECIPE':
            return { ...state, recipes: [...state.recipes, action.payload] };

        case 'ADD_SUPPLIER':
            return { ...state, suppliers: [...state.suppliers, action.payload] };

        case 'ADD_CUSTOMER':
            return { ...state, customers: [...state.customers, action.payload] };

        // ---- Procurement / GRN ----

        case 'ADD_GRN': {
            const { supplierId, items: grnItems, invoiceNo, grnType } = action.payload;
            const grnId = genId('GRN');
            const totalValue = grnItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
            const entry: GRNEntry = {
                id: grnId,
                type: grnType,
                supplierId,
                items: grnItems,
                invoiceNo,
                date: now(),
                totalValue,
            };

            // Update item stocks and weighted average cost
            const updatedItems = state.items.map(item => {
                const line = grnItems.find(li => li.itemId === item.id);
                if (!line) return item;
                const oldTotal = item.avgCost * item.currentStock;
                const newTotal = line.unitPrice * line.qty;
                const newStock = item.currentStock + line.qty;
                const newAvg = newStock > 0 ? (oldTotal + newTotal) / newStock : 0;
                return { ...item, currentStock: newStock, avgCost: Math.round(newAvg * 100) / 100 };
            });

            // Create stock movements
            const movements: StockMovement[] = grnItems.map(li => ({
                id: genId('SM'),
                itemId: li.itemId,
                type: 'GRN' as const,
                qty: li.qty,
                value: li.qty * li.unitPrice,
                timestamp: now(),
                referenceId: grnId,
                description: `GRN ${grnType === 'ThirdPartyBulk' ? '(Third-Party)' : '(Standard)'} from supplier`,
            }));

            return {
                ...state,
                items: updatedItems,
                grnEntries: [...state.grnEntries, entry],
                stockMovements: [...state.stockMovements, ...movements],
            };
        }

        // ---- Production ----

        case 'CREATE_BATCH': {
            const recipe = state.recipes.find(r => r.id === action.payload.recipeId);
            if (!recipe) return state;
            const batchId = genId('BATCH');
            const batch: ProductionBatch = {
                id: batchId,
                recipeId: recipe.id,
                status: 'Planned',
                consumedMaterials: recipe.ingredients.map(ing => ({
                    itemId: ing.itemId,
                    standardQty: ing.standardQty,
                    actualQty: 0,
                })),
                outputQty: 0,
                wastageQty: 0,
                yieldPercent: 0,
                costPerUnit: 0,
                date: now(),
                source: 'InHouse',
            };
            return { ...state, productionBatches: [...state.productionBatches, batch] };
        }

        case 'EXECUTE_RECIPE': {
            const { batchId, consumed } = action.payload;

            // Deduct raw materials
            const updatedItems = state.items.map(item => {
                const mat = consumed.find(c => c.itemId === item.id);
                if (!mat) return item;
                return { ...item, currentStock: Math.max(0, item.currentStock - mat.actualQty) };
            });

            // Stock movements
            const movements: StockMovement[] = consumed.map(c => ({
                id: genId('SM'),
                itemId: c.itemId,
                type: 'PRODUCTION_CONSUME' as const,
                qty: -c.actualQty,
                value: -(state.items.find(i => i.id === c.itemId)?.avgCost ?? 0) * c.actualQty,
                timestamp: now(),
                referenceId: batchId,
                description: `Consumed for batch ${batchId}`,
            }));

            // Update batch
            const updatedBatches = state.productionBatches.map(b =>
                b.id === batchId
                    ? { ...b, status: 'In-Progress' as const, consumedMaterials: consumed }
                    : b
            );

            return {
                ...state,
                items: updatedItems,
                productionBatches: updatedBatches,
                stockMovements: [...state.stockMovements, ...movements],
            };
        }

        case 'COMPLETE_BATCH': {
            const { batchId, outputQty, wastageQty } = action.payload;
            const batch = state.productionBatches.find(b => b.id === batchId);
            if (!batch) return state;
            const recipe = state.recipes.find(r => r.id === batch.recipeId);
            if (!recipe) return state;

            // Calculate cost
            const totalInputCost = batch.consumedMaterials.reduce((sum, cm) => {
                const item = state.items.find(i => i.id === cm.itemId);
                return sum + (item?.avgCost ?? 0) * cm.actualQty;
            }, 0);
            const totalInputQty = batch.consumedMaterials.reduce((s, c) => s + c.actualQty, 0);
            const yieldPercent = totalInputQty > 0 ? Math.round((outputQty / totalInputQty) * 100 * 100) / 100 : 0;
            const costPerUnit = outputQty > 0 ? Math.round((totalInputCost / outputQty) * 100) / 100 : 0;

            // Update bulk item stock + avg cost
            const updatedItems = state.items.map(item => {
                if (item.id !== recipe.outputItemId) return item;
                const oldTotal = item.avgCost * item.currentStock;
                const newTotal = totalInputCost;
                const newStock = item.currentStock + outputQty;
                const newAvg = newStock > 0 ? (oldTotal + newTotal) / newStock : 0;
                return { ...item, currentStock: newStock, avgCost: Math.round(newAvg * 100) / 100 };
            });

            const updatedBatches = state.productionBatches.map(b =>
                b.id === batchId
                    ? { ...b, status: 'Completed' as const, outputQty, wastageQty, yieldPercent, costPerUnit }
                    : b
            );

            const movements: StockMovement[] = [
                {
                    id: genId('SM'), itemId: recipe.outputItemId, type: 'PRODUCTION_OUTPUT',
                    qty: outputQty, value: totalInputCost, timestamp: now(),
                    referenceId: batchId, description: `Bulk output from batch ${batchId}`,
                },
                {
                    id: genId('SM'), itemId: recipe.outputItemId, type: 'WASTAGE',
                    qty: -wastageQty, value: 0, timestamp: now(),
                    referenceId: batchId, description: `Wastage from batch ${batchId}`,
                },
            ];

            return {
                ...state,
                items: updatedItems,
                productionBatches: updatedBatches,
                stockMovements: [...state.stockMovements, ...movements],
            };
        }

        // ---- Packing ----

        case 'CREATE_PACKING_RUN': {
            const { sourceBatchId, outputItemId, outputQty, packingMaterials } = action.payload;
            const runId = genId('PACK');
            const fgItem = state.items.find(i => i.id === outputItemId);
            const packWeightKg = (fgItem?.packWeight ?? 100) / 1000; // grams -> KG
            const bulkConsumed = Math.round(outputQty * packWeightKg * 1000) / 1000;

            // Find source batch to determine source type
            const sourceBatch = state.productionBatches.find(b => b.id === sourceBatchId);
            // For third-party bulk GRN, sourceBatchId will start with "GRN-" 
            const sourceType: BulkSource = sourceBatchId.startsWith('GRN-') ? 'External' : (sourceBatch?.source ?? 'InHouse');

            // Determine which bulk item to deduct from
            let bulkItemId = '';
            if (sourceBatch) {
                const recipe = state.recipes.find(r => r.id === sourceBatch.recipeId);
                bulkItemId = recipe?.outputItemId ?? '';
            } else {
                // Third-party bulk: find the bulk item that maps to this FG
                // Simple heuristic: match by name
                const fgName = fgItem?.name?.toLowerCase() ?? '';
                const bulkItem = state.items.find(i => i.type === 'BULK' && fgName.includes(i.name.split(' ')[0].toLowerCase()));
                bulkItemId = bulkItem?.id ?? '';
            }

            // Deduct bulk stock + packing materials
            const updatedItems = state.items.map(item => {
                if (item.id === bulkItemId) {
                    return { ...item, currentStock: Math.max(0, item.currentStock - bulkConsumed) };
                }
                const pm = packingMaterials.find(p => p.itemId === item.id);
                if (pm) {
                    return { ...item, currentStock: Math.max(0, item.currentStock - pm.qty) };
                }
                // Add FG stock
                if (item.id === outputItemId) {
                    const bulkItem = state.items.find(i => i.id === bulkItemId);
                    const bulkCostPer = (bulkItem?.avgCost ?? 0) * packWeightKg;
                    const packCost = packingMaterials.reduce((s, p) => {
                        const pi = state.items.find(i => i.id === p.itemId);
                        return s + (pi?.avgCost ?? 0) * (p.qty / outputQty);
                    }, 0);
                    const fgCostPerUnit = Math.round((bulkCostPer + packCost) * 100) / 100;
                    const oldTotal = item.avgCost * item.currentStock;
                    const newTotal = fgCostPerUnit * outputQty;
                    const newStock = item.currentStock + outputQty;
                    const newAvg = newStock > 0 ? (oldTotal + newTotal) / newStock : 0;
                    return { ...item, currentStock: newStock, avgCost: Math.round(newAvg * 100) / 100 };
                }
                return item;
            });

            const run: PackingRun = {
                id: runId,
                sourceBatchId,
                sourceType,
                outputItemId,
                outputQty,
                bulkConsumed,
                packingMaterialsUsed: packingMaterials,
                status: 'Completed',
                date: now(),
                costPerUnit: updatedItems.find(i => i.id === outputItemId)?.avgCost ?? 0,
            };

            const movements: StockMovement[] = [
                {
                    id: genId('SM'), itemId: bulkItemId, type: 'PACK_BULK_DEDUCT',
                    qty: -bulkConsumed, value: 0, timestamp: now(),
                    referenceId: runId, description: `Bulk consumed for packing ${runId}`,
                },
                ...packingMaterials.map(pm => ({
                    id: genId('SM'), itemId: pm.itemId, type: 'PACK_MATERIAL_DEDUCT' as const,
                    qty: -pm.qty, value: 0, timestamp: now(),
                    referenceId: runId, description: `Packing material consumed for ${runId}`,
                })),
                {
                    id: genId('SM'), itemId: outputItemId, type: 'PACK_FG_ADD',
                    qty: outputQty, value: 0, timestamp: now(),
                    referenceId: runId, description: `FG created from packing ${runId} (${sourceType})`,
                },
            ];

            return {
                ...state,
                items: updatedItems,
                packingRuns: [...state.packingRuns, run],
                stockMovements: [...state.stockMovements, ...movements],
            };
        }

        // ---- Dispatch ----

        case 'CREATE_DISPATCH': {
            const { customerId, items: dispatchItems } = action.payload;
            const dispId = genId('DISP');
            const totalValue = dispatchItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
            const dispatch: DispatchNote = {
                id: dispId,
                customerId,
                items: dispatchItems,
                date: now(),
                status: 'Dispatched',
                totalValue,
            };

            const updatedItems = state.items.map(item => {
                const line = dispatchItems.find(li => li.itemId === item.id);
                if (!line) return item;
                return { ...item, currentStock: Math.max(0, item.currentStock - line.qty) };
            });

            const movements: StockMovement[] = dispatchItems.map(li => ({
                id: genId('SM'),
                itemId: li.itemId,
                type: 'DISPATCH' as const,
                qty: -li.qty,
                value: -(li.qty * li.unitPrice),
                timestamp: now(),
                referenceId: dispId,
                description: `Dispatched to customer`,
            }));

            return {
                ...state,
                items: updatedItems,
                dispatches: [...state.dispatches, dispatch],
                stockMovements: [...state.stockMovements, ...movements],
            };
        }

        default:
            return state;
    }
}

// ============================================================
// Context
// ============================================================

const initialState: DemoState = {
    items: seedItems,
    recipes: seedRecipes,
    suppliers: seedSuppliers,
    customers: seedCustomers,
    grnEntries: [],
    productionBatches: [],
    packingRuns: [],
    dispatches: [],
    stockMovements: [],
};

interface DemoContextValue {
    state: DemoState;
    dispatch: React.Dispatch<Action>;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(demoReducer, initialState);
    return (
        <DemoContext.Provider value={{ state, dispatch }}>
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    const ctx = useContext(DemoContext);
    if (!ctx) throw new Error('useDemo must be used within DemoProvider');
    return ctx;
}
