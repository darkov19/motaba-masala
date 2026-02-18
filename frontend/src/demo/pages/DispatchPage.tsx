import { Button, Card, Checkbox, Form, InputNumber, Select, Space, Table } from "antd";
import type { DemoState } from "../types";

type Props = {
    state: DemoState;
    busy: boolean;
    onAction: (type: string, data: Record<string, unknown>) => Promise<void>;
};

export default function DispatchPage({ state, busy, onAction }: Props) {
    const [form] = Form.useForm();

    const fgBatches = state.batches
        .filter(batch => batch.item_id === "fg-garam-100" && batch.remaining_qty > 0)
        .map(batch => ({ value: batch.code, label: `${batch.code} (${batch.remaining_qty} pcs)` }));

    return (
        <>
            <Card title="Sales Dispatch" style={{ marginBottom: 12 }}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ fg_item_id: "fg-garam-100", quantity: 150, customer_id: "cust-a1", override_fifo: false }}
                    onFinish={values => void onAction("create_dispatch", values as Record<string, unknown>)}
                >
                    <Space style={{ width: "100%" }}>
                        <Form.Item name="fg_item_id" label="FG Item" style={{ width: 220 }}>
                            <Select
                                options={state.items
                                    .filter(item => item.type === "FG")
                                    .map(item => ({ value: item.id, label: item.name }))}
                            />
                        </Form.Item>
                        <Form.Item name="batch_code" label="Batch (optional)" style={{ width: 260 }}>
                            <Select allowClear options={fgBatches} />
                        </Form.Item>
                        <Form.Item name="customer_id" label="Customer" style={{ width: 220 }}>
                            <Select
                                options={state.customers.map(customer => ({
                                    value: customer.id,
                                    label: customer.name,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="quantity" label="Quantity" style={{ width: 150 }}>
                            <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="override_fifo" valuePropName="checked">
                        <Checkbox>Allow FIFO override</Checkbox>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={busy}>
                        Dispatch
                    </Button>
                </Form>
            </Card>
            <Card title="Dispatch-Eligible FG Batches">
                <Table
                    rowKey="code"
                    size="small"
                    pagination={false}
                    dataSource={state.batches.filter(batch => batch.item_id === "fg-garam-100")}
                    columns={[
                        { title: "Batch", dataIndex: "code" },
                        { title: "Created", dataIndex: "created_at" },
                        { title: "Remaining", dataIndex: "remaining_qty" },
                    ]}
                />
            </Card>
        </>
    );
}
