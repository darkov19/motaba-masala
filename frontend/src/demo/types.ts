export type Persona = "admin" | "operator";

export type ItemType = "RAW" | "BULK" | "PACK" | "FG" | "UNKNOWN";

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    unit: string;
    pack_weight_gram?: number;
    min_stock: number;
}

export interface Supplier {
    id: string;
    name: string;
}

export interface Customer {
    id: string;
    name: string;
}

export interface RecipeIngredient {
    item_id: string;
    ratio_per_kg_out: number;
}

export interface Recipe {
    code: string;
    name: string;
    output_bulk_id: string;
    loss_percent: number;
    ingredients: RecipeIngredient[];
}

export interface Lot {
    code: string;
    item_id: string;
    quantity: number;
    expiry_date: string;
    source_ref: string;
}

export interface Batch {
    code: string;
    item_id: string;
    quantity: number;
    remaining_qty: number;
    unit: string;
    value: number;
    source_batch_code?: string;
    source_type?: string;
    created_at: string;
}

export interface InventoryPosition {
    item_id: string;
    quantity: number;
    value: number;
    unit: string;
    avg_cost: number;
    updated_at: string;
}

export interface LedgerEntry {
    ref_code: string;
    type: string;
    item_id: string;
    quantity: number;
    value: number;
    description: string;
    occurred_at: string;
}

export interface GuidedStep {
    id: string;
    title: string;
    description: string;
    expected_outcome: string;
}

export interface Alert {
    level: string;
    message: string;
}

export interface DemoKpi {
    raw_quantity_kg: number;
    raw_value: number;
    bulk_quantity_kg: number;
    bulk_value: number;
    fg_quantity_pcs: number;
    fg_value: number;
    wastage_percent: number;
    low_stock_count: number;
    currency: string;
}

export interface TraceabilityNode {
    batch_code: string;
    item_id: string;
    quantity: number;
    children?: TraceabilityNode[];
}

export interface TraceabilityGraph {
    root: TraceabilityNode;
}

export interface DemoState {
    persona: Persona;
    seed_profile: string;
    currency: string;
    items: Item[];
    suppliers: Supplier[];
    customers: Customer[];
    recipes: Recipe[];
    lots: Lot[];
    batches: Batch[];
    ledger: LedgerEntry[];
    positions: Record<string, InventoryPosition>;
    alerts: Alert[];
    guided_steps: GuidedStep[];
    current_step_id: string;
    completed_steps: string[];
    activity_timeline: string[];
}

export interface DemoAction {
    type: string;
    data?: Record<string, unknown>;
}

export interface DemoActionResult {
    success: boolean;
    messages: string[];
    warnings: string[];
    state: DemoState;
    kpi: DemoKpi;
    traceability?: TraceabilityGraph;
}
