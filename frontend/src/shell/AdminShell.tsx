import { RoleShellNavigation } from "./RoleShellNavigation";

type AdminShellProps = {
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
};

export function AdminShell({ activeRouteId, onNavigate }: AdminShellProps) {
    return <RoleShellNavigation role="admin" activeRouteId={activeRouteId} onNavigate={onNavigate} />;
}
