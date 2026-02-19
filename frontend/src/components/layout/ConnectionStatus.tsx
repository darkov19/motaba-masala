import { useEffect, useMemo, useState } from "react";
import { Badge, Space, Typography } from "antd";
import { useConnection } from "../../context/ConnectionContext";

const { Text } = Typography;
const CHECK_CONNECTED_MS = 10000;
const CHECK_RECONNECTING_MS = 3000;

export function ConnectionStatus() {
    const { isConnected, isChecking, lastCheckedAt } = useConnection();
    const statusLabel = isConnected ? "Connected" : "Disconnected";
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
        if (!lastCheckedAt) {
            return null;
        }
        const elapsedSeconds = Math.max(
            0,
            Math.floor((now - lastCheckedAt) / 1000),
        );
        return `${elapsedSeconds}s ago`;
    }, [lastCheckedAt, now]);

    const nextProbeLabel = useMemo(() => {
        if (!lastCheckedAt) {
            return null;
        }
        const intervalMs = isConnected
            ? CHECK_CONNECTED_MS
            : CHECK_RECONNECTING_MS;
        const remainingMs = Math.max(0, intervalMs - (now - lastCheckedAt));
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return `next ${remainingSeconds}s`;
    }, [isConnected, lastCheckedAt, now]);

    return (
        <Space size={8}>
            <Badge status={isConnected ? "success" : "error"} />
            <Text style={{ color: "#fff", margin: 0 }}>{statusLabel}</Text>
            {isChecking ? (
                <Text style={{ color: "#f5f5f5" }}>Checking...</Text>
            ) : null}
            {lastCheckedLabel ? (
                <Text style={{ color: "#f5f5f5" }}>{lastCheckedLabel}</Text>
            ) : null}
            {nextProbeLabel ? (
                <Text style={{ color: "#f5f5f5" }}>{nextProbeLabel}</Text>
            ) : null}
        </Space>
    );
}
