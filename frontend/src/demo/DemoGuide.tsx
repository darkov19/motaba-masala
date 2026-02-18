import { Alert, Card, Col, List, Row, Steps, Typography } from "antd";

const { Paragraph, Text, Title } = Typography;

const flowSteps = [
    "Procurement / GRN (Raw + Packing + Third-Party Bulk)",
    "In-House Production (Raw -> Bulk with wastage)",
    "Packing (Bulk -> Finished Goods with pouch consumption)",
    "Dispatch (FIFO deduction from FG batches)",
    "Sales Returns (Good add-back / Damaged write-off)",
];

function DemoGuide() {
    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
                <Card>
                    <Title level={3}>Instruction Page: End-to-End Demo Flow</Title>
                    <Paragraph>
                        This page is for client walkthrough. It explains exactly
                        how to operate the demo from start to finish and what
                        result to expect after each step.
                    </Paragraph>
                    <Alert
                        type="info"
                        showIcon
                        message="Isolation Rule"
                        description="This demo is fully isolated. It uses only browser localStorage and does not touch production database, backend services, or project runtime files."
                    />
                    <Title level={4} style={{ marginTop: 20 }}>
                        Recommended Walkthrough Sequence
                    </Title>
                    <Steps
                        direction="vertical"
                        current={-1}
                        items={flowSteps.map(label => ({ title: label }))}
                    />
                </Card>
            </Col>

            <Col xs={24} lg={8}>
                <Card title="Example Scenario">
                    <List
                        size="small"
                        dataSource={[
                            "Click 'Load Example Scenario'.",
                            "Run one In-House Production batch (example: input 100 KG raw, output 95 KG bulk, wastage 5 KG).",
                            "Run Packing from in-house bulk (example: 500 good + 10 damaged units of 100g).",
                            "Create Dispatch for customer (example: 120 PCS).",
                            "Process Return (example: 10 GOOD, then 5 DAMAGED).",
                        ]}
                        renderItem={item => <List.Item>{item}</List.Item>}
                    />
                </Card>
                <Card title="What Client Should Validate" style={{ marginTop: 16 }}>
                    <List
                        size="small"
                        dataSource={[
                            "Stock moves correctly at every stage (raw -> bulk -> FG).",
                            "FIFO dispatch allocation is visible in dispatch records.",
                            "Third-party bulk can be used for packing backup flow.",
                            "Returns behave differently for Good vs Damaged condition.",
                            "Re-order alerts appear for low stock lines.",
                        ]}
                        renderItem={item => <List.Item>{item}</List.Item>}
                    />
                </Card>
                <Card title="Out of Scope in Demo" style={{ marginTop: 16 }}>
                    <Paragraph>
                        <Text>
                            Multi-user, licensing/activation, server/client
                            networking, and full accounting integrations are not
                            included in this demo build.
                        </Text>
                    </Paragraph>
                </Card>
            </Col>
        </Row>
    );
}

export default DemoGuide;
