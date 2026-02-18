import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./style.css";
import App from "./App";
import DemoApp from "./demo/DemoApp";

const queryClient = new QueryClient();

const container = document.getElementById("root");
const root = createRoot(container!);

const isDemoMode = import.meta.env.MODE === "demo";

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ConfigProvider
                theme={{
                    algorithm: theme.defaultAlgorithm,
                    token: {
                        colorPrimary: "#7D1111",
                        borderRadius: 6,
                    },
                }}
            >
                {isDemoMode ? <DemoApp /> : <App />}
            </ConfigProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
