import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("App shell fixed chrome layout", () => {
    beforeEach(() => {
        (
            window as {
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
            }
        ).go = {
            app: {
                App: {
                    GetRecoveryState: vi.fn().mockResolvedValue({ enabled: false, message: "", backups: [] }),
                    GetLicenseStatus: vi.fn().mockResolvedValue({ status: "active", days_remaining: 0 }),
                    GetLicenseLockoutState: vi.fn().mockResolvedValue({ enabled: false, reason: "", message: "", hardware_id: "" }),
                    GetSessionRole: vi.fn().mockResolvedValue("admin"),
                },
            },
        };
        localStorage.setItem("auth_token", "trusted-session-token");
    });

    it("keeps titlebar outside the scroll region while workspace content renders inside it", async () => {
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

        const shellRoot = screen.getByTestId("app-shell-root");
        const shellBody = screen.getByTestId("app-shell-body");
        const titleBar = screen.getByTestId("app-shell-fixed-titlebar");
        const scrollRegion = screen.getByTestId("app-shell-scroll-region");

        expect(shellRoot).toContainElement(titleBar);
        expect(shellRoot).toContainElement(shellBody);
        expect(shellBody).toContainElement(scrollRegion);
        expect(scrollRegion).not.toContainElement(titleBar);

        router.dispose();
        delete (window as { go?: unknown }).go;
    });
});
