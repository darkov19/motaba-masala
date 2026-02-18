import type {
    Batch,
    DemoAction,
    DemoActionResult,
    DemoKpi,
    DemoState,
    GuidedStep,
    Item,
    LedgerEntry,
    Recipe,
    TraceabilityGraph,
    TraceabilityNode,
} from "../types";

const STORAGE_KEY = "motaba_demo_state_v1";
const META_KEY = "motaba_demo_meta_v1";

type DemoMeta = {
    nextSerial: Record<string, number>;
    totalRawInputKg: number;
    totalWastageKg: number;
};

const defaultMeta = (): DemoMeta => ({
    nextSerial: {
        LOT: 1,
        BAT: 1,
        GRN: 1,
        DIS: 1,
        PRD: 1,
        PCK: 1,
    },
    totalRawInputKg: 0,
    totalWastageKg: 0,
});

function nowIso(): string {
    return new Date().toISOString();
}

function makeSeed(profile = "standard"): DemoState {
    const items: Item[] = [
        { id: "raw-coriander", name: "Coriander Seed", type: "RAW", unit: "kg", min_stock: 80 },
        { id: "raw-chilli", name: "Red Chilli", type: "RAW", unit: "kg", min_stock: 50 },
        { id: "pack-pouch-100", name: "100g Pouch", type: "PACK", unit: "pcs", min_stock: 2500 },
        { id: "bulk-garam", name: "Garam Masala Bulk", type: "BULK", unit: "kg", min_stock: 20 },
        { id: "fg-garam-100", name: "Garam Masala 100g", type: "FG", unit: "pcs", pack_weight_gram: 100, min_stock: 1000 },
    ];

    const recipes: Recipe[] = [
        {
            code: "RCP-GARAM-001",
            name: "Garam Masala Base",
            output_bulk_id: "bulk-garam",
            loss_percent: 0.05,
            ingredients: [
                { item_id: "raw-coriander", ratio_per_kg_out: 0.7 },
                { item_id: "raw-chilli", ratio_per_kg_out: 0.35 },
            ],
        },
    ];

    const guidedSteps: GuidedStep[] = [
        { id: "step-1", title: "Master Setup", description: "Loaded masters and recipe model.", expected_outcome: "Digital twin configuration is ready." },
        { id: "step-2", title: "Raw GRN", description: "Receive raw spices and packing material.", expected_outcome: "Raw and pack inventory increases with lots." },
        { id: "step-3", title: "Third-Party Bulk GRN", description: "Receive external bulk.", expected_outcome: "Bulk stock available from external source." },
        { id: "step-4", title: "In-House Production", description: "Execute recipe and record wastage.", expected_outcome: "Raw reduces and in-house bulk created." },
        { id: "step-5", title: "Packing Run", description: "Convert bulk to FG.", expected_outcome: "FG increases with source traceability." },
        { id: "step-6", title: "Sales Dispatch", description: "Dispatch FG with FIFO + override.", expected_outcome: "FG reduced and dispatch recorded." },
        { id: "step-7", title: "Reports", description: "Review valuation/wastage/traceability.", expected_outcome: "Full end-to-end visibility shown." },
    ];

    const positions: DemoState["positions"] = {};
    items.forEach(item => {
        positions[item.id] = {
            item_id: item.id,
            quantity: 0,
            value: 0,
            unit: item.unit,
            avg_cost: 0,
            updated_at: "",
        };
    });

    return {
        persona: "admin",
        seed_profile: profile,
        currency: "INR",
        items,
        suppliers: [
            { id: "sup-local-spice", name: "Arihant Spices Traders" },
            { id: "sup-ext-bulk", name: "Third Party Bulk Mills" },
            { id: "sup-packaging", name: "SmartPack Industries" },
        ],
        customers: [
            { id: "cust-a1", name: "City Retail Mart" },
            { id: "cust-a2", name: "Krishna Wholesale" },
        ],
        recipes,
        lots: [],
        batches: [],
        ledger: [],
        positions,
        alerts: [],
        guided_steps: guidedSteps,
        current_step_id: "step-1",
        completed_steps: [],
        activity_timeline: ["Demo initialized with deterministic seed data."],
    };
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function round4(value: number): number {
    return Math.round(value * 10000) / 10000;
}

function parseNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return fallback;
}

