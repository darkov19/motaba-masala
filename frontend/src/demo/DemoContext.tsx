import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import {
    type StockEntry, type BatchRecord, type TransactionRecord, type Recipe,
    getItemById, getItemName, ITEMS,
} from './data/mockMasters';
import {
    calcWeightedAvgCost, calcYieldPct, calcWastage,
    calcBulkCostPerKG, calcFGCostPerUnit, todayFormatted,
} from './data/calculations';

// ── State ────────────────────────────────────────────────────────
export interface DemoState {
    currentStep: number;
    completedSteps: number[];
    stock: Record<string, StockEntry>;
    batches: BatchRecord[];
    transactions: TransactionRecord[];
    counters: { grn: number; batch: number; packing: number; dispatch: number; txn: number };
    customRecipes: Recipe[];
}

const initialState: DemoState = {
    currentStep: 0,
    completedSteps: [],
    stock: {},
    batches: [],
    transactions: [],
    counters: { grn: 0, batch: 0, packing: 0, dispatch: 0, txn: 0 },
    customRecipes: [],
};

// ── Actions ──────────────────────────────────────────────────────
export type DemoAction =
    | { type: 'SET_STEP'; step: number }
    | { type: 'COMPLETE_STEP'; step: number }
    | { type: 'PROCESS_GRN'; supplierName: string; items: { itemId: string; qty: number; unitCost: number }[] }
    | { type: 'PROCESS_PRODUCTION'; recipeOutputId: string; actualConsumption: { itemId: string; qty: number }[]; outputQty: number }
    | { type: 'PROCESS_THIRD_PARTY'; supplierName: string; itemId: string; qty: number; unitCost: number }
    | { type: 'PROCESS_PACKING'; bulkItemId: string; fgItemId: string; units: number; packWeightG: number }
    | { type: 'PROCESS_DISPATCH'; customerName: string; items: { itemId: string; qty: number }[] }
    | { type: 'ADD_RECIPE'; recipe: Recipe }
    | { type: 'RESET' };

// ── Helpers ──────────────────────────────────────────────────────
const gs = (s: DemoState, id: string): StockEntry => s.stock[id] ?? { qty: 0, avgCost: 0 };
const ss = (stock: Record<string, StockEntry>, id: string, e: StockEntry) => ({ ...stock, [id]: e });
const txnId = (n: number) => `TXN-${String(n).padStart(4, '0')}`;

