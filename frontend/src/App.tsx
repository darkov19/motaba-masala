import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout, Typography, Card, Space, Alert, Button, Form, Input, Spin, message } from "antd";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";
import {
    EventsEmit,
    EventsOn,
    LogInfo,
    WindowIsMaximised,
    WindowShow,
    WindowToggleMaximise,
    WindowUnminimise,
} from "../wailsjs/runtime/runtime";
import logo from "./assets/images/icon.png";
import { ConnectionProvider } from "./context/ConnectionContext";
import { useConnection } from "./context/ConnectionContext";
import { ReconnectionOverlay } from "./components/layout/ReconnectionOverlay";
import { GRNForm } from "./components/forms/GRNForm";
import { BatchForm } from "./components/forms/BatchForm";
import { ItemMasterForm } from "./components/forms/ItemMasterForm";
import { PackagingProfileForm } from "./components/forms/PackagingProfileForm";
import { AdminUserForm } from "./components/forms/AdminUserForm";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import { AppShell } from "./shell/AppShell";
import {
    canAccessRoute,
    canPerformAction,
    getDefaultRouteForRole,
    getRouteById,
    resolveRouteByPath,
    resolveUserRole,
    type UserRole,
    type ViewKey,
} from "./shell/rbac";
import {
    AUTH_SESSION_EXPIRED_EVENT,
    clearAuthSession,
    extractErrorMessage,
    getSessionRole,
    login,
    resolveAuthExpiry,
    resolveAuthToken,
    saveAuthSession,
} from "./services/authApi";
import "./App.css";

const { Header, Content } = Layout;
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
    reason?: "hardware-mismatch" | "license-expired" | "clock-tamper";
    message: string;
    hardware_id?: string;
};

type LockoutRetryResult = {
    passed: boolean;
    message: string;
};

type AutomationStatus = {
    enabled: boolean;
    current_check: string;
    last_event: string;
    updated_at: string;
    checks: Record<string, string>;
};

type WindowWithAppBindings = Window & {
    go?: {
        app?: {
            App?: {
                GetRecoveryState?: () => Promise<RecoveryState>;
                RestoreBackup?: (backupPath: string) => Promise<void>;
                GetLicenseStatus?: () => Promise<LicenseStatus>;
                GetLicenseLockoutState?: () => Promise<LicenseLockoutState>;
                GetAutomationStatus?: () => Promise<AutomationStatus>;
                RetryLockoutValidation?: () => Promise<LockoutRetryResult>;
                GetSessionRole?: (authToken: string) => Promise<string>;
                Login?: (username: string, password: string) => Promise<{ token: string; expires_at: number }>;
            };
        };
    };
};

function WindowControls() {
    const { appMode } = useConnection();
    const [isMaximised, setIsMaximised] = useState(false);

    const trace = (msg: string) => {
        console.info(msg);
        try {
            LogInfo(msg);
        } catch {
            // no-op outside Wails runtime
        }
    };

    const syncMaximisedState = useCallback(async () => {
        try {
            const maximised = await WindowIsMaximised();
            setIsMaximised(Boolean(maximised));
        } catch {
            setIsMaximised(false);
        }
    }, []);

    useEffect(() => {
        void syncMaximisedState();
        const onResize = () => {
            void syncMaximisedState();
        };
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
        };
    }, [syncMaximisedState]);

    const onMinimize = () => {
        trace("[UI][WindowControls] Minimize clicked -> emit app:request-minimize");
        try {
            EventsEmit("app:request-minimize");
        } catch {
            // no-op outside Wails runtime
        }
    };

    const onHideToTray = () => {
        if (appMode === "server") {
            trace("[UI][WindowControls] Close clicked -> emit app:request-hide-to-tray");
            try {
                EventsEmit("app:request-hide-to-tray");
            } catch {
                // no-op outside Wails runtime
            }
            return;
        }

        trace("[UI][WindowControls] Close clicked -> emit app:request-quit-confirm");
        try {
            EventsEmit("app:request-quit-confirm");
        } catch {
            // no-op outside Wails runtime
        }
    };

    const onToggleMaximise = () => {
        trace("[UI][WindowControls] Toggle maximize clicked");
        try {
            WindowToggleMaximise();
            window.setTimeout(() => {
                void syncMaximisedState();
            }, 50);
        } catch {
            // no-op outside Wails runtime
        }
    };

    return (
        <div className="window-controls">
            <Button className="window-controls__btn" onClick={onMinimize} type="text" aria-label="Minimize">
                <span className="window-controls__icon window-controls__icon--minimise" aria-hidden="true" />
            </Button>
            <Button
                className="window-controls__btn"
                onClick={onToggleMaximise}
                type="text"
                aria-label={isMaximised ? "Restore window" : "Maximize window"}
            >
                <span
                    className={`window-controls__icon ${
                        isMaximised ? "window-controls__icon--restore" : "window-controls__icon--maximise"
                    }`}
                    aria-hidden="true"
                />
            </Button>
            <Button className="window-controls__btn window-controls__btn--close" onClick={onHideToTray} type="text" aria-label="Hide to tray">
                <span className="window-controls__icon window-controls__icon--close" aria-hidden="true" />
            </Button>
        </div>
    );
}