function parseText(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function parseBool(value: unknown, fallback = false): boolean {
    return typeof value === "boolean" ? value : fallback;
}

function loadState(): DemoState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const seeded = makeSeed();
        saveState(seeded);
        return seeded;
    }
    return JSON.parse(raw) as DemoState;
}

function saveState(state: DemoState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadMeta(): DemoMeta {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) {
        const meta = defaultMeta();
        saveMeta(meta);
        return meta;
    }
    return JSON.parse(raw) as DemoMeta;
}

function saveMeta(meta: DemoMeta): void {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function resetLocal(profile: string): DemoState {
    const seed = makeSeed(profile || "standard");
    saveState(seed);
    saveMeta(defaultMeta());
    return seed;
}

function nextCode(meta: DemoMeta, prefix: keyof DemoMeta["nextSerial"]): string {
    const serial = meta.nextSerial[prefix] ?? 1;
    meta.nextSerial[prefix] = serial + 1;
    return `${prefix}-${String(serial).padStart(3, "0")}`;
}

function addActivity(state: DemoState, message: string): void {
    const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
    state.activity_timeline.push(`${time} | ${message}`);
}

function applyStock(state: DemoState, itemId: string, qtyDelta: number, valueDelta: number): void {
    const pos = state.positions[itemId];
    if (!pos) return;
    pos.quantity = round4(Math.max(0, pos.quantity + qtyDelta));
    pos.value = round2(Math.max(0, pos.value + valueDelta));
    pos.avg_cost = pos.quantity > 0 ? round4(pos.value / pos.quantity) : 0;
    pos.updated_at = nowIso();
}

function itemById(state: DemoState, itemId: string): Item {
    const found = state.items.find(item => item.id === itemId);
    if (!found) {
        throw new Error(`item not found: ${itemId}`);
    }
    return found;
}

function rebuildAlerts(state: DemoState): void {
    state.alerts = state.items
        .map(item => {
            const pos = state.positions[item.id];
            if (!pos) return null;
            if (pos.quantity < item.min_stock) {
                return {
                    level: "warning",
                    message: `Low stock: ${item.name} is below min level (${pos.quantity.toFixed(2)} < ${item.min_stock.toFixed(2)})`,
                };
            }
            return null;
        })
        .filter(Boolean) as DemoState["alerts"];
}

function kpi(state: DemoState, meta: DemoMeta): DemoKpi {
    let rawQ = 0;
    let rawV = 0;
    let bulkQ = 0;
    let bulkV = 0;
    let fgQ = 0;
    let fgV = 0;
    let low = 0;

    state.items.forEach(item => {
        const pos = state.positions[item.id];
        if (!pos) return;
        if (item.type === "RAW") {
            rawQ += pos.quantity;
            rawV += pos.value;
        }
        if (item.type === "BULK") {
            bulkQ += pos.quantity;
            bulkV += pos.value;
        }
        if (item.type === "FG") {
            fgQ += pos.quantity;
            fgV += pos.value;
        }
        if (pos.quantity < item.min_stock) {
            low += 1;
        }
    });

    const wastage = meta.totalRawInputKg > 0 ? (meta.totalWastageKg / meta.totalRawInputKg) * 100 : 0;

    return {
        raw_quantity_kg: round2(rawQ),
        raw_value: round2(rawV),
        bulk_quantity_kg: round2(bulkQ),
        bulk_value: round2(bulkV),
        fg_quantity_pcs: round2(fgQ),
        fg_value: round2(fgV),
        wastage_percent: round2(wastage),
        low_stock_count: low,
        currency: state.currency,
    };
}

function createGRN(state: DemoState, meta: DemoMeta, data: Record<string, unknown>): string {
    const itemId = parseText(data.item_id);
    const quantity = parseNumber(data.quantity);
    const unitRate = parseNumber(data.unit_rate);
    const supplierId = parseText(data.supplier_id);
    const source = parseText(data.source, "raw");
    const expiryDays = parseNumber(data.expiry_days, 180);

    if (!itemId || quantity <= 0 || unitRate < 0) {
        throw new Error("quantity and unit_rate must be valid");
    }

    const item = itemById(state, itemId);
    const ref = nextCode(meta, "GRN");
    const value = round2(quantity * unitRate);
    applyStock(state, itemId, quantity, value);

    if (item.type === "RAW" || item.type === "PACK") {
        const lotCode = nextCode(meta, "LOT");
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + Math.floor(expiryDays));
        state.lots.push({
            code: lotCode,
            item_id: itemId,
            quantity: round2(quantity),
            expiry_date: expiry.toISOString(),
            source_ref: ref,
        });
    }

    state.ledger.push({
        ref_code: ref,
        type: "GRN",
        item_id: itemId,
        quantity: round2(quantity),
        value,
        description: `GRN from supplier ${supplierId} (${source})`,
        occurred_at: nowIso(),
    });

    addActivity(state, `GRN recorded for ${item.name}: ${quantity.toFixed(2)} ${item.unit}`);
    return `GRN completed: ${ref}`;
}

