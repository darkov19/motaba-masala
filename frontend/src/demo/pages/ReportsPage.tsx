import {
    Button,
    Card,
    Col,
    Input,
    Row,
    Space,
    Table,
    Typography,
} from "antd";
import { useState } from "react";
import type { DemoState, TraceabilityGraph } from "../types";

const { Text } = Typography;

type Props = {
    state: DemoState;
    traceability: TraceabilityGraph | null;
    onLoadTraceability: (batchCode: string) => Promise<void>;
    busy: boolean;
};

function renderTrace(node: TraceabilityGraph["root"] | undefined): string[] {
    if (!node) {
        return [];
    }
    const lines: string[] = [];
    const walk = (current: TraceabilityGraph["root"], depth: number) => {
        lines.push(`${"  ".repeat(depth)}- ${current.batch_code} (${current.item_id}, qty ${current.quantity})`);
        current.children?.forEach(child => walk(child, depth + 1));
    };
    walk(node, 0);
    return lines;
}

export default function ReportsPage({
    state,
    traceability,
    onLoadTraceability,
    busy,
}: Props) {
    const [batchCode, setBatchCode] = useState("");

    return (
        <Row gutter={[12, 12]}>
            <Col span={24}>
                <Card title="Stock Ledger">
                    <Table
                        size="small"
                        rowKey={record => `${record.ref_code}-${record.type}-${record.occurred_at}`}
                        dataSource={[...state.ledger].reverse()}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Time", dataIndex: "occurred_at", width: 210 },
                            { title: "Type", dataIndex: "type" },
                            { title: "Item", dataIndex: "item_id" },
                            { title: "Qty", dataIndex: "quantity" },
                            { title: "Value", dataIndex: "value" },
                            { title: "Description", dataIndex: "description" },
                        ]}
                    />
                </Card>
            </Col>
            <Col xs={24} lg={12}>
                <Card title="Traceability / Recall">
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Space>
                            <Input
                                placeholder="Enter batch code (e.g. BAT-001)"
                                value={batchCode}
                                onChange={event => setBatchCode(event.target.value)}
                            />
                            <Button
                                type="primary"
                                onClick={() => void onLoadTraceability(batchCode)}
                                loading={busy}
                            >
                                Load
                            </Button>
                        </Space>
                        {traceability ? (
                            <Card size="small" title="Trace Graph">
                                {renderTrace(traceability.root).map(line => (
                                    <div key={line}>
                                        <Text code>{line}</Text>
                                    </div>
                                ))}
                            </Card>
                        ) : null}
                    </Space>
                </Card>
            </Col>
            <Col xs={24} lg={12}>
                <Card title="Stock Positions">
                    <Table
                        size="small"
                        rowKey={record => record.item_id}
                        dataSource={Object.values(state.positions)}
                        pagination={false}
                        columns={[
                            { title: "Item", dataIndex: "item_id" },
                            { title: "Qty", dataIndex: "quantity" },
                            { title: "Value", dataIndex: "value" },
                            { title: "Avg Cost", dataIndex: "avg_cost" },
                        ]}
                    />
                </Card>
            </Col>
        </Row>
    );
}
