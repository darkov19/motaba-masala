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

type AppBinding = {
    CreateItemMaster?: (input: CreateItemPayload) => Promise<ItemMaster>;
    UpdateItemMaster?: (input: UpdateItemPayload) => Promise<ItemMaster>;
    ListItems?: (input: { active_only?: boolean; item_type?: string; search?: string; auth_token?: string }) => Promise<ItemMaster[]>;
    CreatePackagingProfile?: (input: CreatePackagingProfilePayload) => Promise<PackagingProfile>;
    ListPackagingProfiles?: (input: { active_only?: boolean; search?: string; pack_mode?: string; auth_token?: string }) => Promise<PackagingProfile[]>;
};

function getBinding(): AppBinding {
    return ((window as unknown as { go?: { app?: { App?: AppBinding } } }).go?.app?.App) || {};
}

function mapServiceError(error: unknown): Error {
    if (typeof error === "object" && error !== null && "message" in error) {
        const withMessage = error as { message?: string };
        return new Error(withMessage.message || "Request failed");
    }
    return new Error("Request failed");
}

function resolveAuthToken(): string | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }
    try {
        return (
            window.localStorage.getItem("auth_token")
            || window.localStorage.getItem("token")
            || window.sessionStorage.getItem("auth_token")
            || window.sessionStorage.getItem("token")
            || undefined
        );
    } catch {
        return undefined;
    }
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
