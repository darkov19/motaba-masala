import { Badge, Space, Typography } from "antd";
import { useConnection } from "../../context/ConnectionContext";

const { Text } = Typography;

export function ConnectionStatus() {
    const { isConnected, isChecking, lastCheckedAt } = useConnection();
    const statusLabel = isConnected ? "Connected" : "Disconnected";

    return (
        <Space size={8}>
            <Badge status={isConnected ? "success" : "error"} />
            <Text style={{ color: "#fff", margin: 0 }}>{statusLabel}</Text>
            {isChecking ? (
                <Text style={{ color: "#f5f5f5" }}>Checking...</Text>
            ) : null}
            {lastCheckedAt ? (
                <Text style={{ color: "#f5f5f5" }}>
                    {new Date(lastCheckedAt).toLocaleTimeString()}
                </Text>
            ) : null}
        </Space>
    );
}
