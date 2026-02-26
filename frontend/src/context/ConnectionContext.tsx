import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type ConnectionContextValue = {
    appMode: AppMode;
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

export type AppMode = "server" | "client";

type WindowWithWailsBindings = Window & {
    go?: {
        app?: {
            App?: {
                CheckServerReachability?: () => Promise<boolean>;
                IsServerMode?: () => Promise<boolean>;
            };
        };
    };
};

function readAppModeOverrideFromQuery(): AppMode | null {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("appMode") || params.get("mode");
    if (!raw) {
        return null;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === "server" || normalized === "client") {
        return normalized;
    }

    return null;
}

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
    const maybeCheckReachability = (window as WindowWithWailsBindings).go?.app?.App?.CheckServerReachability;
    if (typeof maybeCheckReachability === "function") {
        try {
            const connected = await Promise.race([
                maybeCheckReachability(),
                timeoutAfter(REQUEST_TIMEOUT_MS),
            ]);
            return connected === true;
        } catch {
            return false;
        }
    }

    // Browser/dev fallback: treat online network as connected when backend binding is unavailable.
    return true;
}

async function detectAppMode(): Promise<"server" | "client"> {
    const queryOverride = readAppModeOverrideFromQuery();
    if (queryOverride) {
        return queryOverride;
    }

    const maybeIsServerMode = (window as WindowWithWailsBindings).go?.app?.App?.IsServerMode;
    if (typeof maybeIsServerMode !== "function") {
        return "client";
    }

    try {
        const isServer = await maybeIsServerMode();
        return isServer ? "server" : "client";
    } catch {
        return "client";
    }
}

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isConnected, setIsConnected] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
    const [appMode, setAppMode] = useState<"server" | "client">("client");

    useEffect(() => {
        void (async () => {
            const mode = await detectAppMode();
            setAppMode(mode);
            if (mode === "server") {
                setIsConnected(true);
                setIsChecking(false);
                setLastCheckedAt(Date.now());
            }
        })();
    }, []);

    const checkConnection = useCallback(async () => {
        if (appMode === "server") {
            setIsConnected(true);
            setIsChecking(false);
            setLastCheckedAt(Date.now());
            return;
        }

        setIsChecking(true);
        const connected = await probeBackendConnection();
        setIsConnected(connected);
        setLastCheckedAt(Date.now());
        setIsChecking(false);
    }, [appMode]);

    useEffect(() => {
        void checkConnection();
    }, [checkConnection]);

    useEffect(() => {
        if (appMode === "server") {
            return;
        }

        const intervalMs = isConnected
            ? CHECK_CONNECTED_MS
            : CHECK_RECONNECTING_MS;
        const timer = window.setInterval(() => {
            void checkConnection();
        }, intervalMs);

        return () => {
            window.clearInterval(timer);
        };
    }, [appMode, checkConnection, isConnected]);

    useEffect(() => {
        if (appMode === "server") {
            return;
        }

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
    }, [appMode, checkConnection]);

    const value = useMemo(
        () => ({
            appMode,
            isConnected,
            isChecking,
            lastCheckedAt,
            retryNow: checkConnection,
        }),
        [appMode, checkConnection, isChecking, isConnected, lastCheckedAt],
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
