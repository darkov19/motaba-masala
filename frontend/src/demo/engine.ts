import { DemoAction, DemoState, StockRecord } from "./types";

const now = () => new Date().toLocaleTimeString();
let seq = 100;
const nextId = (prefix: string) => `${prefix}-${seq++}`;

const round = (n: number) => Number(n.toFixed(2));

const updateStock = (
    stock: StockRecord[],
    id: string,
    qtyDelta: number,
    unitCost?: number,
): StockRecord[] =>
    stock.map(record =>
        record.id === id
            ? {
                  ...record,
                  qty: round(record.qty + qtyDelta),
                  unitCost: unitCost ?? record.unitCost,
              }
            : record,
    );

export const initialDemoState = (): DemoState => ({
    stock: [
        {
            id: "raw-chili",
            name: "Dry Red Chili",
            category: "RAW",
            uom: "kg",
            qty: 50,
            unitCost: 190,
        },
        {
            id: "raw-coriander",
            name: "Coriander Seed",
            category: "RAW",
            uom: "kg",
            qty: 40,
            unitCost: 110,
        },
        {
            id: "raw-turmeric",
            name: "Turmeric Finger",
            category: "RAW",
            uom: "kg",
            qty: 30,
            unitCost: 145,
        },
        {
            id: "pack-pouch100",
            name: "100g Pouch",
            category: "PACK_MATERIAL",
            uom: "pcs",
            qty: 1500,
            unitCost: 1.8,
        },
    ],
    bulkBatches: [],
    finishedGoodsPcs: 0,
    finishedGoodsUnitCost: 0,
    wastageKg: 0,
    events: [
        {
            id: "evt-boot",
            at: now(),
            title: "Demo Initialized",
            detail: "Isolated in-memory workflow; no production DB/files used.",
        },
    ],
});

export const totalStockValue = (state: DemoState) => {
    const base = state.stock.reduce((sum, s) => sum + s.qty * s.unitCost, 0);
    const bulk = state.bulkBatches.reduce((sum, b) => sum + b.qtyKg * b.unitCost, 0);
    const fg = state.finishedGoodsPcs * state.finishedGoodsUnitCost;
    return round(base + bulk + fg);
};

