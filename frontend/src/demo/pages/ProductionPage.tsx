import { Button, Card, Form, InputNumber, Select, Space, Table } from "antd";
import type { DemoState } from "../types";

type Props = {
    state: DemoState;
    busy: boolean;
    onAction: (type: string, data: Record<string, unknown>) => Promise<void>;
};

export default function ProductionPage({ state, busy, onAction }: Props) {
    const [form] = Form.useForm();

    return (
        <>
            <Card title="In-House Production Batch" style={{ marginBottom: 12 }}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ recipe_code: "RCP-GARAM-001", output_qty_kg: 80, wastage_kg: 4 }}
                    onFinish={values => void onAction("run_production", values as Record<string, unknown>)}
                >
                    <Space style={{ width: "100%" }}>
                        <Form.Item name="recipe_code" label="Recipe" style={{ width: 240 }}>
                            <Select
                                options={state.recipes.map(r => ({ value: r.code, label: `${r.code} - ${r.name}` }))}
                            />
                        </Form.Item>
                        <Form.Item name="output_qty_kg" label="Bulk Output (kg)" style={{ width: 180 }}>
                            <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="wastage_kg" label="Wastage (kg)" style={{ width: 160 }}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>
                    <Button type="primary" htmlType="submit" loading={busy}>
                        Execute Production
                    </Button>
                </Form>
            </Card>
            <Card title="Bulk Batches">
                <Table
                    rowKey="code"
                    size="small"
                    pagination={false}
                    dataSource={state.batches.filter(batch => batch.item_id === "bulk-garam")}
                    columns={[
                        { title: "Batch", dataIndex: "code" },
                        { title: "Source", dataIndex: "source_type" },
                        { title: "Qty", dataIndex: "quantity" },
                        { title: "Remaining", dataIndex: "remaining_qty" },
                        { title: "Value", dataIndex: "value" },
                    ]}
                />
            </Card>
        </>
    );
}