function createThirdPartyBulkGRN(state: DemoState, meta: DemoMeta, data: Record<string, unknown>): string {
    const itemId = parseText(data.item_id);
    const item = itemById(state, itemId);
    if (item.type !== "BULK") {
        throw new Error("third-party GRN only supports bulk items");
    }

    const msg = createGRN(state, meta, data);
    const quantity = parseNumber(data.quantity);
    const unitRate = parseNumber(data.unit_rate);
    const code = nextCode(meta, "BAT");

    state.batches.push({
        code,
        item_id: itemId,
        quantity: round2(quantity),
        remaining_qty: round2(quantity),
        unit: item.unit,
        value: round2(quantity * unitRate),
        source_type: "external",
        created_at: nowIso(),
    });

    addActivity(state, `External bulk batch created: ${code}`);
    return msg;
}

function runProduction(state: DemoState, meta: DemoMeta, data: Record<string, unknown>): string {
    const recipeCode = parseText(data.recipe_code);
    const outputQty = parseNumber(data.output_qty_kg);
    const wastageKg = parseNumber(data.wastage_kg);
    if (!recipeCode || outputQty <= 0) {
        throw new Error("recipe_code and output_qty_kg are required");
    }

    const recipe = state.recipes.find(r => r.code === recipeCode);
    if (!recipe) throw new Error(`recipe not found: ${recipeCode}`);

    let consumedValue = 0;
    let consumedQty = 0;

    recipe.ingredients.forEach(ing => {
        const required = outputQty * ing.ratio_per_kg_out + wastageKg * ing.ratio_per_kg_out;
        const pos = state.positions[ing.item_id];
        if (!pos || pos.quantity + 1e-9 < required) {
            const item = itemById(state, ing.item_id);
            throw new Error(`insufficient raw stock for ${item.name}`);
        }
        const value = required * pos.avg_cost;
        applyStock(state, ing.item_id, -required, -value);
        consumedValue += value;
        consumedQty += required;
        state.ledger.push({
            ref_code: nextCode(meta, "PRD"),
            type: "PRODUCTION_CONSUME",
            item_id: ing.item_id,
            quantity: -round2(required),
            value: -round2(value),
            description: `Consumed in production recipe ${recipe.code}`,
            occurred_at: nowIso(),
        });
    });

    const bulk = itemById(state, recipe.output_bulk_id);
    applyStock(state, recipe.output_bulk_id, outputQty, consumedValue);
    const code = nextCode(meta, "BAT");
    state.batches.push({
        code,
        item_id: recipe.output_bulk_id,
        quantity: round2(outputQty),
        remaining_qty: round2(outputQty),
        unit: bulk.unit,
        value: round2(consumedValue),
        source_type: "in-house",
        created_at: nowIso(),
    });

    meta.totalRawInputKg += consumedQty;
    meta.totalWastageKg += wastageKg;

    state.ledger.push({
        ref_code: nextCode(meta, "PRD"),
        type: "PRODUCTION_OUTPUT",
        item_id: recipe.output_bulk_id,
        quantity: round2(outputQty),
        value: round2(consumedValue),
        description: `Produced bulk batch ${code}`,
        occurred_at: nowIso(),
    });

    addActivity(state, `Production batch created: ${code} (${outputQty.toFixed(2)} kg)`);
    return "Production run completed";
}

