import { RoleShellNavigation } from "./RoleShellNavigation";

type AdminShellProps = {
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
    onLogout: () => void;
};

export function AdminShell({ activeRouteId, onNavigate, onLogout }: AdminShellProps) {
    return <RoleShellNavigation role="admin" activeRouteId={activeRouteId} onNavigate={onNavigate} onLogout={onLogout} />;
}
