import type { AppMode } from "../context/ConnectionContext";

export type UserRole = "admin" | "operator";
export type ModuleKey = "dashboard" | "masters" | "procurement" | "production" | "packing" | "sales" | "reports" | "system";
export type ActionKey = "view" | "create" | "edit" | "delete" | "approve" | "view_valuation" | "manage_system";
export type ViewKey = "dashboard" | "grn" | "procurement-lots" | "stock-reconciliation" | "batch" | "item-master" | "recipe-master" | "party-master" | "packaging-profile" | "system-users" | "placeholder";

export type AppRoute = {
    id: string;
    path: string;
    module: ModuleKey;
    label: string;
    minRole: UserRole;
    legacyPaths?: string[];
    viewKey: ViewKey;
};

export const ROUTE_REGISTRY: AppRoute[] = [
    { id: "dashboard.home", path: "/dashboard", module: "dashboard", label: "Dashboard", minRole: "operator", viewKey: "dashboard" },
    { id: "masters.items", path: "/masters/items", module: "masters", label: "Item Master", minRole: "operator", legacyPaths: ["/item-master"], viewKey: "item-master" },
    { id: "masters.recipes", path: "/masters/recipes", module: "masters", label: "Recipes", minRole: "operator", viewKey: "recipe-master" },
    { id: "masters.parties", path: "/masters/parties", module: "masters", label: "Suppliers & Customers", minRole: "operator", viewKey: "party-master" },
    { id: "procurement.grn", path: "/procurement/grn", module: "procurement", label: "GRN", minRole: "operator", legacyPaths: ["/grn"], viewKey: "grn" },
    { id: "procurement.lots", path: "/procurement/lots", module: "procurement", label: "Lots", minRole: "operator", viewKey: "procurement-lots" },
    { id: "procurement.reconciliation", path: "/procurement/reconciliation", module: "procurement", label: "Stock Reconciliation", minRole: "operator", viewKey: "stock-reconciliation" },
    { id: "production.batches", path: "/production/batches", module: "production", label: "Batches", minRole: "operator", legacyPaths: ["/batch"], viewKey: "batch" },
    { id: "production.execution", path: "/production/execution", module: "production", label: "Execution", minRole: "operator", viewKey: "placeholder" },
    { id: "packing.runs", path: "/packing/runs", module: "packing", label: "Packing Runs", minRole: "operator", viewKey: "placeholder" },
    { id: "packing.materials", path: "/packing/materials", module: "packing", label: "Packaging Profiles", minRole: "operator", legacyPaths: ["/packaging-profile"], viewKey: "packaging-profile" },
    { id: "sales.orders", path: "/sales/orders", module: "sales", label: "Sales Orders", minRole: "operator", viewKey: "placeholder" },
    { id: "sales.dispatch", path: "/sales/dispatch", module: "sales", label: "Dispatch", minRole: "operator", viewKey: "placeholder" },
    { id: "reports.stock-ledger", path: "/reports/stock-ledger", module: "reports", label: "Stock Ledger", minRole: "operator", viewKey: "placeholder" },
    { id: "reports.wastage", path: "/reports/wastage", module: "reports", label: "Wastage", minRole: "operator", viewKey: "placeholder" },
    { id: "reports.audit", path: "/reports/audit", module: "reports", label: "Audit Trail", minRole: "operator", viewKey: "placeholder" },
    { id: "system.users", path: "/system/users", module: "system", label: "Users", minRole: "admin", viewKey: "system-users" },
    { id: "system.license", path: "/system/license", module: "system", label: "License", minRole: "admin", viewKey: "placeholder" },
    { id: "system.backup", path: "/system/backup", module: "system", label: "Backup", minRole: "admin", viewKey: "placeholder" },
];

const roleRank: Record<UserRole, number> = {
    operator: 1,
    admin: 2,
};

const matrix: Record<UserRole, Record<ModuleKey, Partial<Record<ActionKey, boolean>>>> = {
    admin: {
        dashboard: { view: true, view_valuation: true },
        masters: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true },
        procurement: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true },
        production: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true },
        packing: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true },
        sales: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true },
        reports: { view: true, view_valuation: true },
        system: { view: true, create: true, edit: true, delete: true, approve: true, view_valuation: true, manage_system: true },
    },
    operator: {
        dashboard: { view: true },
        masters: { view: true },
        procurement: { view: true, create: true, edit: true },
        production: { view: true, create: true, edit: true },
        packing: { view: true, create: true, edit: true },
        sales: { view: true, create: true, edit: true },
        reports: { view: true },
        system: {},
    },
};

const MODULE_ORDER: ModuleKey[] = ["dashboard", "masters", "procurement", "production", "packing", "sales", "reports", "system"];

const MODULE_LABELS: Record<ModuleKey, string> = {
    dashboard: "Dashboard",
    masters: "Masters",
    procurement: "Procurement",
    production: "Production",
    packing: "Packing",
    sales: "Sales",
    reports: "Reports",
    system: "System",
};

// Frontend guards are UX-only (menu/route shaping + user feedback).
// Authorization authority remains server-side and must be enforced by backend services.
function normalizeRole(rawRole: string | null | undefined): UserRole | null {
    const normalized = (rawRole || "").trim().toLowerCase();
    if (normalized === "admin") {
        return "admin";
    }
    if (normalized === "dataentryoperator" || normalized === "operator") {
        return "operator";
    }
    return null;
}

export function resolveUserRole(appMode: AppMode, trustedSessionRole?: string | null): UserRole {
    const normalized = normalizeRole(trustedSessionRole);
    if (normalized) {
        return normalized;
    }

    return appMode === "server" ? "admin" : "operator";
}

export function canPerformAction(role: UserRole, module: ModuleKey, action: ActionKey): boolean {
    return matrix[role][module][action] === true;
}

export function canAccessRoute(role: UserRole, route: AppRoute): boolean {
    if (roleRank[role] < roleRank[route.minRole]) {
        return false;
    }

    return canPerformAction(role, route.module, "view");
}

export function resolveRouteByPath(pathname: string): AppRoute | null {
    for (const route of ROUTE_REGISTRY) {
        if (route.path === pathname) {
            return route;
        }
        if (route.legacyPaths?.includes(pathname)) {
            return route;
        }
    }
    return null;
}

export function getRouteById(routeId: string): AppRoute | null {
    return ROUTE_REGISTRY.find(route => route.id === routeId) || null;
}

export function getDefaultRouteForRole(role: UserRole): AppRoute {
    return ROUTE_REGISTRY.find(route => route.id === "dashboard.home" && canAccessRoute(role, route)) || ROUTE_REGISTRY[0];
}

export function getNavigationByRole(role: UserRole): Array<{ module: ModuleKey; moduleLabel: string; routes: AppRoute[] }> {
    return MODULE_ORDER
        .map(module => {
            const routes = ROUTE_REGISTRY.filter(route => route.module === module && canAccessRoute(role, route));
            return {
                module,
                moduleLabel: MODULE_LABELS[module],
                routes,
            };
        })
        .filter(section => section.routes.length > 0);
}