function runPacking(state: DemoState, meta: DemoMeta, data: Record<string, unknown>): string {
    const sourceBatchCode = parseText(data.source_batch_code);
    const fgItemId = parseText(data.fg_item_id);
    const packItemId = parseText(data.packaging_item_id);
    const units = parseNumber(data.units_produced);

    if (!sourceBatchCode || !fgItemId || !packItemId || units <= 0) {
        throw new Error("packing payload incomplete");
    }

    const sourceBatch = state.batches.find(batch => batch.code === sourceBatchCode);
    if (!sourceBatch) throw new Error(`source batch not found: ${sourceBatchCode}`);

    const fg = itemById(state, fgItemId);
    if (fg.type !== "FG") throw new Error("fg_item_id must be a finished goods item");
    const pack = itemById(state, packItemId);
    if (pack.type !== "PACK") throw new Error("packaging_item_id must be a packing material item");

    const requiredBulkKg = round4((units * (fg.pack_weight_gram || 0)) / 1000);
    if (sourceBatch.remaining_qty + 1e-9 < requiredBulkKg) {
        throw new Error("insufficient source batch quantity");
    }

    const packPos = state.positions[packItemId];
    if (!packPos || packPos.quantity + 1e-9 < units) {
        throw new Error("insufficient packing material stock");
    }

    const bulkPos = state.positions[sourceBatch.item_id];
    const bulkVal = requiredBulkKg * bulkPos.avg_cost;
    const packVal = units * packPos.avg_cost;
    const outputVal = round2(bulkVal + packVal);

    applyStock(state, sourceBatch.item_id, -requiredBulkKg, -bulkVal);
    applyStock(state, packItemId, -units, -packVal);
    applyStock(state, fgItemId, units, outputVal);

    sourceBatch.remaining_qty = round4(sourceBatch.remaining_qty - requiredBulkKg);

    const fgBatchCode = nextCode(meta, "BAT");
    state.batches.push({
        code: fgBatchCode,
        item_id: fgItemId,
        quantity: round2(units),
        remaining_qty: round2(units),
        unit: fg.unit,
        value: outputVal,
        source_batch_code: sourceBatchCode,
        source_type: "packed",
        created_at: nowIso(),
    });

    state.ledger.push(
        {
            ref_code: nextCode(meta, "PCK"),
            type: "PACKING_CONSUME_BULK",
            item_id: sourceBatch.item_id,
            quantity: -round2(requiredBulkKg),
            value: -round2(bulkVal),
            description: `Packing against source batch ${sourceBatchCode}`,
            occurred_at: nowIso(),
        },
        {
            ref_code: nextCode(meta, "PCK"),
            type: "PACKING_CONSUME_PACKING",
            item_id: packItemId,
            quantity: -round2(units),
            value: -round2(packVal),
            description: "Packing material consumed",
            occurred_at: nowIso(),
        },
        {
            ref_code: nextCode(meta, "PCK"),
            type: "PACKING_OUTPUT_FG",
            item_id: fgItemId,
            quantity: round2(units),
            value: outputVal,
            description: `FG batch created ${fgBatchCode}`,
            occurred_at: nowIso(),
        },
    );

    addActivity(state, `Packing run completed: ${units.toFixed(0)} units from batch ${sourceBatchCode}`);
    return "Packing run completed";
}

function findFifoBatch(state: DemoState, fgItemId: string): Batch {
    const options = state.batches
        .filter(batch => batch.item_id === fgItemId && batch.remaining_qty > 0)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (!options.length) {
        throw new Error("no available FG batches");
    }
    return options[0];
}

