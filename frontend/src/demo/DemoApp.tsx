import {
    Alert,
    Button,
    Layout,
    Menu,
    Radio,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from "antd";
import { useMemo, useState } from "react";
import AlertStrip from "./components/AlertStrip";
import KpiCards from "./components/KpiCards";
import TimelinePanel from "./components/TimelinePanel";
import DispatchPage from "./pages/DispatchPage";
import GuidedPage from "./pages/GuidedPage";
import MastersPage from "./pages/MastersPage";
import PackingPage from "./pages/PackingPage";
import ProcurementPage from "./pages/ProcurementPage";
import ProductionPage from "./pages/ProductionPage";
import ReportsPage from "./pages/ReportsPage";
import { useDemoState } from "./state/useDemoState";
import type { Persona } from "./types";
import "./demo.css";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

type ModuleKey =
    | "guided"
    | "masters"
    | "procurement"
    | "production"
    | "packing"
    | "dispatch"
    | "reports";

export default function DemoApp() {
    const [moduleKey, setModuleKey] = useState<ModuleKey>("guided");
    const {
        state,
        kpi,
        traceability,
        lastResult,
        loading,
        error,
        runStep,
        runAction,
        reset,
        changePersona,
        loadTraceability,
    } = useDemoState();

    const menuItems = useMemo(
        () => [
            { key: "guided", label: "Guided Demo" },
            { key: "masters", label: "Masters" },
            { key: "procurement", label: "Procurement" },
            { key: "production", label: "Production" },
            { key: "packing", label: "Packing" },
            { key: "dispatch", label: "Dispatch" },
            { key: "reports", label: "Reports" },
        ],
        [],
    );

    const executeAction = async (
        type: string,
        data: Record<string, unknown>,
    ): Promise<void> => {
        const result = await runAction({ type, data });
        if (result?.messages?.length) {
            message.info(result.messages[0]);
        }
    };

    if (!state) {
        return (
            <div className="demo-loading">
                <Spin size="large" />
            </div>
        );
    }

    const persona = state.persona;

    return (
        <Layout className="demo-root">
            <Sider width={240} theme="light" className="demo-sider">
                <div className="demo-branding">
                    <Title level={4}>Masala Demo Sandbox</Title>
                    <Text type="secondary">Isolated workflow simulation</Text>
                </div>
                <Menu
                    selectedKeys={[moduleKey]}
                    onClick={event => setModuleKey(event.key as ModuleKey)}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header className="demo-header">
                    <Space size="middle" wrap>
                        <Tag color="purple">Guided + Free Play</Tag>
                        <Radio.Group
                            value={persona}
                            onChange={event =>
                                void changePersona(event.target.value as Persona)
                            }
                        >
                            <Radio.Button value="admin">Admin</Radio.Button>
                            <Radio.Button value="operator">Operator</Radio.Button>
                        </Radio.Group>
                        <Select
                            value={state.seed_profile}
                            style={{ width: 140 }}
                            onChange={value => void reset(value)}
                            options={[{ value: "standard", label: "standard" }]}
                        />
                        <Button onClick={() => void reset(state.seed_profile)}>
                            Reset Demo
                        </Button>
                    </Space>
                </Header>
                <Content className="demo-content">
                    {error ? <Alert type="error" message={error} showIcon /> : null}
                    <KpiCards kpi={kpi} persona={persona} />
                    <AlertStrip alerts={state.alerts} />

                    {moduleKey === "guided" ? (
                        <GuidedPage
                            state={state}
                            onRunStep={runStep}
                            busy={loading}
                        />
                    ) : null}
                    {moduleKey === "masters" ? <MastersPage state={state} /> : null}
                    {moduleKey === "procurement" ? (
                        <ProcurementPage
                            state={state}
                            busy={loading}
                            onAction={executeAction}
                        />
                    ) : null}
                    {moduleKey === "production" ? (
                        <ProductionPage
                            state={state}
                            busy={loading}
                            onAction={executeAction}
                        />
                    ) : null}
                    {moduleKey === "packing" ? (
                        <PackingPage
                            state={state}
                            busy={loading}
                            onAction={executeAction}
                        />
                    ) : null}
                    {moduleKey === "dispatch" ? (
                        <DispatchPage
                            state={state}
                            busy={loading}
                            onAction={executeAction}
                        />
                    ) : null}
                    {moduleKey === "reports" ? (
                        <ReportsPage
                            state={state}
                            traceability={traceability}
                            onLoadTraceability={loadTraceability}
                            busy={loading}
                        />
                    ) : null}

                    <div className="demo-bottom-grid">
                        <TimelinePanel timeline={state.activity_timeline} />
                        <div className="demo-result-box">
                            <Title level={5}>Last Action Result</Title>
                            {lastResult?.messages?.map(msg => (
                                <div key={msg}>{msg}</div>
                            ))}
                            {lastResult?.warnings?.map(msg => (
                                <Alert key={msg} type="warning" message={msg} showIcon />
                            ))}
                            {!lastResult ? (
                                <Text type="secondary">No action executed yet.</Text>
                            ) : null}
                        </div>
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
