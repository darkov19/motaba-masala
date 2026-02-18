import { Button, Card, Col, Form, InputNumber, Row, Select, Space, Table } from "antd";
import type { DemoState } from "../types";

type Props = {
    state: DemoState;
    busy: boolean;
    onAction: (type: string, data: Record<string, unknown>) => Promise<void>;
};

export default function ProcurementPage({ state, busy, onAction }: Props) {
    const [rawForm] = Form.useForm();
    const [bulkForm] = Form.useForm();

    return (
        <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
                <Card title="Raw / Packing GRN">
                    <Form
                        form={rawForm}
                        layout="vertical"
                        initialValues={{ item_id: "raw-coriander", quantity: 50, unit_rate: 180, supplier_id: "sup-local-spice", expiry_days: 180 }}
                        onFinish={values =>
                            void onAction("create_grn", {
                                ...values,
                                source: "raw",
                            })
                        }
                    >
                        <Form.Item name="item_id" label="Item">
                            <Select
                                options={state.items
                                    .filter(item => item.type === "RAW" || item.type === "PACK")
                                    .map(item => ({ value: item.id, label: item.name }))}
                            />
                        </Form.Item>
                        <Form.Item name="supplier_id" label="Supplier">
                            <Select options={state.suppliers.map(s => ({ value: s.id, label: s.name }))} />
                        </Form.Item>
                        <Space style={{ width: "100%" }}>
                            <Form.Item name="quantity" label="Qty" style={{ width: 140 }}>
                                <InputNumber min={1} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name="unit_rate" label="Rate" style={{ width: 140 }}>
                                <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name="expiry_days" label="Expiry Days" style={{ width: 140 }}>
                                <InputNumber min={1} style={{ width: "100%" }} />
                            </Form.Item>
                        </Space>
                        <Button htmlType="submit" type="primary" loading={busy}>
                            Record GRN
                        </Button>
                    </Form>
                </Card>
            </Col>
            <Col xs={24} lg={12}>
                <Card title="Third-Party Bulk GRN">
                    <Form
                        form={bulkForm}
                        layout="vertical"
                        initialValues={{ item_id: "bulk-garam", quantity: 30, unit_rate: 300, supplier_id: "sup-ext-bulk" }}
                        onFinish={values =>
                            void onAction("create_third_party_bulk_grn", {
                                ...values,
                                source: "external",
                            })
                        }
                    >
                        <Form.Item name="item_id" label="Bulk Item">
                            <Select
                                options={state.items
                                    .filter(item => item.type === "BULK")
                                    .map(item => ({ value: item.id, label: item.name }))}
                            />
                        </Form.Item>
                        <Form.Item name="supplier_id" label="Supplier">
                            <Select options={state.suppliers.map(s => ({ value: s.id, label: s.name }))} />
                        </Form.Item>
                        <Space style={{ width: "100%" }}>
                            <Form.Item name="quantity" label="Qty (kg)" style={{ width: 160 }}>
                                <InputNumber min={1} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name="unit_rate" label="Rate / kg" style={{ width: 160 }}>
                                <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                        </Space>
                        <Button htmlType="submit" type="primary" loading={busy}>
                            Receive External Bulk
                        </Button>
                    </Form>
                </Card>
            </Col>
            <Col span={24}>
                <Card title="Recent Lots">
                    <Table
                        rowKey="code"
                        size="small"
                        dataSource={[...state.lots].slice(-10).reverse()}
                        pagination={false}
                        columns={[
                            { title: "Lot", dataIndex: "code" },
                            { title: "Item", dataIndex: "item_id" },
                            { title: "Qty", dataIndex: "quantity" },
                            { title: "Expiry", dataIndex: "expiry_date" },
                            { title: "Ref", dataIndex: "source_ref" },
                        ]}
                    />
                </Card>
            </Col>
        </Row>
    );
}
