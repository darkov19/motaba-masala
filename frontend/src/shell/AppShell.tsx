import type { ReactNode } from "react";
import { Alert, Card, Layout, Space, Tag, Typography } from "antd";
import { AdminShell } from "./AdminShell";
import { OperatorShell } from "./OperatorShell";
import type { UserRole } from "./rbac";

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

type AppShellProps = {
    titleBar: ReactNode;
    appTitle: string;
    appMode: "server" | "client";
    role: UserRole;
    activeRouteId: string;
    onNavigate: (routeId: string) => void;
    statusNode: ReactNode;
    licenseBanner: ReactNode;
    automationNode?: ReactNode;
    unauthorizedMessage?: string | null;
    children: ReactNode;
};

export function AppShell({
    titleBar,
    appTitle,
    appMode,
    role,
    activeRouteId,
    onNavigate,
    statusNode,
    licenseBanner,
    automationNode,
    unauthorizedMessage,
    children,
}: AppShellProps) {
    return (
        <Layout className="app-shell" style={{ minHeight: "100vh" }}>
            {titleBar}
            <Header className="app-header">
                <Space align="center" size={16}>
                    <Title level={4} className="app-header__title">
                        {appTitle}
                    </Title>
                    {appMode === "server" ? (
                        <Tag color="red">Server Mode</Tag>
                    ) : (
                        <Tag color="blue">Client Mode</Tag>
                    )}
                    {role === "admin" ? <Tag color="gold">Admin</Tag> : <Tag color="green">Operator</Tag>}
                </Space>
                <Space align="center" size={8}>
                    {statusNode}
                </Space>
            </Header>

            {licenseBanner}

            <Layout className="app-shell__body">
                <Sider width={260} className="app-shell__sider" theme="light">
                    {role === "admin" ? (
                        <AdminShell activeRouteId={activeRouteId} onNavigate={onNavigate} />
                    ) : (
                        <OperatorShell activeRouteId={activeRouteId} onNavigate={onNavigate} />
                    )}
                </Sider>

                <Content className="app-content">
                    <Card className="app-card" variant="borderless">
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
                </Content>
            </Layout>

            <Footer style={{ textAlign: "center" }}>
                Masala Inventory Management (c) 2026
            </Footer>
        </Layout>
    );
}
