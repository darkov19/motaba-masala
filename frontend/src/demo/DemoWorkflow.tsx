import { useMemo, useReducer } from "react";
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Layout,
    Row,
    Space,
    Statistic,
    Table,
    Tag,
    Timeline,
    Typography,
} from "antd";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { initialDemoState, reducer, totalStockValue } from "./engine";
import type { DemoAction } from "./types";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const actions: { key: DemoAction["type"]; label: string }[] = [
    { key: "PROCURE_RAW", label: "1) Post GRN (Raw + Packing)" },
    { key: "RUN_IN_HOUSE_BATCH", label: "2) Run In-House Production Batch" },
    { key: "PROCURE_THIRD_PARTY_BULK", label: "3) Procure Third-Party Bulk" },
    { key: "RUN_PACKING", label: "4) Execute Packing Run" },
    { key: "RUN_DISPATCH", label: "5) Post Sales Dispatch" },
];

export default function DemoWorkflow() {
    const [state, dispatch] = useReducer(reducer, undefined, initialDemoState);
    const valuation = useMemo(() => totalStockValue(state), [state]);

    const rawKg = state.stock
        .filter(s => s.category === "RAW")
        .reduce((sum, s) => sum + s.qty, 0);
    const packPcs = state.stock
        .filter(s => s.category === "PACK_MATERIAL")
        .reduce((sum, s) => sum + s.qty, 0);
    const bulkKg = state.bulkBatches.reduce((sum, b) => sum + b.qtyKg, 0);

    return (
        <Layout style={{ minHeight: "100vh", background: "#f4f6f8" }}>
            <Header
                style={{
                    background:
                        "linear-gradient(95deg, #6f0d0d 0%, #9c1c1c 42%, #c84b31 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ margin: 0, color: "#fff" }}>
                        Motaba Masala Client Demo
                    </Title>
                    <Text style={{ color: "rgba(255,255,255,0.9)" }}>
                        End-to-end core workflow simulation (isolated and safe)
                    </Text>
                </Space>
                <Button icon={<ReloadOutlined />} onClick={() => dispatch({ type: "RESET" })}>
                    Reset Demo
                </Button>
            </Header>

            <Content style={{ padding: 20 }}>
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Demo Isolation Guarantee"
                    description="This module runs fully in browser memory and does not read/write your production DB, project directories, or files."
                />

                <Row gutter={[12, 12]}>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic title="Raw Stock (kg)" value={rawKg} precision={2} />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic title="Bulk Stock (kg)" value={bulkKg} precision={2} />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic title="FG Stock (pcs)" value={state.finishedGoodsPcs} />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic prefix="Rs" title="Live Stock Valuation" value={valuation} precision={2} />
                        </Card>
                    </Col>
                </Row>

                <Card style={{ marginTop: 12 }}>
                    <Space wrap>
                        {actions.map(action => (
                            <Button
                                key={action.key}
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => dispatch({ type: action.key })}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Space>
                    <Divider style={{ margin: "14px 0" }} />
                    <Text type="secondary">
                        Suggested client flow: run buttons left-to-right once to demonstrate procurement, production, packing, traceability, and dispatch.
                    </Text>
                </Card>

                <Row gutter={[12, 12]} style={{ marginTop: 2 }}>
                    <Col xs={24} xl={14}>
                        <Card title="Stock Ledger Snapshot">
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="id"
                                dataSource={state.stock}
                                columns={[
                                    { title: "Item", dataIndex: "name" },
                                    {
                                        title: "Type",
                                        dataIndex: "category",
                                        render: value => <Tag>{value}</Tag>,
                                    },
                                    {
                                        title: "Qty",
                                        render: (_, row) => `${row.qty} ${row.uom}`,
                                    },
                                    {
                                        title: "Unit Cost",
                                        render: (_, row) => `Rs ${row.unitCost}`,
                                    },
                                    {
                                        title: "Value",
                                        render: (_, row) => `Rs ${(row.qty * row.unitCost).toFixed(2)}`,
                                    },
                                ]}
                            />
                            <Divider />
                            <Space size="large">
                                <Text>Packaging Material Balance: {packPcs} pcs</Text>
                                <Text>Accumulated Wastage: {state.wastageKg} kg</Text>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} xl={10}>
                        <Card title="Bulk Batch Traceability">
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="id"
                                dataSource={state.bulkBatches}
                                columns={[
                                    { title: "Batch", dataIndex: "id" },
                                    {
                                        title: "Source",
                                        dataIndex: "source",
                                        render: value => (
                                            <Tag color={value === "IN_HOUSE" ? "blue" : "gold"}>{value}</Tag>
                                        ),
                                    },
                                    {
                                        title: "Qty",
                                        render: (_, row) => `${row.qtyKg} kg`,
                                    },
                                    { title: "Trace Ref", dataIndex: "traceRef" },
                                ]}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card style={{ marginTop: 12 }} title="Workflow Timeline">
                    <Timeline
                        items={state.events.slice(0, 8).map(event => ({
                            children: (
                                <Space direction="vertical" size={0}>
                                    <Text strong>{event.title}</Text>
                                    <Text type="secondary">{event.at}</Text>
                                    <Text>{event.detail}</Text>
                                </Space>
                            ),
                        }))}
                    />
                </Card>
            </Content>
        </Layout>
    );
}