function WindowTitleBar() {
    const { appMode } = useConnection();
    const appTitle = appMode === "server" ? "Motaba Inventory Server" : "Motaba Inventory Client";
    return (
        <div className="window-titlebar" data-testid="app-shell-fixed-titlebar">
            <div className="window-titlebar__brand">
                <img src={logo} className="window-titlebar__logo" alt="logo" />
                <span className="window-titlebar__text">{appTitle}</span>
            </div>
            <WindowControls />
        </div>
    );
}

type ResilienceWorkspaceProps = {
    licenseStatus: LicenseStatus;
    automationStatus: AutomationStatus | null;
};

type LoginFormValues = {
    username: string;
    password: string;
};

function ResilienceWorkspace({ licenseStatus, automationStatus }: ResilienceWorkspaceProps) {
    const { appMode } = useConnection();
    const navigate = useNavigate();
    const location = useLocation();
    const [trustedSessionRole, setTrustedSessionRole] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authRequired, setAuthRequired] = useState(false);
    const [authMessage, setAuthMessage] = useState<string | null>(null);
    const [authSubmitting, setAuthSubmitting] = useState(false);
    const role = useMemo<UserRole>(() => resolveUserRole(appMode, trustedSessionRole), [appMode, trustedSessionRole]);
    const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null);
    const [dirtyByView, setDirtyByView] = useState<Record<ViewKey, boolean>>({
        dashboard: false,
        placeholder: false,
        "item-master": false,
        grn: false,
        batch: false,
        "packaging-profile": false,
        "system-users": false,
    });
    const activeRoute = resolveRouteByPath(location.pathname) ?? getDefaultRouteForRole(role);
    const activeView = activeRoute.viewKey;
    const writeDisabled = licenseStatus.status === "grace-period" || licenseStatus.status === "expired";
    const suppressReconnectionOverlay = automationStatus?.enabled
        && (automationStatus.current_check === "AC1"
            || automationStatus.current_check === "AC2"
            || automationStatus.current_check === "AC5");
    const activeViewDirty = dirtyByView[activeView];

    useEffect(() => {
        let mounted = true;

        const loadTrustedRole = async () => {
            const authToken = resolveAuthToken();
            if (!authToken) {
                if (mounted) {
                    setTrustedSessionRole(null);
                    setAuthRequired(true);
                    setAuthLoading(false);
                }
                return;
            }
            const expiry = resolveAuthExpiry();
            if (expiry && Date.now() >= expiry*1000) {
                clearAuthSession();
                if (mounted) {
                    setTrustedSessionRole(null);
                    setAuthRequired(true);
                    setAuthMessage("Session expired. Please sign in again.");
                    setAuthLoading(false);
                }
                return;
            }
            try {
                const nextRole = await getSessionRole(authToken);
                if (mounted) {
                    setTrustedSessionRole(nextRole || null);
                    setAuthRequired(false);
                    setAuthLoading(false);
                }
            } catch (error) {
                clearAuthSession();
                if (mounted) {
                    setTrustedSessionRole(null);
                    setAuthRequired(true);
                    setAuthMessage(extractErrorMessage(error));
                    setAuthLoading(false);
                }
            }
        };

        void loadTrustedRole();
        const onStorage = () => {
            if (mounted) {
                setAuthLoading(true);
            }
            void loadTrustedRole();
        };
        window.addEventListener("storage", onStorage);

        return () => {
            mounted = false;
            window.removeEventListener("storage", onStorage);
        };
    }, [appMode]);

    const forceLoginState = useCallback((reason: string) => {
        clearAuthSession();
        setTrustedSessionRole(null);
        setAuthRequired(true);
        setAuthLoading(false);
        setAuthSubmitting(false);
        setUnauthorizedMessage(null);
        setAuthMessage(reason);
        navigate("/dashboard", { replace: true });
    }, [navigate]);

    const handleLogin = useCallback(async (values: LoginFormValues) => {
        const username = values.username.trim();
        if (!username || !values.password) {
            setAuthMessage("Username and password are required.");
            return;
        }

        setAuthSubmitting(true);
        setAuthMessage(null);
        try {
            const tokenResult = await login(username, values.password);
            if (!tokenResult?.token) {
                throw new Error("Login did not return a session token.");
            }
            const trustedRole = await getSessionRole(tokenResult.token);
            saveAuthSession(tokenResult.token, username, tokenResult.expires_at);
            setTrustedSessionRole(trustedRole || null);
            setUnauthorizedMessage(null);
            setAuthRequired(false);
            setAuthLoading(false);
            navigate(getDefaultRouteForRole(resolveUserRole(appMode, trustedRole)).path, { replace: true });
        } catch (error) {
            setAuthMessage(extractErrorMessage(error));
            setAuthRequired(true);
        } finally {
            setAuthSubmitting(false);
        }
    }, [appMode, navigate]);

    useEffect(() => {
        const onSessionExpired = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string }>;
            const messageText = customEvent.detail?.message || "Session expired. Please sign in again.";
            forceLoginState(messageText);
        };
        window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired as EventListener);
        return () => {
            window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired as EventListener);
        };
    }, [forceLoginState]);

    useEffect(() => {
        const route = resolveRouteByPath(location.pathname);
        if (authLoading || authRequired) {
            return;
        }
        if (!route) {
            navigate(getDefaultRouteForRole(role).path, { replace: true });
            return;
        }

        if (!canAccessRoute(role, route)) {
            setUnauthorizedMessage(`Route ${route.id} is not available for your role.`);
            navigate(getDefaultRouteForRole(role).path, { replace: true });
            return;
        }
    }, [authLoading, authRequired, location.pathname, navigate, role]);

    const hasUnsaved = useMemo(
        () =>
            dirtyByView.dashboard
            || dirtyByView.grn
            || dirtyByView.batch
            || dirtyByView["item-master"]
            || dirtyByView["packaging-profile"]
            || dirtyByView["system-users"]
            || dirtyByView.placeholder,
        [dirtyByView],
    );
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            activeViewDirty && currentLocation.pathname !== nextLocation.pathname,
    );

    useUnsavedChanges({
        isDirty: hasUnsaved,
        message: "You have unsaved changes. Leave anyway?",
        blocker,
        appMode,
    });

    const setDirtyFor = useCallback((view: ViewKey, isDirty: boolean) => {
        setDirtyByView(prev => {
            if (prev[view] === isDirty) {
                return prev;
            }
            return {
                ...prev,
                [view]: isDirty,
            };
        });
    }, []);

    const onGRNDirtyChange = useCallback((isDirty: boolean) => {
        setDirtyFor("grn", isDirty);
    }, [setDirtyFor]);

    const onBatchDirtyChange = useCallback((isDirty: boolean) => {
        setDirtyFor("batch", isDirty);
    }, [setDirtyFor]);

    const onItemMasterDirtyChange = useCallback((isDirty: boolean) => {
        setDirtyFor("item-master", isDirty);
    }, [setDirtyFor]);

    const onPackagingProfileDirtyChange = useCallback((isDirty: boolean) => {
        setDirtyFor("packaging-profile", isDirty);
    }, [setDirtyFor]);

    const guardedNavigate = useCallback((routeId: string, action: "view" | "create" = "view") => {
        const route = getRouteById(routeId);
        if (!route) {
            return;
        }
        if (!canAccessRoute(role, route) || !canPerformAction(role, route.module, action)) {
            setUnauthorizedMessage(`Role ${role} is not allowed to ${action} in ${route.module}.`);
            return;
        }
        setUnauthorizedMessage(null);
        navigate(route.path);
    }, [navigate, role]);

    const isFormView = activeView === "grn"
        || activeView === "batch"
        || activeView === "item-master"
        || activeView === "packaging-profile";
    const canCreateInMasters = canPerformAction(role, "masters", "create");
    const canCreateInPacking = canPerformAction(role, "packing", "create");
    const isMasterSplitView = activeView === "item-master" || activeView === "packaging-profile";

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

    const renderAutomationCard = () => {
        if (!automationStatus?.enabled) {
            return null;
        }

        return (
            <Card size="small">
                <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                    <Text strong>Automation Status</Text>
                    <Text>Current: {automationStatus.current_check || "Idle"}</Text>
                    <Text type="secondary">{automationStatus.last_event || "Waiting..."}</Text>
                    <Text type="secondary">Updated: {automationStatus.updated_at || "-"}</Text>
                    {Object.keys(automationStatus.checks || {}).length > 0 ? (
                        <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                            {Object.entries(automationStatus.checks).map(([check, status]) => (
                                <Text key={check}>
                                    {check}: {status}
                                </Text>
                            ))}
                        </Space>
                    ) : null}
                </Space>
            </Card>
        );
    };

    const renderAdminDashboard = () => (
        <div className="dashboard-grid">
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Stock Value Pipeline</Text>
                <Title level={4} className="dashboard-kpi-card__value">{"Raw -> Bulk -> Finished"}</Title>
                <Text type="secondary">Command-center valuation widgets attach here.</Text>
            </Card>
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Critical Alerts</Text>
                <Title level={4} className="dashboard-kpi-card__value">Priority Queue</Title>
                <Text type="secondary">Low stock and service alerts are summarized first.</Text>
            </Card>
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Operations Pulse</Text>
                <Title level={4} className="dashboard-kpi-card__value">Live Activity</Title>
                <Text type="secondary">Recent GRN, Batch, and Dispatch activity appears here.</Text>
            </Card>
            <Card className="dashboard-panel" size="small" title="Admin Focus">
                <ul className="dashboard-list">
                    <li>Review valuation and low-stock exceptions before opening modules.</li>
                    <li>Prioritize blocking risks first, then delegate transactional work.</li>
                    <li>Use route menu to drill into Masters, Procurement, Production, and Reports.</li>
                </ul>
            </Card>
        </div>
    );

    const renderOperatorDashboard = () => (
        <div className="dashboard-grid">
            <Card className="dashboard-panel" size="small" title="Speed Hub">
                <Text type="secondary">
                    Use quick actions for rapid task entry, then continue with keyboard-first forms.
                </Text>
            </Card>
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Ready Queue</Text>
                <Title level={4} className="dashboard-kpi-card__value">GRN / Batch / Dispatch</Title>
                <Text type="secondary">Operator flow starts from action-first entry points.</Text>
            </Card>
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Recent Work</Text>
                <Title level={4} className="dashboard-kpi-card__value">Last Transactions</Title>
                <Text type="secondary">Recent submissions are surfaced for quick verification.</Text>
            </Card>
            <Card className="dashboard-kpi-card" size="small">
                <Text type="secondary" className="dashboard-kpi-card__label">Form Readiness</Text>
                <Title level={4} className="dashboard-kpi-card__value">Keyboard First</Title>
                <Text type="secondary">Focus starts in primary fields for fast tab-entry rhythm.</Text>
            </Card>
        </div>
    );

    const renderWorkspaceContent = () => {
        switch (activeView) {
            case "dashboard":
                return role === "admin" ? renderAdminDashboard() : renderOperatorDashboard();
            case "grn":
                return (
                    <GRNForm
                        userKey={role}
                        writeDisabled={writeDisabled}
                        onDirtyChange={onGRNDirtyChange}
                    />
                );
            case "batch":
                return (
                    <BatchForm
                        userKey={role}
                        writeDisabled={writeDisabled}
                        onDirtyChange={onBatchDirtyChange}
                    />
                );
            case "item-master":
                return (
                    <ItemMasterForm
                        writeDisabled={writeDisabled}
                        readOnly={!canCreateInMasters}
                        onDirtyChange={onItemMasterDirtyChange}
                    />
                );
            case "packaging-profile":
                return (
                    <PackagingProfileForm
                        writeDisabled={writeDisabled}
                        readOnly={!canCreateInPacking}
                        onDirtyChange={onPackagingProfileDirtyChange}
                    />
                );
            case "system-users":
                return <AdminUserForm writeDisabled={writeDisabled} />;
            default:
                return (
                    <Alert
                        type="info"
                        showIcon
                        title={`Route ${activeRoute.id}`}
                        description="This route is part of the approved contract and is reserved for upcoming stories."
                    />
                );
        }
    };

    const workspaceTitle = activeView === "dashboard"
        ? role === "admin"
            ? "Admin Command Center"
            : "Operator Speed Hub"
        : activeRoute.label;
    const workspaceSubtitle = activeView === "dashboard"
        ? role === "admin"
            ? "Decision-oriented overview with role-safe navigation and operational visibility."
            : "Task-focused landing with quick operational entry points."
        : "Role-aware shell navigation with backend-authoritative access controls.";

    const activeRouteId = activeRoute.id;
    const contentDensity: "dashboard" | "form" | "default" | "master" = activeView === "dashboard"
        ? "dashboard"
        : isMasterSplitView
            ? "master"
            : isFormView
            ? "form"
            : "default";

    const handleLogout = useCallback(() => {
        forceLoginState("You have been logged out.");
    }, [forceLoginState]);

    if (authLoading) {
        return (
            <Layout className="auth-gate">
                <Card className="auth-gate__card" variant="borderless">
                    <Space orientation="vertical" align="center" size={12} style={{ width: "100%" }}>
                        <Spin />
                        <Text type="secondary">Checking session...</Text>
                    </Space>
                </Card>
            </Layout>
        );
    }

    if (authRequired) {
        return (
            <Layout className="auth-gate">
                <Card className="auth-gate__card" variant="borderless">
                    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                        <Title level={3} className="auth-gate__title">Sign In</Title>
                        <Text type="secondary" className="auth-gate__subtitle">
                            Enter your credentials to access Masala Inventory Management.
                        </Text>
                        {authMessage ? (
                            <Alert type="warning" showIcon title={authMessage} />
                        ) : null}
                        <Form<LoginFormValues> layout="vertical" onFinish={handleLogin}>
                            <Form.Item
                                name="username"
                                label="Username"
                                rules={[{ required: true, message: "Username is required" }]}
                            >
                                <Input autoComplete="username" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label="Password"
                                rules={[{ required: true, message: "Password is required" }]}
                            >
                                <Input.Password autoComplete="current-password" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block loading={authSubmitting}>
                                Sign In
                            </Button>
                        </Form>
                    </Space>
                </Card>
            </Layout>
        );
    }

    return (
        <AppShell
            titleBar={<WindowTitleBar />}
            role={role}
            activeRouteId={activeRouteId}
            contentDensity={contentDensity}
            onNavigate={(routeId: string) => guardedNavigate(routeId, "view")}
            onLogout={handleLogout}
            licenseBanner={renderLicenseBanner()}
            automationNode={renderAutomationCard()}
            unauthorizedMessage={unauthorizedMessage}
        >
            <Title level={2} className="workspace-heading">
                {workspaceTitle}
            </Title>
            <Text type="secondary" className="workspace-subtitle">
                {workspaceSubtitle}
            </Text>

            {activeView === "dashboard" ? (
                <div className="workspace-quick-actions">
                    <Button
                        onClick={() => guardedNavigate("procurement.grn", "create")}
                        disabled={writeDisabled}
                    >
                        New GRN
                    </Button>
                    <Button
                        onClick={() => guardedNavigate("production.batches", "create")}
                        disabled={writeDisabled}
                    >
                        New Batch
                    </Button>
                    <Button
                        onClick={() => guardedNavigate("masters.items", "view")}
                        disabled={!canPerformAction(role, "masters", "view")}
                    >
                        Item Master
                    </Button>
                    <Button
                        onClick={() => guardedNavigate("packing.materials", "view")}
                        disabled={!canPerformAction(role, "packing", "view")}
                    >
                        Packaging Profiles
                    </Button>
                </div>
            ) : null}

            {renderWorkspaceContent()}
            <ReconnectionOverlay suppress={Boolean(suppressReconnectionOverlay)} />
        </AppShell>
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
    const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
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

    useEffect(() => {
        let mounted = true;
        const pollAutomationStatus = async () => {
            const binding = (window as WindowWithAppBindings).go?.app?.App?.GetAutomationStatus;
            if (typeof binding !== "function") {
                return;
            }
            try {
                const status = await binding();
                if (mounted) {
                    setAutomationStatus(status.enabled ? status : null);
                }
            } catch {
                if (mounted) {
                    setAutomationStatus(null);
                }
            }
        };

        void pollAutomationStatus();
        const timer = window.setInterval(() => {
            void pollAutomationStatus();
        }, 1000);

        return () => {
            mounted = false;
            window.clearInterval(timer);
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
        const machineID = effectiveLockoutState?.hardware_id || "Unavailable";
        const issue = effectiveLockoutState?.reason === "license-expired"
            ? "License expired (grace period ended)"
            : effectiveLockoutState?.reason === "clock-tamper"
                ? "Clock tampering detected"
                : "Hardware ID mismatch";
        const supportMessage = [
            "Lockout Diagnostics",
            `Issue: ${issue}`,
            `Details: ${effectiveLockoutState?.message || "Unavailable"}`,
            `Machine ID: ${machineID}`,
            `Date: ${new Date().toISOString()}`,
        ].join("\n");

        const copied = await copyToClipboard(supportMessage);
        if (copied) {
            message.success("Support message copied");
            return;
        }
        message.error("Unable to copy support message.");
    };

    const onRetryLockoutValidation = async () => {
        const retryBinding = (window as WindowWithAppBindings).go?.app?.App?.RetryLockoutValidation;
        if (typeof retryBinding !== "function") {
            message.error("Retry validation is unavailable in this environment.");
            return;
        }

        try {
            const result = await retryBinding();
            if (result.passed) {
                message.success(result.message || "Validation passed. Restart app to resume.");
            } else {
                message.warning(result.message || "Validation still failing.");
            }
        } catch (error) {
            const details = error instanceof Error ? error.message : "Unknown validation error";
            message.error(`Retry validation failed: ${details}`);
        }
    };

    const onExitApplication = () => {
        try {
            EventsEmit("app:request-quit-confirm");
        } catch {
            // no-op outside Wails runtime
        }
    };

    if (!isLoadingRecovery && effectiveLockoutState?.enabled) {
        const heading = effectiveLockoutState.reason === "license-expired"
            ? "License Expired. Application is locked."
            : effectiveLockoutState.reason === "clock-tamper"
                ? "Clock Tampering Detected. Application is locked."
                : "Hardware ID Mismatch. Application is locked.";
        const guidance = effectiveLockoutState.reason === "license-expired"
            ? "Your grace period has ended. Contact support with this Hardware ID to renew your license."
            : effectiveLockoutState.reason === "clock-tamper"
                ? "Set system time correctly, then use Retry Validation. After validation passes, restart the app."
                : "Contact support with this Hardware ID to request a new license.";

        return (
            <ConnectionProvider>
                <Layout className="app-shell" style={{ minHeight: "100vh" }}>
                    <WindowTitleBar />
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
                                        <Text>
                                            <Text type="secondary">Machine ID: </Text>
                                            <Text code>{effectiveLockoutState.hardware_id || "Unavailable"}</Text>
                                        </Text>
                                        <Space>
                                            <Button onClick={() => void onRetryLockoutValidation()}>
                                                Retry Validation
                                            </Button>
                                            <Button type="primary" onClick={() => void onCopySupportMessage()}>
                                                Copy Diagnostics
                                            </Button>
                                            <Button danger onClick={onExitApplication}>
                                                Exit
                                            </Button>
                                        </Space>
                                    </Space>
                                </Card>
                            </Space>
                        </Card>
                    </Content>
                </Layout>
            </ConnectionProvider>
        );
    }

    if (!isLoadingRecovery && recoveryState?.enabled) {
        return (
            <ConnectionProvider>
                <Layout className="app-shell" style={{ minHeight: "100vh" }}>
                    <WindowTitleBar />
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
            </ConnectionProvider>
        );
    }

    return (
        <ConnectionProvider>
            <ResilienceWorkspace licenseStatus={licenseStatus} automationStatus={automationStatus} />
        </ConnectionProvider>
    );
}

export default App;
