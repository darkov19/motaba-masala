import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./style.css";
import App from "./App";

const queryClient = new QueryClient();
const container = document.getElementById("root");
const root = createRoot(container!);

// Hash-based routing: /#/demo renders the isolated demo app
const isDemo = window.location.hash === "#/demo";

if (isDemo) {
    // Lazy-load demo to keep production bundle clean
    import("./demo/DemoApp").then(({ default: DemoApp }) => {
        root.render(
            <React.StrictMode>
                <DemoApp />
            </React.StrictMode>,
        );
    });
} else {
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <ConfigProvider
                    theme={{
                        algorithm: theme.defaultAlgorithm,
                        token: {
                            colorPrimary: "#7D1111", // Motaba Deep Maroon
                            borderRadius: 6,
                        },
                    }}
                >
                    <App />
                </ConfigProvider>
            </QueryClientProvider>
        </React.StrictMode>,
    );
}