function createDispatch(
    state: DemoState,
    meta: DemoMeta,
    data: Record<string, unknown>,
): { message: string; warnings: string[] } {
    const fgItemId = parseText(data.fg_item_id);
    const quantity = parseNumber(data.quantity);
    let batchCode = parseText(data.batch_code);
    const override = parseBool(data.override_fifo);
    const customerId = parseText(data.customer_id);

    const fgItem = itemById(state, fgItemId);
    if (fgItem.type !== "FG") {
        throw new Error("dispatch allows finished goods only");
    }
    if (quantity <= 0) throw new Error("quantity must be greater than zero");

    const fifo = findFifoBatch(state, fgItemId);
    if (!batchCode) {
        batchCode = fifo.code;
    }

    const warnings: string[] = [];
    if (batchCode !== fifo.code) {
        if (!override) {
            throw new Error("selected batch is not FIFO suggestion; set override_fifo=true");
        }
        warnings.push(`FIFO overridden. Suggested batch was ${fifo.code}.`);
    }

    const batch = state.batches.find(b => b.code === batchCode);
    if (!batch) throw new Error("dispatch batch not found");
    if (batch.item_id !== fgItemId) throw new Error("dispatch batch does not match selected FG item");
    if (batch.remaining_qty + 1e-9 < quantity) throw new Error("insufficient FG quantity in selected batch");

    const fgPos = state.positions[fgItemId];
    const outVal = quantity * fgPos.avg_cost;
    applyStock(state, fgItemId, -quantity, -outVal);
    batch.remaining_qty = round2(batch.remaining_qty - quantity);

    const ref = nextCode(meta, "DIS");
    state.ledger.push({
        ref_code: ref,
        type: "DISPATCH",
        item_id: fgItemId,
        quantity: -round2(quantity),
        value: -round2(outVal),
        description: `Dispatched to customer ${customerId} from batch ${batchCode}`,
        occurred_at: nowIso(),
    });

    addActivity(state, `Dispatch recorded for ${quantity.toFixed(0)} units (batch ${batchCode}).`);
    return { message: "Dispatch completed", warnings };
}

function executeAction(state: DemoState, meta: DemoMeta, action: DemoAction): DemoActionResult {
    const data = action.data || {};
    const result: DemoActionResult = {
        success: false,
        messages: [],
        warnings: [],
        state,
        kpi: kpi(state, meta),
    };

    try {
        switch (action.type) {
            case "create_grn": {
                const message = createGRN(state, meta, data);
                result.success = true;
                result.messages.push(message);
                break;
            }
            case "create_third_party_bulk_grn": {
                const message = createThirdPartyBulkGRN(state, meta, data);
                result.success = true;
                result.messages.push(message);
                break;
            }
            case "run_production": {
                const message = runProduction(state, meta, data);
                result.success = true;
                result.messages.push(message);
                break;
            }
            case "run_packing": {
                const message = runPacking(state, meta, data);
                result.success = true;
                result.messages.push(message);
                break;
            }
            case "create_dispatch": {
                const out = createDispatch(state, meta, data);
                result.success = true;
                result.messages.push(out.message);
                result.warnings = out.warnings;
                break;
            }
            default:
                result.messages.push(`unsupported action type: ${action.type}`);
        }
    } catch (error) {
        result.messages.push(error instanceof Error ? error.message : "Unknown action error");
    }

    rebuildAlerts(state);
    result.kpi = kpi(state, meta);
    result.state = state;
    saveState(state);
    saveMeta(meta);
    return result;
}

function completeStep(state: DemoState, stepId: string): void {
    if (!state.completed_steps.includes(stepId)) {
        state.completed_steps.push(stepId);
    }
}

function firstBatchBySource(state: DemoState, sourceType: string): string {
    const batch = state.batches.find(b => b.source_type === sourceType && b.remaining_qty > 0);
    return batch?.code || "";
}

export async function getDemoState(): Promise<DemoState> {
    const state = loadState();
    rebuildAlerts(state);
    saveState(state);
    return state;
}

