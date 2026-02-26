import type { ReactNode } from "react";
import { Alert, Card, Layout, Space } from "antd";
import { AdminShell } from "./AdminShell";
import { OperatorShell } from "./OperatorShell";
import type { UserRole } from "./rbac";

const { Sider, Content } = Layout;

type AppShellProps = {
    titleBar: ReactNode;
    role: UserRole;
    activeRouteId: string;
    contentDensity: "dashboard" | "form" | "default" | "master";
    onNavigate: (routeId: string) => void;
    licenseBanner: ReactNode;
    automationNode?: ReactNode;
    unauthorizedMessage?: string | null;
    children: ReactNode;
};

export function AppShell({
    titleBar,
    role,
    activeRouteId,
    contentDensity,
    onNavigate,
    licenseBanner,
    automationNode,
    unauthorizedMessage,
    children,
}: AppShellProps) {
    return (
        <Layout className={`app-shell app-shell--${role}`} data-testid="app-shell-root">
            {titleBar}

            {licenseBanner ? <div className="app-license-banner">{licenseBanner}</div> : null}

            <Layout className="app-shell__body" data-testid="app-shell-body">
                <Sider width={260} className="app-shell__sider" theme="light">
                    {role === "admin" ? (
                        <AdminShell activeRouteId={activeRouteId} onNavigate={onNavigate} />
                    ) : (
                        <OperatorShell activeRouteId={activeRouteId} onNavigate={onNavigate} />
                    )}
                </Sider>

                <Content className={`app-content app-content--${contentDensity}`} data-testid="app-shell-scroll-region">
                    <Card className={`app-card app-card--workspace app-card--${contentDensity}`} variant="borderless">
                        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                            {automationNode}
                            {unauthorizedMessage ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    title="Unauthorized"
                                    description={unauthorizedMessage}
                                />
                            ) : null}
                            {children}
                        </Space>
                    </Card>
                    <footer className="app-content__footer">
                        Masala Inventory Management (c) 2026
                    </footer>
                </Content>
            </Layout>
        </Layout>
    );
}
