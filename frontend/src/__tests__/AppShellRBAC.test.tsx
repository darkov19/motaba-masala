import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "react-router-dom";
import { createFutureMemoryRouter } from "../test/router";
import type { ReactNode } from "react";
import App from "../App";

vi.mock("../components/forms/GRNForm", () => ({
    GRNForm: () => <div>Mock GRN Form</div>,
}));

vi.mock("../components/forms/BatchForm", () => ({
    BatchForm: () => <div>Mock Batch Form</div>,
}));

vi.mock("../components/forms/ItemMasterForm", () => ({
    ItemMasterForm: () => <div>Mock Item Master Form</div>,
}));

vi.mock("../components/forms/PackagingProfileForm", () => ({
    PackagingProfileForm: () => <div>Mock Packaging Profile Form</div>,
}));

vi.mock("../components/layout/ConnectionStatus", () => ({
    ConnectionStatus: () => null,
}));

vi.mock("../components/layout/ReconnectionOverlay", () => ({
    ReconnectionOverlay: () => null,
}));

vi.mock("../context/ConnectionContext", () => ({
    ConnectionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useConnection: () => ({
        appMode: "client",
        isConnected: true,
        isChecking: false,
        lastCheckedAt: null,
        retryNow: vi.fn(),
    }),
}));

describe("App shell RBAC behavior", () => {
    const getSessionRole = vi.fn();

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        getSessionRole.mockReset();
        getSessionRole.mockResolvedValue("operator");
        (window as unknown as {
            go?: {
                app?: {
                    App?: {
                        GetRecoveryState?: () => Promise<unknown>;
                        GetLicenseStatus?: () => Promise<unknown>;
                        GetLicenseLockoutState?: () => Promise<unknown>;
                        GetSessionRole?: () => Promise<string>;
                    };
                };
            };
        }).go = {
            app: {
                App: {
                    GetRecoveryState: vi.fn().mockResolvedValue({ enabled: false, message: "", backups: [] }),
                    GetLicenseStatus: vi.fn().mockResolvedValue({ status: "active", days_remaining: 0 }),
                    GetLicenseLockoutState: vi.fn().mockResolvedValue({ enabled: false, reason: "", message: "", hardware_id: "" }),
                    GetSessionRole: getSessionRole,
                },
            },
        };
        localStorage.setItem("auth_token", "trusted-session-token");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as unknown as { go?: unknown }).go;
    });

    it("shows admin system navigation when role is admin", async () => {
        getSessionRole.mockResolvedValue("admin");

        const router = createFutureMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);

        expect(await screen.findByText("Admin Shell")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Admin Command Center" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Users" })).toBeInTheDocument();
        expect(screen.queryByText("Mock GRN Form")).not.toBeInTheDocument();
        expect(screen.queryByText("Mock Batch Form")).not.toBeInTheDocument();
        expect(screen.queryByText("Mock Item Master Form")).not.toBeInTheDocument();
        expect(screen.queryByText("Mock Packaging Profile Form")).not.toBeInTheDocument();

        router.dispose();
    });

    it("blocks operator direct navigation to admin-only routes with clear feedback", async () => {
        getSessionRole.mockResolvedValue("operator");

        const router = createFutureMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            ["/system/users"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);

        expect(await screen.findByText("Operator Shell")).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText(/Route system\.users is not available for your role\./i)).toBeInTheDocument();
        });
        expect(screen.queryByRole("menuitem", { name: "Users" })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("menuitem", { name: "Dashboard" }));
        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/dashboard");
        });

        router.dispose();
    }, 12000);

    it("ignores tampered storage role when trusted session role is operator", async () => {
        localStorage.setItem("user_role", "Admin");
        sessionStorage.setItem("role", "admin");
        getSessionRole.mockResolvedValue("operator");

        const router = createFutureMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);

        expect(await screen.findByText("Operator Shell")).toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Users" })).not.toBeInTheDocument();

        router.dispose();
    });
});
