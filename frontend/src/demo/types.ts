export type ItemCategory = "RAW" | "BULK" | "PACK_MATERIAL" | "FINISHED_GOOD";

export type StockRecord = {
    id: string;
    name: string;
    category: ItemCategory;
    uom: "kg" | "pcs";
    qty: number;
    unitCost: number;
};

export type Batch = {
    id: string;
    source: "IN_HOUSE" | "THIRD_PARTY";
    product: string;
    qtyKg: number;
    unitCost: number;
    traceRef: string;
};

export type WorkflowEvent = {
    id: string;
    at: string;
    title: string;
    detail: string;
};

export type DemoState = {
    stock: StockRecord[];
    bulkBatches: Batch[];
    finishedGoodsPcs: number;
    finishedGoodsUnitCost: number;
    wastageKg: number;
    events: WorkflowEvent[];
};

export type DemoAction =
    | { type: "RESET" }
    | { type: "PROCURE_RAW" }
    | { type: "RUN_IN_HOUSE_BATCH" }
    | { type: "PROCURE_THIRD_PARTY_BULK" }
    | { type: "RUN_PACKING" }
    | { type: "RUN_DISPATCH" };