export async function runGuidedStep(stepId: string): Promise<DemoState> {
    const state = loadState();
    const meta = loadMeta();

    if (stepId === "step-1") {
        completeStep(state, stepId);
        state.current_step_id = "step-2";
        addActivity(state, "Guided step completed: Master setup reviewed.");
    } else if (stepId === "step-2") {
        executeAction(state, meta, { type: "create_grn", data: { item_id: "raw-coriander", quantity: 220, unit_rate: 160, supplier_id: "sup-local-spice", expiry_days: 240, source: "raw" } });
        executeAction(state, meta, { type: "create_grn", data: { item_id: "raw-chilli", quantity: 120, unit_rate: 210, supplier_id: "sup-local-spice", expiry_days: 210, source: "raw" } });
        executeAction(state, meta, { type: "create_grn", data: { item_id: "pack-pouch-100", quantity: 12000, unit_rate: 1.8, supplier_id: "sup-packaging", expiry_days: 365, source: "raw" } });
        completeStep(state, stepId);
        state.current_step_id = "step-3";
    } else if (stepId === "step-3") {
        executeAction(state, meta, { type: "create_third_party_bulk_grn", data: { item_id: "bulk-garam", quantity: 80, unit_rate: 290, supplier_id: "sup-ext-bulk", source: "external" } });
        completeStep(state, stepId);
        state.current_step_id = "step-4";
    } else if (stepId === "step-4") {
        executeAction(state, meta, { type: "run_production", data: { recipe_code: "RCP-GARAM-001", output_qty_kg: 150, wastage_kg: 8 } });
        completeStep(state, stepId);
        state.current_step_id = "step-5";
    } else if (stepId === "step-5") {
        let source = firstBatchBySource(state, "in-house");
        if (!source) source = firstBatchBySource(state, "external");
        executeAction(state, meta, { type: "run_packing", data: { source_batch_code: source, fg_item_id: "fg-garam-100", packaging_item_id: "pack-pouch-100", units_produced: 1200 } });
        completeStep(state, stepId);
        state.current_step_id = "step-6";
    } else if (stepId === "step-6") {
        executeAction(state, meta, { type: "create_dispatch", data: { fg_item_id: "fg-garam-100", quantity: 500, customer_id: "cust-a1", override_fifo: false } });
        completeStep(state, stepId);
        state.current_step_id = "step-7";
    } else if (stepId === "step-7") {
        completeStep(state, stepId);
        addActivity(state, "Reports reviewed: valuation, wastage and traceability are visible.");
    }

    rebuildAlerts(state);
    saveState(state);
    saveMeta(meta);
    return state;
}

export async function applyAction(action: DemoAction): Promise<DemoActionResult> {
    const state = loadState();
    const meta = loadMeta();
    return executeAction(state, meta, action);
}

export async function resetDemo(seedProfile: string): Promise<DemoState> {
    return resetLocal(seedProfile);
}

export async function setPersona(
    persona: "admin" | "operator",
): Promise<DemoState> {
    const state = loadState();
    state.persona = persona;
    addActivity(state, `Persona switched to ${persona}.`);
    saveState(state);
    return state;
}

export async function getKpiSnapshot(): Promise<DemoKpi> {
    return kpi(loadState(), loadMeta());
}

function findBatch(state: DemoState, batchCode: string): Batch | undefined {
    return state.batches.find(batch => batch.code === batchCode);
}

function buildTraceNode(state: DemoState, batchCode: string): TraceabilityNode {
    const batch = findBatch(state, batchCode);
    if (!batch) {
        throw new Error(`batch not found: ${batchCode}`);
    }

    const node: TraceabilityNode = {
        batch_code: batch.code,
        item_id: batch.item_id,
        quantity: batch.quantity,
    };

    if (batch.source_batch_code) {
        node.children = [buildTraceNode(state, batch.source_batch_code)];
    }

    return node;
}

export async function getTraceability(
    batchCode: string,
): Promise<TraceabilityGraph> {
    if (!batchCode) {
        throw new Error("batch_code is required");
    }
    const state = loadState();
    return { root: buildTraceNode(state, batchCode) };
}
