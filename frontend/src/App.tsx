import { useEffect, useMemo, useState } from "react";
import { Layout, Typography, Card, Segmented, Space } from "antd";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/images/logo-universal.png";
import { ConnectionProvider } from "./context/ConnectionContext";
import { ConnectionStatus } from "./components/layout/ConnectionStatus";
import { ReconnectionOverlay } from "./components/layout/ReconnectionOverlay";
import { GRNForm } from "./components/forms/GRNForm";
import { BatchForm } from "./components/forms/BatchForm";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

type ViewKey = "grn" | "batch";
const PATH_TO_VIEW: Record<string, ViewKey> = {
    "/grn": "grn",
    "/batch": "batch",
};
const VIEW_TO_PATH: Record<ViewKey, string> = {
    grn: "/grn",
    batch: "/batch",
};

function ResilienceWorkspace() {
    const navigate = useNavigate();
    const location = useLocation();
    const [dirtyByView, setDirtyByView] = useState<Record<ViewKey, boolean>>({
        grn: false,
        batch: false,
    });
    const activeView = PATH_TO_VIEW[location.pathname] ?? "grn";

    useEffect(() => {
        if (!PATH_TO_VIEW[location.pathname]) {
            navigate("/grn", { replace: true });
        }
    }, [location.pathname, navigate]);

    const hasUnsaved = useMemo(
        () => dirtyByView.grn || dirtyByView.batch,
        [dirtyByView.batch, dirtyByView.grn],
    );
    const activeViewDirty = dirtyByView[activeView];
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            activeViewDirty && currentLocation.pathname !== nextLocation.pathname,
    );

    useUnsavedChanges({
        isDirty: hasUnsaved,
        message: "You have unsaved changes. Leave anyway?",
        blocker,
    });

    const setDirtyFor = (view: ViewKey, isDirty: boolean) => {
        setDirtyByView(prev => ({
            ...prev,
            [view]: isDirty,
        }));
    };

    const onViewChange = (value: string | number) => {
        const nextView = String(value) as ViewKey;
        if (nextView === activeView) {
            return;
        }

        navigate(VIEW_TO_PATH[nextView]);
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header className="app-header">
                <Space align="center" size={16}>
                    <img src={logo} className="app-header__logo" alt="logo" />
                    <Title level={4} className="app-header__title">
                        Masala Inventory Management
                    </Title>
                </Space>
                <ConnectionStatus />
            </Header>

            <Content className="app-content">
                <Card className="app-card" bordered={false}>
                    <Space direction="vertical" size={20} style={{ width: "100%" }}>
                        <Title level={2} style={{ marginBottom: 0 }}>
                            Client Resilience & Recovery
                        </Title>
                        <Text type="secondary">
                            Auto-save drafts every 5 seconds, recover on restart, and
                            guard against data loss.
                        </Text>

                        <Segmented
                            block
                            options={[
                                { label: "GRN Form", value: "grn" },
                                { label: "Batch Form", value: "batch" },
                            ]}
                            value={activeView}
                            onChange={onViewChange}
                        />

                        <div style={{ display: activeView === "grn" ? "block" : "none" }}>
                            <GRNForm
                                userKey="operator"
                                onDirtyChange={isDirty => setDirtyFor("grn", isDirty)}
                            />
                        </div>
                        <div style={{ display: activeView === "batch" ? "block" : "none" }}>
                            <BatchForm
                                userKey="operator"
                                onDirtyChange={isDirty => setDirtyFor("batch", isDirty)}
                            />
                        </div>
                    </Space>
                </Card>
            </Content>

            <Footer style={{ textAlign: "center" }}>
                Masala Inventory Management ©2026
            </Footer>
            <ReconnectionOverlay />
        </Layout>
    );
}

function App() {
    return (
        <ConnectionProvider>
            <ResilienceWorkspace />
        </ConnectionProvider>
    );
}

export default App;
