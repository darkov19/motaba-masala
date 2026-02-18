import { Card, List } from "antd";

type Props = {
    timeline: string[];
};

export default function TimelinePanel({ timeline }: Props) {
    return (
        <Card title="Activity Timeline" size="small">
            <List
                size="small"
                dataSource={[...timeline].reverse().slice(0, 12)}
                renderItem={entry => <List.Item>{entry}</List.Item>}
            />
        </Card>
    );
}
