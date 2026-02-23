import { useEffect, useMemo, useState } from "react";
import { Badge, Space, Typography } from "antd";
import { useConnection } from "../../context/ConnectionContext";

const { Text } = Typography;

export function ConnectionStatus() {
    const { appMode, isConnected, isChecking, lastCheckedAt } = useConnection();
    const statusLabel = appMode === "server"
        ? "Server Running"
        : isConnected
            ? "Connected"
            : "Disconnected";
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const lastCheckedLabel = useMemo(() => {
        if (isConnected || !lastCheckedAt) {
            return null;
        }
        const elapsedSeconds = Math.max(
            0,
            Math.floor((now - lastCheckedAt) / 1000),
        );
        return `${elapsedSeconds}s`;
    }, [isConnected, lastCheckedAt, now]);

    return (
        <Space size={8}>
            <Badge status={appMode === "server" ? "processing" : isConnected ? "success" : "error"} />
            <Text style={{ color: "#fff", margin: 0 }}>{statusLabel}</Text>
            {appMode !== "server" && isChecking ? (
                <Text style={{ color: "#f5f5f5" }}>Checking...</Text>
            ) : null}
            {appMode !== "server" && lastCheckedLabel ? (
                <Text style={{ color: "#f5f5f5" }}>Retrying: {lastCheckedLabel}</Text>
            ) : null}
        </Space>
    );
}
