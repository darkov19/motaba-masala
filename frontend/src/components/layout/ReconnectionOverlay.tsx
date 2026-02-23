import { Button, Spin, Typography } from "antd";
import { useConnection } from "../../context/ConnectionContext";

const { Title, Text } = Typography;

export function ReconnectionOverlay() {
    const { appMode, isConnected, retryNow, isChecking } = useConnection();

    if (appMode === "server" || isConnected) {
        return null;
    }

    return (
        <div className="reconnection-overlay" role="alert" aria-live="assertive">
            <div className="reconnection-overlay__card">
                <Spin size="large" />
                <Title level={3}>Attempting to reconnect...</Title>
                <Text type="secondary">
                    We are retrying automatically every 3 seconds.
                </Text>
                <Button type="primary" onClick={() => void retryNow()} loading={isChecking}>
                    Retry
                </Button>
            </div>
        </div>
    );
}
