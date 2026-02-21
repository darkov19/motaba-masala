import { useEffect, useMemo, useState } from "react";
import { Layout, Typography, Card, Segmented, Space, Alert, Button, message } from "antd";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";
import { EventsEmit, EventsOn, LogInfo, WindowFullscreen, WindowShow, WindowUnminimise } from "../wailsjs/runtime/runtime";
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

type LicenseStatus = {
    status: "active" | "expiring" | "grace-period" | "expired";
    days_remaining: number;
    expires_at?: string;
    message?: string;
    hardware_id?: string;
};

type LicenseLockoutState = {
    enabled: boolean;
    reason?: "hardware-mismatch" | "license-expired";
    message: string;
    hardware_id?: string;
};

type WindowWithAppBindings = Window & {
    go?: {
        app?: {
            App?: {
                GetRecoveryState?: () => Promise<RecoveryState>;
                RestoreBackup?: (backupPath: string) => Promise<void>;
                GetLicenseStatus?: () => Promise<LicenseStatus>;
                GetLicenseLockoutState?: () => Promise<LicenseLockoutState>;
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

function WindowControls() {
    const trace = (msg: string) => {
        console.info(msg);
        try {
            LogInfo(msg);
        } catch {
            // no-op outside Wails runtime
        }
    };

    const onMinimize = () => {
        trace("[UI][WindowControls] Minimize clicked -> emit app:request-minimize");
        try {
            EventsEmit("app:request-minimize");
        } catch {
            // no-op outside Wails runtime
        }
    };

    const onHideToTray = () => {
        trace("[UI][WindowControls] Close clicked -> emit app:request-hide-to-tray");
        try {
            EventsEmit("app:request-hide-to-tray");
        } catch {
            // no-op outside Wails runtime
        }
    };

    return (
        <div className="window-controls">
            <Button className="window-controls__btn" onClick={onMinimize} type="text" aria-label="Minimize">
                _
            </Button>
            <Button className="window-controls__btn window-controls__btn--close" onClick={onHideToTray} type="text" aria-label="Hide to tray">
                ×
            </Button>
        </div>
    );
}

type ResilienceWorkspaceProps = {
    licenseStatus: LicenseStatus;
};

function ResilienceWorkspace({ licenseStatus }: ResilienceWorkspaceProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [dirtyByView, setDirtyByView] = useState<Record<ViewKey, boolean>>({
        grn: false,
        batch: false,
    });
    const activeView = PATH_TO_VIEW[location.pathname] ?? "grn";
    const writeDisabled = licenseStatus.status === "grace-period" || licenseStatus.status === "expired";

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

    const renderLicenseBanner = () => {
        if (licenseStatus.status === "expiring") {
            return (
                <Alert
                    banner
                    showIcon
                    type="warning"
                    title={licenseStatus.message || `License expires in ${licenseStatus.days_remaining} days. Contact support to renew.`}
                />
            );
        }

        if (licenseStatus.status === "grace-period") {
            const daysLeft = Math.max(0, 7 + licenseStatus.days_remaining);
            return (
                <Alert
                    banner
                    showIcon
                    type="error"
                    title={licenseStatus.message || `License Expired. Read-only mode active for ${daysLeft} more days.`}
                />
            );
        }

        if (licenseStatus.status === "expired") {
            return (
                <Alert
                    banner
                    showIcon
                    type="error"
                    title={licenseStatus.message || "License expired. Application is locked. Contact support to renew."}
                />
            );
        }

        return null;
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
                <Space align="center" size={8}>
                    <ConnectionStatus />
                    <WindowControls />
                </Space>
            </Header>

            {renderLicenseBanner()}

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

                        <Space>
                            <Button
                                onClick={() => navigate("/grn")}
                                disabled={writeDisabled}
                            >
                                New GRN
                            </Button>
                            <Button
                                onClick={() => navigate("/batch")}
                                disabled={writeDisabled}
                            >
                                New Batch
                            </Button>
                        </Space>

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
                                writeDisabled={writeDisabled}
                                onDirtyChange={isDirty => setDirtyFor("grn", isDirty)}
                            />
                        </div>
                        <div style={{ display: activeView === "batch" ? "block" : "none" }}>
                            <BatchForm
                                userKey="operator"
                                writeDisabled={writeDisabled}
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

const defaultLicenseStatus: LicenseStatus = {
    status: "active",
    days_remaining: 0,
};

const degradedLicenseStatus: LicenseStatus = {
    status: "grace-period",
    days_remaining: 0,
    message: "Unable to verify license status. Read-only mode is active until verification succeeds.",
};

function App() {
    const [recoveryState, setRecoveryState] = useState<RecoveryState | null>(null);
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>(defaultLicenseStatus);
    const [lockoutState, setLockoutState] = useState<LicenseLockoutState | null>(null);
    const [isLoadingRecovery, setIsLoadingRecovery] = useState(true);
    const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadRecoveryState = async () => {
            const binding = (window as WindowWithAppBindings).go?.app?.App?.GetRecoveryState;
            if (typeof binding !== "function") {
                if (mounted) {
                    setRecoveryState(null);
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
            }
        };

        const loadLockoutState = async () => {
            const binding = (window as WindowWithAppBindings).go?.app?.App?.GetLicenseLockoutState;
            if (typeof binding !== "function") {
                if (mounted) {
                    setLockoutState(null);
                }
                return;
            }

            try {
                const state = await binding();
                if (mounted) {
                    setLockoutState(state);
                }
            } catch {
                if (mounted) {
                    setLockoutState(null);
                }
            }
        };

        const loadLicenseStatus = async () => {
            const binding = (window as WindowWithAppBindings).go?.app?.App?.GetLicenseStatus;
            if (typeof binding !== "function") {
                if (mounted) {
                    setLicenseStatus(defaultLicenseStatus);
                }
                return;
            }

            try {
                const state = await binding();
                if (mounted) {
                    setLicenseStatus(state);
                }
            } catch {
                if (mounted) {
                    setLicenseStatus(degradedLicenseStatus);
                }
            }
        };

        const initialize = async () => {
            await Promise.all([loadRecoveryState(), loadLockoutState(), loadLicenseStatus()]);
            if (mounted) {
                setIsLoadingRecovery(false);
            }
        };

        void initialize();
        const poller = window.setInterval(() => {
            void Promise.all([loadLicenseStatus(), loadLockoutState()]);
        }, 30000);

        return () => {
            mounted = false;
            window.clearInterval(poller);
        };
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = EventsOn("app:request-open-dashboard", () => {
                console.info("[UI][TrayFlow] app:request-open-dashboard event received");
                try {
                    WindowShow();
                    WindowUnminimise();
                    WindowFullscreen();
                } catch {
                    // no-op outside Wails runtime
                }
            });
        } catch {
            // no-op outside Wails runtime
        }

        return () => {
            unsubscribe?.();
        };
    }, []);

    const effectiveLockoutState = useMemo<LicenseLockoutState | null>(() => {
        if (lockoutState?.enabled) {
            return lockoutState;
        }
        if (licenseStatus.status === "expired") {
            return {
                enabled: true,
                reason: "license-expired",
                message: licenseStatus.message || "License expired. Application is locked.",
                hardware_id: licenseStatus.hardware_id || lockoutState?.hardware_id || "",
            };
        }
        return null;
    }, [licenseStatus.hardware_id, licenseStatus.message, licenseStatus.status, lockoutState]);

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

    const copyToClipboard = async (text: string): Promise<boolean> => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            const input = document.createElement("textarea");
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            return true;
        } catch {
            return false;
        }
    };

    const onCopySupportMessage = async () => {
        const hardwareID = effectiveLockoutState?.hardware_id || "Unavailable";
        const issue = effectiveLockoutState?.reason === "license-expired"
            ? "License expired (grace period ended)"
            : "Hardware ID mismatch";
        const supportMessage = [
            "License Renewal Request",
            `Issue: ${issue}`,
            `Hardware ID: ${hardwareID}`,
            `Date: ${new Date().toISOString()}`,
        ].join("\n");

        const copied = await copyToClipboard(supportMessage);
        if (copied) {
            message.success("Support message copied");
            return;
        }
        message.error("Unable to copy support message.");
    };

    if (!isLoadingRecovery && effectiveLockoutState?.enabled) {
        const heading = effectiveLockoutState.reason === "license-expired"
            ? "License Expired. Application is locked."
            : "Hardware ID Mismatch. Application is locked.";
        const guidance = effectiveLockoutState.reason === "license-expired"
            ? "Your grace period has ended. Contact support with this Hardware ID to renew your license."
            : "Contact support with this Hardware ID to request a new license.";

        return (
            <Layout style={{ minHeight: "100vh" }}>
                <Header className="app-header">
                    <Space align="center" size={16}>
                        <img src={logo} className="app-header__logo" alt="logo" />
                        <Title level={4} className="app-header__title">
                            Masala Inventory Management
                        </Title>
                    </Space>
                    <WindowControls />
                </Header>
                <Content className="app-content">
                    <Card className="app-card" variant="borderless">
                        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                            <Title level={3} style={{ marginBottom: 0 }}>
                                {heading}
                            </Title>
                            <Alert
                                type="error"
                                showIcon
                                title={effectiveLockoutState.message || heading}
                            />
                            <Text type="secondary">
                                {guidance}
                            </Text>
                            <Card size="small">
                                <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
                                    <Text code>{effectiveLockoutState.hardware_id || "Unavailable"}</Text>
                                    <Button type="primary" onClick={() => void onCopySupportMessage()}>
                                        Copy Support Request
                                    </Button>
                                </Space>
                            </Card>
                        </Space>
                    </Card>
                </Content>
            </Layout>
        );
    }

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
                    <WindowControls />
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
            <ResilienceWorkspace licenseStatus={licenseStatus} />
        </ConnectionProvider>
    );
}

export default App;
