import {
    extractErrorMessage,
    isSessionAuthError,
    notifyAuthSessionExpired,
    resolveAuthToken,
} from "./authApi";

export type ServiceFieldError = {
    field: string;
    message: string;
};

export type ServiceErrorShape = {
    code: string;
    message: string;
    fields?: ServiceFieldError[];
};

export type ItemMaster = {
    id: number;
    sku: string;
    name: string;
    item_type: "RAW" | "BULK_POWDER" | "PACKING_MATERIAL" | "FINISHED_GOOD";
    base_unit: string;
    item_subtype: string;
    minimum_stock: number;
    is_active: boolean;
    updated_at: string;
};

export type CreateItemPayload = {
    sku?: string;
    name: string;
    item_type: ItemMaster["item_type"];
    base_unit: string;
    item_subtype?: string;
    minimum_stock?: number;
    is_active?: boolean;
    auth_token?: string;
};

export type UpdateItemPayload = {
    id: number;
    sku?: string;
    name: string;
    item_type: ItemMaster["item_type"];
    base_unit: string;
    item_subtype?: string;
    minimum_stock?: number;
    is_active?: boolean;
    updated_at: string;
    auth_token?: string;
};

export type PackagingProfileComponent = {
    packing_material_item_id: number;
    qty_per_unit: number;
};

export type PackagingProfile = {
    id: number;
    name: string;
    pack_mode: string;
    is_active: boolean;
    updated_at: string;
    components: PackagingProfileComponent[];
};

export type CreatePackagingProfilePayload = {
    name: string;
    pack_mode: string;
    is_active?: boolean;
    components: PackagingProfileComponent[];
    auth_token?: string;
};

export type RecipeComponent = {
    input_item_id: number;
    input_qty_base: number;
    line_no: number;
};

export type Recipe = {
    id: number;
    recipe_code: string;
    output_item_id: number;
    output_qty_base: number;
    expected_wastage_pct: number;
    is_active: boolean;
    updated_at: string;
    components: RecipeComponent[];
};

export type PartyType = "SUPPLIER" | "CUSTOMER";

export type Party = {
    id: number;
    party_type: PartyType;
    name: string;
    phone: string;
    email: string;
    address: string;
    lead_time_days?: number;
    is_active: boolean;
    updated_at: string;
};

export type CreatePartyPayload = {
    party_type: PartyType;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    lead_time_days?: number;
    is_active?: boolean;
    auth_token?: string;
};

export type UpdatePartyPayload = {
    id: number;
    party_type: PartyType;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    lead_time_days?: number;
    is_active?: boolean;
    updated_at: string;
    auth_token?: string;
};

export type GRNLine = {
    line_no: number;
    item_id: number;
    quantity_received: number;
    lot_number: string;
};

export type GRN = {
    id: number;
    grn_number: string;
    supplier_id: number;
    invoice_no: string;
    notes: string;
    updated_at: string;
    lines: GRNLine[];
};

export type CreateGRNPayload = {
    grn_number: string;
    supplier_id: number;
    invoice_no?: string;
    notes?: string;
    lines: Array<{
        item_id: number;
        quantity_received: number;
        unit_price?: number;
    }>;
    auth_token?: string;
};

export type MaterialLot = {
    id: number;
    lot_number: string;
    grn_id: number;
    grn_line_id: number;
    grn_number: string;
    item_id: number;
    supplier_id: number;
    supplier_name: string; // display-only, resolved via JOIN on parties
    quantity_received: number;
    source_type: string;
    unit_cost: number;
    created_at: string;
};

export type LotStockMovement = {
    id: number;
    item_id: number;
    transaction_type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    reference_id: string;
    lot_number: string;
    notes: string;
    created_at: string;
};

export type CreateRecipePayload = {
    recipe_code: string;
    output_item_id: number;
    output_qty_base: number;
    expected_wastage_pct?: number;
    is_active?: boolean;
    components: RecipeComponent[];
    auth_token?: string;
};

export type UpdateRecipePayload = {
    id: number;
    recipe_code: string;
    output_item_id: number;
    output_qty_base: number;
    expected_wastage_pct?: number;
    is_active?: boolean;
    components: RecipeComponent[];
    updated_at: string;
    auth_token?: string;
};

export type ConversionRule = {
    id: number;
    item_id?: number;
    from_unit: string;
    to_unit: string;
    factor: number;
    precision_scale: number;
    rounding_mode: "HALF_UP" | "DOWN" | "UP";
    is_active: boolean;
    updated_at: string;
};

export type CreateConversionRulePayload = {
    item_id?: number;
    from_unit: string;
    to_unit: string;
    factor: number;
    precision_scale: number;
    rounding_mode: ConversionRule["rounding_mode"];
    is_active?: boolean;
    auth_token?: string;
};

export type ConvertQuantityPayload = {
    item_id?: number;
    quantity: number;
    source_unit: string;
    target_unit: string;
    auth_token?: string;
};

