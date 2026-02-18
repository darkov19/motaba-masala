import { Button, Card, List, Space, Tag, Typography } from "antd";
import type { DemoState } from "../types";

const { Paragraph, Text } = Typography;

type Props = {
    state: DemoState;
    onRunStep: (stepId: string) => Promise<void>;
    busy: boolean;
};

export default function GuidedPage({ state, onRunStep, busy }: Props) {
    return (
        <Card title="Guided Demo Journey" extra={<Tag color="blue">Walkthrough + Free Play</Tag>}>
            <Paragraph>
                Run the workflow step-by-step to narrate the business journey, then use
                free-play pages to experiment safely.
            </Paragraph>
            <List
                dataSource={state.guided_steps}
                renderItem={step => {
                    const completed = state.completed_steps.includes(step.id);
                    const isCurrent = state.current_step_id === step.id;
                    return (
                        <List.Item
                            actions={[
                                <Button
                                    key={step.id}
                                    type={isCurrent ? "primary" : "default"}
                                    onClick={() => void onRunStep(step.id)}
                                    loading={busy}
                                >
                                    Run Step
                                </Button>,
                            ]}
                        >
                            <Space direction="vertical" size={2}>
                                <Space>
                                    <Text strong>{step.title}</Text>
                                    {completed ? <Tag color="green">Completed</Tag> : null}
                                    {isCurrent ? <Tag color="gold">Current</Tag> : null}
                                </Space>
                                <Text type="secondary">{step.description}</Text>
                                <Text>{step.expected_outcome}</Text>
                            </Space>
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
}
