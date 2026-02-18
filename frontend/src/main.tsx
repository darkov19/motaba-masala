import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./style.css";
import App from "./App";

const queryClient = new QueryClient();
const router = createBrowserRouter([
    {
        path: "*",
        element: <App />,
    },
]);

const container = document.getElementById("root");
const root = createRoot(container!);

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
                <RouterProvider router={router} />
            </ConfigProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
