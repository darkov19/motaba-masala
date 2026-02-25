import { RoleShellNavigation } from "./RoleShellNavigation";

type OperatorShellProps = {
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
};

export function OperatorShell({ activeRouteId, onNavigate }: OperatorShellProps) {
    return <RoleShellNavigation role="operator" activeRouteId={activeRouteId} onNavigate={onNavigate} />;
}
