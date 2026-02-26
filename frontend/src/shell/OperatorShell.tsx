import { RoleShellNavigation } from "./RoleShellNavigation";

type OperatorShellProps = {
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
    onLogout: () => void;
};

export function OperatorShell({ activeRouteId, onNavigate, onLogout }: OperatorShellProps) {
    return <RoleShellNavigation role="operator" activeRouteId={activeRouteId} onNavigate={onNavigate} onLogout={onLogout} />;
}