export type ConvertQuantityResult = {
    qty_converted: number;
    precision_meta: {
        scale: number;
        rounding_mode: ConversionRule["rounding_mode"];
    };
    source_unit: string;
    target_unit: string;
    factor: number;
};

export const REASON_CODES = ["Spoilage", "Audit Correction", "Damage", "Counting Error", "Other"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type StockAdjustment = {
    id: number;
    item_id: number;
    lot_id: number | null;
    qty_delta: number;
    reason_code: string;
    notes: string;
    created_by: string;
    created_at: string;
};

export type CreateStockAdjustmentPayload = {
    item_id: number;
    lot_id?: number | null;
    qty_delta: number;
    reason_code: string;
    notes?: string;
    auth_token?: string;
};

type AppBinding = {
    CreateItemMaster?: (input: CreateItemPayload) => Promise<ItemMaster>;
    UpdateItemMaster?: (input: UpdateItemPayload) => Promise<ItemMaster>;
    ListItems?: (input: { active_only?: boolean; item_type?: string; search?: string; auth_token?: string }) => Promise<ItemMaster[]>;
    CreatePackagingProfile?: (input: CreatePackagingProfilePayload) => Promise<PackagingProfile>;
    ListPackagingProfiles?: (input: { active_only?: boolean; search?: string; pack_mode?: string; auth_token?: string }) => Promise<PackagingProfile[]>;
    CreateRecipe?: (input: CreateRecipePayload) => Promise<Recipe>;
    UpdateRecipe?: (input: UpdateRecipePayload) => Promise<Recipe>;
    ListRecipes?: (input: { active_only?: boolean; output_item_id?: number; search?: string; auth_token?: string }) => Promise<Recipe[]>;
    CreateParty?: (input: CreatePartyPayload) => Promise<Party>;
    UpdateParty?: (input: UpdatePartyPayload) => Promise<Party>;
    ListParties?: (input: { active_only?: boolean; party_type?: PartyType; search?: string; auth_token?: string }) => Promise<Party[]>;
    ListMaterialLots?: (input: {
        active_only?: boolean;
        item_id?: number;
        supplier?: string;
        lot_number?: string;
        grn_number?: string;
        search?: string;
        auth_token?: string;
    }) => Promise<MaterialLot[]>;
    RecordLotStockMovement?: (input: {
        lot_number: string;
        transaction_type: "OUT" | "ADJUSTMENT";
        quantity: number;
        reference_id?: string;
        notes?: string;
        auth_token?: string;
    }) => Promise<LotStockMovement>;
    ListLotStockMovements?: (input: {
        lot_number: string;
        auth_token?: string;
    }) => Promise<LotStockMovement[]>;
    CreateGRN?: (input: CreateGRNPayload) => Promise<GRN>;
    CreateUnitConversionRule?: (input: CreateConversionRulePayload) => Promise<ConversionRule>;
    ListUnitConversionRules?: (input: { active_only?: boolean; item_id?: number; from_unit?: string; to_unit?: string; auth_token?: string }) => Promise<ConversionRule[]>;
    ConvertQuantity?: (input: ConvertQuantityPayload) => Promise<ConvertQuantityResult>;
    CreateStockAdjustment?: (input: CreateStockAdjustmentPayload) => Promise<StockAdjustment>;
    ListStockAdjustments?: (input: { item_id: number; auth_token?: string }) => Promise<StockAdjustment[]>;
    GetItemStockBalance?: (input: { item_id: number; auth_token?: string }) => Promise<number>;
};

function getBinding(): AppBinding {
    return ((window as unknown as { go?: { app?: { App?: AppBinding } } }).go?.app?.App) || {};
}

function mapServiceError(error: unknown): Error {
    const message = extractErrorMessage(error);
    if (isSessionAuthError(error)) {
        notifyAuthSessionExpired("Session expired or unauthorized. Please sign in again.");
    }
    return new Error(message);
}

export async function listItems(activeOnly = true, itemType?: ItemMaster["item_type"], search?: string): Promise<ItemMaster[]> {
    const fn = getBinding().ListItems;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: activeOnly,
            item_type: itemType,
            search: search?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createItem(payload: CreateItemPayload): Promise<ItemMaster> {
    const fn = getBinding().CreateItemMaster;
    if (typeof fn !== "function") {
        throw new Error("CreateItemMaster binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            is_active: true,
            minimum_stock: 0,
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function updateItem(payload: UpdateItemPayload): Promise<ItemMaster> {
    const fn = getBinding().UpdateItemMaster;
    if (typeof fn !== "function") {
        throw new Error("UpdateItemMaster binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listPackagingProfiles(activeOnly = true): Promise<PackagingProfile[]> {
    const fn = getBinding().ListPackagingProfiles;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: activeOnly,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createPackagingProfile(payload: CreatePackagingProfilePayload): Promise<PackagingProfile> {
    const fn = getBinding().CreatePackagingProfile;
    if (typeof fn !== "function") {
        throw new Error("CreatePackagingProfile binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            is_active: true,
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listRecipes(params?: {
    activeOnly?: boolean;
    outputItemId?: number;
    search?: string;
}): Promise<Recipe[]> {
    const fn = getBinding().ListRecipes;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: params?.activeOnly ?? true,
            output_item_id: params?.outputItemId,
            search: params?.search?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createRecipe(payload: CreateRecipePayload): Promise<Recipe> {
    const fn = getBinding().CreateRecipe;
    if (typeof fn !== "function") {
        throw new Error("CreateRecipe binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            is_active: true,
            expected_wastage_pct: 0,
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function updateRecipe(payload: UpdateRecipePayload): Promise<Recipe> {
    const fn = getBinding().UpdateRecipe;
    if (typeof fn !== "function") {
        throw new Error("UpdateRecipe binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listParties(params?: {
    activeOnly?: boolean;
    partyType?: PartyType;
    search?: string;
}): Promise<Party[]> {
    const fn = getBinding().ListParties;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: params?.activeOnly ?? true,
            party_type: params?.partyType,
            search: params?.search?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createParty(payload: CreatePartyPayload): Promise<Party> {
    const fn = getBinding().CreateParty;
    if (typeof fn !== "function") {
        throw new Error("CreateParty binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            is_active: true,
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function updateParty(payload: UpdatePartyPayload): Promise<Party> {
    const fn = getBinding().UpdateParty;
    if (typeof fn !== "function") {
        throw new Error("UpdateParty binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createGRN(payload: CreateGRNPayload): Promise<GRN> {
    const fn = getBinding().CreateGRN;
    if (typeof fn !== "function") {
        throw new Error("CreateGRN binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listMaterialLots(params?: {
    activeOnly?: boolean;
    itemId?: number;
    supplier?: string;
    lotNumber?: string;
    grnNumber?: string;
    search?: string;
}): Promise<MaterialLot[]> {
    const fn = getBinding().ListMaterialLots;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: params?.activeOnly ?? true,
            item_id: params?.itemId,
            supplier: params?.supplier?.trim() || undefined,
            lot_number: params?.lotNumber?.trim() || undefined,
            grn_number: params?.grnNumber?.trim() || undefined,
            search: params?.search?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function recordLotStockMovement(payload: {
    lotNumber: string;
    transactionType: "OUT" | "ADJUSTMENT";
    quantity: number;
    referenceId?: string;
    notes?: string;
}): Promise<LotStockMovement> {
    const fn = getBinding().RecordLotStockMovement;
    if (typeof fn !== "function") {
        throw new Error("RecordLotStockMovement binding is unavailable");
    }
    try {
        return await fn({
            lot_number: payload.lotNumber,
            transaction_type: payload.transactionType,
            quantity: payload.quantity,
            reference_id: payload.referenceId?.trim() || undefined,
            notes: payload.notes?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listLotStockMovements(lotNumber: string): Promise<LotStockMovement[]> {
    const fn = getBinding().ListLotStockMovements;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            lot_number: lotNumber.trim(),
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createConversionRule(payload: CreateConversionRulePayload): Promise<ConversionRule> {
    const fn = getBinding().CreateUnitConversionRule;
    if (typeof fn !== "function") {
        throw new Error("CreateUnitConversionRule binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            is_active: true,
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listConversionRules(params?: {
    activeOnly?: boolean;
    itemId?: number;
    fromUnit?: string;
    toUnit?: string;
}): Promise<ConversionRule[]> {
    const fn = getBinding().ListUnitConversionRules;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            active_only: params?.activeOnly ?? true,
            item_id: params?.itemId,
            from_unit: params?.fromUnit?.trim() || undefined,
            to_unit: params?.toUnit?.trim() || undefined,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function convertQuantity(payload: ConvertQuantityPayload): Promise<ConvertQuantityResult> {
    const fn = getBinding().ConvertQuantity;
    if (typeof fn !== "function") {
        throw new Error("ConvertQuantity binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function createStockAdjustment(payload: CreateStockAdjustmentPayload): Promise<StockAdjustment> {
    const fn = getBinding().CreateStockAdjustment;
    if (typeof fn !== "function") {
        throw new Error("CreateStockAdjustment binding is unavailable");
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
            ...payload,
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function listStockAdjustments(itemId: number): Promise<StockAdjustment[]> {
    const fn = getBinding().ListStockAdjustments;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            item_id: itemId,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}

export async function getItemStockBalance(itemId: number): Promise<number> {
    const fn = getBinding().GetItemStockBalance;
    if (typeof fn !== "function") {
        return 0;
    }
    try {
        return await fn({
            item_id: itemId,
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        throw mapServiceError(error);
    }
}