export const reducer = (state: DemoState, action: DemoAction): DemoState => {
    switch (action.type) {
        case "RESET":
            return initialDemoState();
        case "PROCURE_RAW": {
            const stock = updateStock(
                updateStock(
                    updateStock(state.stock, "raw-chili", 25, 192),
                    "raw-coriander",
                    20,
                    112,
                ),
                "pack-pouch100",
                600,
                1.9,
            );
            return {
                ...state,
                stock,
                events: [
                    {
                        id: nextId("evt"),
                        at: now(),
                        title: "GRN Posted",
                        detail: "Purchased Raw + Packing Material from approved suppliers.",
                    },
                    ...state.events,
                ],
            };
        }
        case "RUN_IN_HOUSE_BATCH": {
            const chiliUse = 18;
            const corianderUse = 10;
            const turmericUse = 7;
            const totalInput = chiliUse + corianderUse + turmericUse;
            const outputKg = 32;
            const wastage = round(totalInput - outputKg);

            const chiliCost = state.stock.find(s => s.id === "raw-chili")?.unitCost ?? 0;
            const corianderCost =
                state.stock.find(s => s.id === "raw-coriander")?.unitCost ?? 0;
            const turmericCost =
                state.stock.find(s => s.id === "raw-turmeric")?.unitCost ?? 0;

            const productionCost =
                chiliUse * chiliCost + corianderUse * corianderCost + turmericUse * turmericCost;
            const unitCost = round(productionCost / outputKg);

            const stock = updateStock(
                updateStock(
                    updateStock(state.stock, "raw-chili", -chiliUse),
                    "raw-coriander",
                    -corianderUse,
                ),
                "raw-turmeric",
                -turmericUse,
            );
            const batchId = nextId("BULK");
            return {
                ...state,
                stock,
                wastageKg: round(state.wastageKg + wastage),
                bulkBatches: [
                    {
                        id: batchId,
                        source: "IN_HOUSE",
                        product: "Garam Masala Bulk",
                        qtyKg: outputKg,
                        unitCost,
                        traceRef: "Recipe BOM v1.0",
                    },
                    ...state.bulkBatches,
                ],
                events: [
                    {
                        id: nextId("evt"),
                        at: now(),
                        title: "In-House Batch Completed",
                        detail: `${batchId}: ${outputKg}kg output with ${wastage}kg process loss captured.`,
                    },
                    ...state.events,
                ],
            };
        }
        case "PROCURE_THIRD_PARTY_BULK": {
            const batchId = nextId("BULK");
            return {
                ...state,
                bulkBatches: [
                    {
                        id: batchId,
                        source: "THIRD_PARTY",
                        product: "Kitchen King Bulk",
                        qtyKg: 20,
                        unitCost: 238,
                        traceRef: "Supplier Batch TP-78A",
                    },
                    ...state.bulkBatches,
                ],
                events: [
                    {
                        id: nextId("evt"),
                        at: now(),
                        title: "Third-Party Bulk Procured",
                        detail: `${batchId}: 20kg procured for repacking workflow.`,
                    },
                    ...state.events,
                ],
            };
        }
        case "RUN_PACKING": {
            if (state.bulkBatches.length === 0) {
                return {
                    ...state,
                    events: [
                        {
                            id: nextId("evt"),
                            at: now(),
                            title: "Packing Skipped",
                            detail: "No bulk batch available. Run production/procurement first.",
                        },
                        ...state.events,
                    ],
                };
            }
            const source = state.bulkBatches[0];
            const consumeKg = Math.min(12, source.qtyKg);
            const pcsProduced = Math.floor((consumeKg * 1000) / 100);
            const pouchesNeeded = pcsProduced;

            const pouchCost = state.stock.find(s => s.id === "pack-pouch100")?.unitCost ?? 0;
            const packedUnitCost = round((consumeKg * source.unitCost + pouchesNeeded * pouchCost) / pcsProduced);

            const updatedSourceQty = round(source.qtyKg - consumeKg);
            const bulkBatches =
                updatedSourceQty > 0
                    ? [{ ...source, qtyKg: updatedSourceQty }, ...state.bulkBatches.slice(1)]
                    : state.bulkBatches.slice(1);
            const stock = updateStock(state.stock, "pack-pouch100", -pouchesNeeded);
            const newFgQty = state.finishedGoodsPcs + pcsProduced;
            const newAvgCost =
                state.finishedGoodsPcs === 0
                    ? packedUnitCost
                    : round(
                          (state.finishedGoodsPcs * state.finishedGoodsUnitCost +
                              pcsProduced * packedUnitCost) /
                              newFgQty,
                      );

            return {
                ...state,
                stock,
                bulkBatches,
                finishedGoodsPcs: newFgQty,
                finishedGoodsUnitCost: newAvgCost,
                events: [
                    {
                        id: nextId("evt"),
                        at: now(),
                        title: "Packing Run Completed",
                        detail: `Source ${source.id} -> ${pcsProduced} pcs FG (100g), full traceability preserved.`,
                    },
                    ...state.events,
                ],
            };
        }
        case "RUN_DISPATCH": {
            const dispatchQty = Math.min(80, state.finishedGoodsPcs);
            if (dispatchQty === 0) {
                return {
                    ...state,
                    events: [
                        {
                            id: nextId("evt"),
                            at: now(),
                            title: "Dispatch Blocked",
                            detail: "No finished stock available for sales dispatch.",
                        },
                        ...state.events,
                    ],
                };
            }
            return {
                ...state,
                finishedGoodsPcs: state.finishedGoodsPcs - dispatchQty,
                events: [
                    {
                        id: nextId("evt"),
                        at: now(),
                        title: "Sales Dispatch Posted",
                        detail: `${dispatchQty} pcs dispatched using batch-first policy.`,
                    },
                    ...state.events,
                ],
            };
        }
        default:
            return state;
    }
};
