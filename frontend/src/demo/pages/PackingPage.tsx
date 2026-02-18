import { Button, Card, Form, InputNumber, Select, Space, Table } from "antd";
import type { DemoState } from "../types";

type Props = {
    state: DemoState;
    busy: boolean;
    onAction: (type: string, data: Record<string, unknown>) => Promise<void>;
};

export default function PackingPage({ state, busy, onAction }: Props) {
    const [form] = Form.useForm();

    const sourceOptions = state.batches
        .filter(batch => batch.item_id === "bulk-garam" && batch.remaining_qty > 0)
        .map(batch => ({ value: batch.code, label: `${batch.code} (${batch.remaining_qty} kg)` }));

    return (
        <>
            <Card title="Packing Run" style={{ marginBottom: 12 }}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        source_batch_code: sourceOptions[0]?.value,
                        fg_item_id: "fg-garam-100",
                        packaging_item_id: "pack-pouch-100",
                        units_produced: 500,
                    }}
                    onFinish={values => void onAction("run_packing", values as Record<string, unknown>)}
                >
                    <Space style={{ width: "100%" }}>
                        <Form.Item name="source_batch_code" label="Source Bulk Batch" style={{ width: 280 }}>
                            <Select options={sourceOptions} />
                        </Form.Item>
                        <Form.Item name="fg_item_id" label="FG Item" style={{ width: 220 }}>
                            <Select
                                options={state.items
                                    .filter(item => item.type === "FG")
                                    .map(item => ({ value: item.id, label: item.name }))}
                            />
                        </Form.Item>
                        <Form.Item name="packaging_item_id" label="Packing Material" style={{ width: 220 }}>
                            <Select
                                options={state.items
                                    .filter(item => item.type === "PACK")
                                    .map(item => ({ value: item.id, label: item.name }))}
                            />
                        </Form.Item>
                        <Form.Item name="units_produced" label="Units" style={{ width: 140 }}>
                            <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>
                    <Button htmlType="submit" type="primary" loading={busy}>
                        Run Packing
                    </Button>
                </Form>
            </Card>
            <Card title="Finished Goods Batches">
                <Table
                    rowKey="code"
                    size="small"
                    pagination={false}
                    dataSource={state.batches.filter(batch => batch.item_id === "fg-garam-100")}
                    columns={[
                        { title: "Batch", dataIndex: "code" },
                        { title: "Qty", dataIndex: "quantity" },
                        { title: "Remaining", dataIndex: "remaining_qty" },
                        { title: "Value", dataIndex: "value" },
                        { title: "Source Batch", dataIndex: "source_batch_code" },
                    ]}
                />
            </Card>
        </>
    );
}
