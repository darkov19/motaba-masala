import { Alert, Space } from "antd";
import type { Alert as DemoAlert } from "../types";

type Props = {
    alerts: DemoAlert[];
};

export default function AlertStrip({ alerts }: Props) {
    if (alerts.length === 0) {
        return (
            <Alert
                type="success"
                message="No critical alerts"
                showIcon
                style={{ marginBottom: 12 }}
            />
        );
    }

    return (
        <Space direction="vertical" style={{ width: "100%", marginBottom: 12 }}>
            {alerts.slice(0, 3).map((alert, idx) => (
                <Alert
                    key={`${alert.message}-${idx}`}
                    type={alert.level === "warning" ? "warning" : "info"}
                    message={alert.message}
                    showIcon
                />
            ))}
        </Space>
    );
}
