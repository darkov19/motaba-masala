import { useEffect, useMemo, useState } from "react";
import { Layout, Typography, Card, Segmented, Space, Alert, Button, message } from "antd";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/images/icon.png";
import { ConnectionProvider } from "./context/ConnectionContext";
import { ConnectionStatus } from "./components/layout/ConnectionStatus";
import { ReconnectionOverlay } from "./components/layout/ReconnectionOverlay";
import { GRNForm } from "./components/forms/GRNForm";
import { BatchForm } from "./components/forms/BatchForm";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

type RecoveryState = {
    enabled: boolean;
    message: string;
    backups: string[];
};

type WindowWithAppBindings = Window & {
    go?: {
        app?: {
            App?: {
                GetRecoveryState?: () => Promise<RecoveryState>;
                RestoreBackup?: (backupPath: string) => Promise<void>;
            };
        };
    };
};

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
                <Card className="app-card" variant="borderless">
                    <Space orientation="vertical" size={20} style={{ width: "100%" }}>
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
    const [recoveryState, setRecoveryState] = useState<RecoveryState | null>(null);
    const [isLoadingRecovery, setIsLoadingRecovery] = useState(true);
    const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const loadRecoveryState = async () => {
            const binding = (window as WindowWithAppBindings).go?.app?.App?.GetRecoveryState;
            if (typeof binding !== "function") {
                if (mounted) {
                    setRecoveryState(null);
                    setIsLoadingRecovery(false);
                }
                return;
            }

            try {
                const state = await binding();
                if (mounted) {
                    setRecoveryState(state);
                }
            } catch {
                if (mounted) {
                    setRecoveryState(null);
                }
            } finally {
                if (mounted) {
                    setIsLoadingRecovery(false);
                }
            }
        };

        void loadRecoveryState();
        return () => {
            mounted = false;
        };
    }, []);

    const onRestoreBackup = async (backupPath: string) => {
        const restoreBinding = (window as WindowWithAppBindings).go?.app?.App?.RestoreBackup;
        if (typeof restoreBinding !== "function") {
            message.error("Restore binding is unavailable in this environment.");
            return;
        }

        setRestoringBackup(backupPath);
        try {
            await restoreBinding(backupPath);
            message.success("Backup restore started. Server will restart.");
        } catch (error) {
            const details = error instanceof Error ? error.message : "Unknown restore error";
            message.error(`Restore failed: ${details}`);
        } finally {
            setRestoringBackup(null);
        }
    };

    if (!isLoadingRecovery && recoveryState?.enabled) {
        return (
            <Layout style={{ minHeight: "100vh" }}>
                <Header className="app-header">
                    <Space align="center" size={16}>
                        <img src={logo} className="app-header__logo" alt="logo" />
                        <Title level={4} className="app-header__title">
                            Masala Inventory Management
                        </Title>
                    </Space>
                </Header>
                <Content className="app-content">
                    <Card className="app-card" variant="borderless">
                        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                            <Title level={3} style={{ marginBottom: 0 }}>
                                Database Recovery Mode
                            </Title>
                            <Alert
                                type="warning"
                                showIcon
                                title={recoveryState.message || "Database recovery is required before normal startup."}
                            />
                            <Text type="secondary">
                                Select a backup archive to restore. The server will restart automatically after restore.
                            </Text>
                            {recoveryState.backups.length === 0 ? (
                                <Text type="secondary">No backups found in backups/ directory.</Text>
                            ) : (
                                <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                                    {recoveryState.backups.map(backupPath => (
                                        <Card key={backupPath} size="small">
                                            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                                                <Text code>{backupPath}</Text>
                                                <Button
                                                    type="primary"
                                                    loading={restoringBackup === backupPath}
                                                    onClick={() => void onRestoreBackup(backupPath)}
                                                >
                                                    Restore
                                                </Button>
                                            </Space>
                                        </Card>
                                    ))}
                                </Space>
                            )}
                        </Space>
                    </Card>
                </Content>
            </Layout>
        );
    }

    return (
        <ConnectionProvider>
            <ResilienceWorkspace />
        </ConnectionProvider>
    );
}

export default App;
