import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "react-router-dom";
import { createFutureMemoryRouter } from "../test/router";
import type { ReactNode } from "react";
import App from "../App";
import { AUTH_SESSION_EXPIRED_EVENT } from "../services/authApi";

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

vi.mock("../components/layout/ConnectionStatus", () => ({
    ConnectionStatus: () => null,
}));

vi.mock("../components/layout/ReconnectionOverlay", () => ({
    ReconnectionOverlay: () => null,
}));

describe("Authentication lifecycle", () => {
    const loginMock = vi.fn();
    const getSessionRoleMock = vi.fn();

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        loginMock.mockReset();
        getSessionRoleMock.mockReset();
        getSessionRoleMock.mockResolvedValue("operator");
        (
            window as {
                go?: {
                    app?: {
                        App?: {
                            GetRecoveryState?: () => Promise<unknown>;
                            GetLicenseStatus?: () => Promise<unknown>;
                            GetLicenseLockoutState?: () => Promise<unknown>;
                            Login?: typeof loginMock;
                            GetSessionRole?: typeof getSessionRoleMock;
                        };
                    };
                };
            }
        ).go = {
            app: {
                App: {
                    GetRecoveryState: vi.fn().mockResolvedValue({ enabled: false, message: "", backups: [] }),
                    GetLicenseStatus: vi.fn().mockResolvedValue({ status: "active", days_remaining: 0 }),
                    GetLicenseLockoutState: vi.fn().mockResolvedValue({ enabled: false, reason: "", message: "", hardware_id: "" }),
                    Login: loginMock,
                    GetSessionRole: getSessionRoleMock,
                },
            },
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as { go?: unknown }).go;
    });

    it("shows login screen when no valid token exists", async () => {
        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);

        expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();
        expect(screen.queryByText("Operator Shell")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin Shell")).not.toBeInTheDocument();

        router.dispose();
    });

    it("logs in with valid credentials and transitions to shell routes", async () => {
        loginMock.mockResolvedValue({
            token: "fresh-session-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
        getSessionRoleMock.mockResolvedValue("admin");

        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
        expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
        fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

        expect(await screen.findByText("Admin Shell")).toBeInTheDocument();
        expect(localStorage.getItem("auth_token")).toBe("fresh-session-token");
        expect(router.state.location.pathname).toBe("/dashboard");

        router.dispose();
    });

    it("keeps login state and shows feedback on invalid credentials", async () => {
        loginMock.mockRejectedValue(new Error("invalid credentials"));

        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
        expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "badpass" } });
        fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

        expect(await screen.findByText("invalid credentials")).toBeInTheDocument();
        expect(screen.queryByText("Admin Shell")).not.toBeInTheDocument();
        router.dispose();
    });

    it("shows string-based login errors returned by bindings", async () => {
        loginMock.mockRejectedValue("invalid credentials");

        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
        expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "badpass" } });
        fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

        expect(await screen.findByText("invalid credentials")).toBeInTheDocument();
        router.dispose();
    });

    it("clears session and returns to login on logout", async () => {
        localStorage.setItem("auth_token", "trusted-session-token");
        localStorage.setItem("auth_expires_at", String(Math.floor(Date.now() / 1000) + 3600));
        getSessionRoleMock.mockResolvedValue("operator");

        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
        expect(await screen.findByText("Operator Shell")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Logout" }));

        expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();
        expect(localStorage.getItem("auth_token")).toBeNull();
        router.dispose();
    });

    it("forces re-authentication when session-expired event is raised", async () => {
        localStorage.setItem("auth_token", "trusted-session-token");
        localStorage.setItem("auth_expires_at", String(Math.floor(Date.now() / 1000) + 3600));
        getSessionRoleMock.mockResolvedValue("operator");

        const router = createFutureMemoryRouter(
            [{ path: "*", element: <App /> }],
            ["/dashboard"],
        );

        render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
        expect(await screen.findByText("Operator Shell")).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
                detail: { message: "Session expired in protected operation." },
            }));
        });

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
        });
        expect(screen.getByText("Session expired in protected operation.")).toBeInTheDocument();
        router.dispose();
    });
});
