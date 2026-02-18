import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type ConnectionContextValue = {
    isConnected: boolean;
    isChecking: boolean;
    lastCheckedAt: number | null;
    retryNow: () => Promise<void>;
};

const ConnectionContext = createContext<ConnectionContextValue | undefined>(
    undefined,
);

const CHECK_CONNECTED_MS = 10000;
const CHECK_RECONNECTING_MS = 3000;
const REQUEST_TIMEOUT_MS = 1500;

type WindowWithWailsBindings = Window & {
    go?: {
        app?: {
            App?: {
                Greet?: (name: string) => Promise<string>;
            };
        };
    };
};

function timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection probe timeout")), ms);
    });
}

async function probeBackendConnection(): Promise<boolean> {
    if (!navigator.onLine) {
        return false;
    }

    // Wails exposes backend bindings under window.go when running packaged app.
    const maybeGreet = (window as WindowWithWailsBindings).go?.app?.App?.Greet;
    if (typeof maybeGreet === "function") {
        try {
            await Promise.race([
                maybeGreet("ping"),
                timeoutAfter(REQUEST_TIMEOUT_MS),
            ]);
            return true;
        } catch {
            return false;
        }
    }

    // Browser/dev fallback: treat online network as connected when backend binding is unavailable.
    return true;
}

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isConnected, setIsConnected] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

    const checkConnection = useCallback(async () => {
        setIsChecking(true);
        const connected = await probeBackendConnection();
        setIsConnected(connected);
        setLastCheckedAt(Date.now());
        setIsChecking(false);
    }, []);

    useEffect(() => {
        void checkConnection();
    }, [checkConnection]);

    useEffect(() => {
        const intervalMs = isConnected
            ? CHECK_CONNECTED_MS
            : CHECK_RECONNECTING_MS;
        const timer = window.setInterval(() => {
            void checkConnection();
        }, intervalMs);

        return () => {
            window.clearInterval(timer);
        };
    }, [checkConnection, isConnected]);

    useEffect(() => {
        const onOnline = () => {
            void checkConnection();
        };
        const onOffline = () => {
            setIsConnected(false);
            setLastCheckedAt(Date.now());
        };

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, [checkConnection]);

    const value = useMemo(
        () => ({
            isConnected,
            isChecking,
            lastCheckedAt,
            retryNow: checkConnection,
        }),
        [checkConnection, isChecking, isConnected, lastCheckedAt],
    );

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnection() {
    const context = useContext(ConnectionContext);
    if (!context) {
        throw new Error("useConnection must be used inside ConnectionProvider");
    }

    return context;
}
