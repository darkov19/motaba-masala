import { Card, Col, Row, Table, Tag } from "antd";
import type { DemoState } from "../types";

type Props = {
    state: DemoState;
};

export default function MastersPage({ state }: Props) {
    return (
        <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
                <Card title="Items">
                    <Table
                        size="small"
                        rowKey="id"
                        dataSource={state.items}
                        pagination={false}
                        columns={[
                            { title: "Name", dataIndex: "name" },
                            {
                                title: "Type",
                                dataIndex: "type",
                                render: (value: string) => <Tag>{value}</Tag>,
                            },
                            { title: "Unit", dataIndex: "unit" },
                            { title: "Min Stock", dataIndex: "min_stock" },
                        ]}
                    />
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card title="Suppliers" style={{ marginBottom: 12 }}>
                    <Table
                        size="small"
                        rowKey="id"
                        dataSource={state.suppliers}
                        pagination={false}
                        columns={[{ title: "Name", dataIndex: "name" }]}
                    />
                </Card>
                <Card title="Recipes">
                    <Table
                        size="small"
                        rowKey="code"
                        dataSource={state.recipes}
                        pagination={false}
                        columns={[
                            { title: "Code", dataIndex: "code" },
                            { title: "Output", dataIndex: "output_bulk_id" },
                            { title: "Loss %", dataIndex: "loss_percent" },
                        ]}
                    />
                </Card>
            </Col>
        </Row>
    );
}
