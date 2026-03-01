import { Typography } from "antd";
import logo from "../assets/images/icon.png";
import { getNavigationByRole, type UserRole } from "./rbac";

const { Text } = Typography;

type RoleShellNavigationProps = {
    role: UserRole;
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
    onLogout: () => void;
};

function resolveDisplayName(role: UserRole): string {
    const fallback = role === "admin" ? "Admin User" : "Operator User";
    const candidateKeys = ["display_name", "full_name", "username", "user_name", "name"];

    try {
        for (const key of candidateKeys) {
            const localValue = window.localStorage.getItem(key)?.trim();
            if (localValue) {
                return localValue;
            }
            const sessionValue = window.sessionStorage.getItem(key)?.trim();
            if (sessionValue) {
                return sessionValue;
            }
        }
    } catch {
        return fallback;
    }

    return fallback;
}

export function RoleShellNavigation({ role, activeRouteId, onNavigate, onLogout }: RoleShellNavigationProps) {
    const sections = getNavigationByRole(role);
    const displayName = resolveDisplayName(role);

    const routeMarks: Record<string, string> = {
        "dashboard.home": "DB",
        "masters.items": "IM",
        "masters.recipes": "RC",
        "masters.parties": "SC",
        "procurement.grn": "GR",
        "procurement.lots": "LT",
        "procurement.reconciliation": "SR",
        "production.batches": "BT",
        "production.execution": "EX",
        "packing.runs": "PR",
        "packing.materials": "PP",
        "sales.orders": "SO",
        "sales.dispatch": "DS",
        "reports.stock-ledger": "SL",
        "reports.wastage": "WG",
        "reports.audit": "AT",
        "system.users": "US",
        "system.license": "LC",
        "system.backup": "BK",
    };

    return (
        <nav className={`shell-nav shell-nav--${role}`} role="menu" aria-label={`${role} navigation`}>
            <div className="shell-nav__brand">
                <img src={logo} alt="Motaba logo" className="shell-nav__brand-logo" />
            </div>

            <Text type="secondary" className="shell-nav__role-label">
                {role === "admin" ? "Admin Shell" : "Operator Shell"}
            </Text>

            <div className="shell-nav__scroll">
                {sections.map(section => (
                    <section key={section.module} className="shell-nav__section">
                        <div className="shell-nav__section-title">{section.moduleLabel}</div>
                        <div className="shell-nav__items">
                            {section.routes.map(route => {
                                const active = activeRouteId === route.id;
                                return (
                                    <button
                                        key={route.id}
                                        type="button"
                                        role="menuitem"
                                        aria-current={active ? "page" : undefined}
                                        className={`shell-nav__item${active ? " shell-nav__item--active" : ""}`}
                                        onClick={() => onNavigate(route.id)}
                                    >
                                        <span className="shell-nav__item-mark" aria-hidden="true">
                                            {routeMarks[route.id] || "--"}
                                        </span>
                                        <span className="shell-nav__item-label">{route.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>

            <div className="shell-nav__footer">
                <div className="shell-nav__avatar">{role === "admin" ? "A" : "O"}</div>
                <div className="shell-nav__footer-text">
                    <div className="shell-nav__footer-name">{displayName}</div>
                    <div className="shell-nav__footer-role">{role === "admin" ? "Admin" : "Operator"}</div>
                </div>
                <button type="button" className="shell-nav__logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}