// ── Reducer ──────────────────────────────────────────────────────
function reducer(state: DemoState, action: DemoAction): DemoState {
    const date = todayFormatted();

    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.step };

        case 'COMPLETE_STEP':
            return state.completedSteps.includes(action.step)
                ? state
                : { ...state, completedSteps: [...state.completedSteps, action.step] };

        case 'PROCESS_GRN': {
            let stk = { ...state.stock };
            const entries: TransactionRecord['entries'] = [];
            const grnNo = state.counters.grn + 1;

            for (const it of action.items) {
                const ex = stk[it.itemId] ?? { qty: 0, avgCost: 0 };
                stk = ss(stk, it.itemId, {
                    qty: ex.qty + it.qty,
                    avgCost: calcWeightedAvgCost(ex.qty, ex.avgCost, it.qty, it.unitCost),
                });
                entries.push({ itemName: getItemName(it.itemId), qty: it.qty, unit: getItemById(it.itemId)?.unit ?? '', value: it.qty * it.unitCost, direction: 'in' });
            }

            const tNo = state.counters.txn + 1;
            return {
                ...state, stock: stk,
                transactions: [...state.transactions, { id: txnId(tNo), date, type: 'GRN', description: `GRN-${String(grnNo).padStart(4, '0')} from ${action.supplierName}`, entries }],
                counters: { ...state.counters, grn: grnNo, txn: tNo },
            };
        }

        case 'PROCESS_PRODUCTION': {
            let stk = { ...state.stock };
            const entries: TransactionRecord['entries'] = [];
            const bNo = state.counters.batch + 1;
            let totalCost = 0, totalIn = 0;

            for (const c of action.actualConsumption) {
                const ex = stk[c.itemId] ?? { qty: 0, avgCost: 0 };
                const val = c.qty * ex.avgCost;
                totalCost += val; totalIn += c.qty;
                stk = ss(stk, c.itemId, { qty: Math.max(0, ex.qty - c.qty), avgCost: ex.avgCost });
                entries.push({ itemName: getItemName(c.itemId), qty: c.qty, unit: 'KG', value: val, direction: 'out' });
            }

            const cpk = calcBulkCostPerKG(totalCost, action.outputQty);
            const exB = stk[action.recipeOutputId] ?? { qty: 0, avgCost: 0 };
            stk = ss(stk, action.recipeOutputId, {
                qty: exB.qty + action.outputQty,
                avgCost: calcWeightedAvgCost(exB.qty, exB.avgCost, action.outputQty, cpk),
            });
            entries.push({ itemName: getItemName(action.recipeOutputId), qty: action.outputQty, unit: 'KG', value: action.outputQty * cpk, direction: 'in' });

            const w = calcWastage(totalIn, action.outputQty);
            const y = calcYieldPct(action.outputQty, totalIn);
            const batchNo = `B-${String(bNo).padStart(4, '0')}`;
            const tNo = state.counters.txn + 1;

            return {
                ...state, stock: stk,
                batches: [...state.batches, { id: `BATCH-${bNo}`, batchNo, productName: getItemName(action.recipeOutputId), type: 'production', inputQty: totalIn, outputQty: action.outputQty, wastage: w, yieldPct: y, costPerUnit: cpk, date, source: 'in-house' }],
                transactions: [...state.transactions, { id: txnId(tNo), date, type: 'PRODUCTION', description: `Batch ${batchNo} — ${getItemName(action.recipeOutputId)}`, entries }],
                counters: { ...state.counters, batch: bNo, txn: tNo },
            };
        }

        case 'PROCESS_THIRD_PARTY': {
            let stk = { ...state.stock };
            const ex = stk[action.itemId] ?? { qty: 0, avgCost: 0 };
            stk = ss(stk, action.itemId, {
                qty: ex.qty + action.qty,
                avgCost: calcWeightedAvgCost(ex.qty, ex.avgCost, action.qty, action.unitCost),
            });
            const tNo = state.counters.txn + 1;
            return {
                ...state, stock: stk,
                transactions: [...state.transactions, { id: txnId(tNo), date, type: 'THIRD_PARTY', description: `Third-Party Bulk from ${action.supplierName} (External)`, entries: [{ itemName: getItemName(action.itemId), qty: action.qty, unit: 'KG', value: action.qty * action.unitCost, direction: 'in' }] }],
                counters: { ...state.counters, txn: tNo },
            };
        }

        case 'PROCESS_PACKING': {
            let stk = { ...state.stock };
            const entries: TransactionRecord['entries'] = [];
            const pNo = state.counters.packing + 1;
            const bulkNeeded = (action.units * action.packWeightG) / 1000;

            const exBulk = stk[action.bulkItemId] ?? { qty: 0, avgCost: 0 };
            const bulkVal = bulkNeeded * exBulk.avgCost;
            stk = ss(stk, action.bulkItemId, { qty: Math.max(0, exBulk.qty - bulkNeeded), avgCost: exBulk.avgCost });
            entries.push({ itemName: getItemName(action.bulkItemId), qty: bulkNeeded, unit: 'KG', value: bulkVal, direction: 'out' });

            let totalPkgCost = 0;
            const deductPkg = (id: string, q: number) => {
                const ex = stk[id] ?? { qty: 0, avgCost: 0 };
                const v = q * ex.avgCost; totalPkgCost += v;
                stk = ss(stk, id, { qty: Math.max(0, ex.qty - q), avgCost: ex.avgCost });
                entries.push({ itemName: getItemName(id), qty: q, unit: 'PCS', value: v, direction: 'out' });
            };
            deductPkg('PM-001', action.units);
            deductPkg('PM-003', action.units);
            deductPkg('PM-002', Math.ceil(action.units / 20));

            const pouchCost = (stk['PM-001'] ?? { qty: 0, avgCost: 0 }).avgCost || 2.5;
            const labelCost = (stk['PM-003'] ?? { qty: 0, avgCost: 0 }).avgCost || 0.5;
            const boxCost = ((stk['PM-002'] ?? { qty: 0, avgCost: 0 }).avgCost || 18) / 20;
            const fgCpu = calcFGCostPerUnit(exBulk.avgCost, action.packWeightG, pouchCost + labelCost + boxCost);
            const exFG = stk[action.fgItemId] ?? { qty: 0, avgCost: 0 };
            stk = ss(stk, action.fgItemId, {
                qty: exFG.qty + action.units,
                avgCost: calcWeightedAvgCost(exFG.qty, exFG.avgCost, action.units, fgCpu),
            });
            entries.push({ itemName: getItemName(action.fgItemId), qty: action.units, unit: 'PCS', value: action.units * fgCpu, direction: 'in' });

            const batchNo = `P-${String(pNo).padStart(4, '0')}`;
            const tNo = state.counters.txn + 1;
            return {
                ...state, stock: stk,
                batches: [...state.batches, { id: `PACK-${pNo}`, batchNo, productName: getItemName(action.fgItemId), type: 'packing', inputQty: bulkNeeded, outputQty: action.units, wastage: 0, yieldPct: 100, costPerUnit: fgCpu, date, source: 'in-house' }],
                transactions: [...state.transactions, { id: txnId(tNo), date, type: 'PACKING', description: `Packing Run ${batchNo} — ${getItemName(action.fgItemId)}`, entries }],
                counters: { ...state.counters, packing: pNo, txn: tNo },
            };
        }

        case 'PROCESS_DISPATCH': {
            let stk = { ...state.stock };
            const entries: TransactionRecord['entries'] = [];
            const dNo = state.counters.dispatch + 1;

            for (const it of action.items) {
                const ex = stk[it.itemId] ?? { qty: 0, avgCost: 0 };
                const val = it.qty * ex.avgCost;
                stk = ss(stk, it.itemId, { qty: Math.max(0, ex.qty - it.qty), avgCost: ex.avgCost });
                entries.push({ itemName: getItemName(it.itemId), qty: it.qty, unit: getItemById(it.itemId)?.unit ?? '', value: val, direction: 'out' });
            }

            const tNo = state.counters.txn + 1;
            return {
                ...state, stock: stk,
                transactions: [...state.transactions, { id: txnId(tNo), date, type: 'DISPATCH', description: `Dispatch D-${String(dNo).padStart(4, '0')} to ${action.customerName}`, entries }],
                counters: { ...state.counters, dispatch: dNo, txn: tNo },
            };
        }

        case 'ADD_RECIPE':
            return { ...state, customRecipes: [...state.customRecipes, action.recipe] };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// ── Context ──────────────────────────────────────────────────────
interface DemoCtx {
    state: DemoState;
    dispatch: React.Dispatch<DemoAction>;
    stockSummary: { raw: number; bulk: number; packing: number; fg: number; total: number };
}

const Ctx = createContext<DemoCtx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const stockSummary = React.useMemo(() => {
        let raw = 0, bulk = 0, packing = 0, fg = 0;
        for (const item of ITEMS) {
            const s = state.stock[item.id];
            if (!s) continue;
            const v = s.qty * s.avgCost;
            if (item.type === 'RAW') raw += v;
            else if (item.type === 'BULK') bulk += v;
            else if (item.type === 'PACKING') packing += v;
            else if (item.type === 'FG') fg += v;
        }
        return { raw, bulk, packing, fg, total: raw + bulk + packing + fg };
    }, [state.stock]);

    return <Ctx.Provider value={{ state, dispatch, stockSummary }}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useDemo must be inside DemoProvider');
    return ctx;
}
