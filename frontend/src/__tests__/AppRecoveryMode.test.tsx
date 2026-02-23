import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { ReactNode } from "react";
import App from "../App";

vi.mock("../components/forms/GRNForm", () => ({
    GRNForm: () => <div>Mock GRN Form</div>,
}));

vi.mock("../components/forms/BatchForm", () => ({
    BatchForm: () => <div>Mock Batch Form</div>,
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

describe("App recovery and license states", () => {
    const getRecoveryState = vi.fn();
    const restoreBackup = vi.fn();
    const getLicenseStatus = vi.fn();
    const getLicenseLockoutState = vi.fn();

    beforeEach(() => {
        getRecoveryState.mockReset();
        restoreBackup.mockReset();
        getLicenseStatus.mockReset();
        getLicenseLockoutState.mockReset();

        getRecoveryState.mockResolvedValue({
            enabled: true,
            message: "Recovery required.",
            backups: ["backups/backup-2026-02-18T120000.zip"],
        });
        restoreBackup.mockResolvedValue(undefined);
        getLicenseStatus.mockResolvedValue({
            status: "active",
            days_remaining: 0,
        });
        getLicenseLockoutState.mockResolvedValue({
            enabled: false,
            reason: "hardware-mismatch",
            message: "",
            hardware_id: "",
        });

        (window as unknown as {
            go?: {
                app?: {
                    App?: {
                        GetRecoveryState?: typeof getRecoveryState;
                        RestoreBackup?: typeof restoreBackup;
                        GetLicenseStatus?: typeof getLicenseStatus;
                        GetLicenseLockoutState?: typeof getLicenseLockoutState;
                    };
                };
            };
        }).go = {
            app: {
                App: {
                    GetRecoveryState: getRecoveryState,
                    RestoreBackup: restoreBackup,
                    GetLicenseStatus: getLicenseStatus,
                    GetLicenseLockoutState: getLicenseLockoutState,
                },
            },
        };

        vi.spyOn(message, "success").mockImplementation(() => undefined as never);
        vi.spyOn(message, "error").mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as unknown as { go?: unknown }).go;
    });

    it("renders recovery mode and restores selected backup", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/grn"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText("Database Recovery Mode")).toBeInTheDocument();
        expect(screen.getByText("Recovery required.")).toBeInTheDocument();
        expect(screen.getByText("backups/backup-2026-02-18T120000.zip")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        await waitFor(() => {
            expect(restoreBackup).toHaveBeenCalledWith("backups/backup-2026-02-18T120000.zip");
        });
        expect(message.success).toHaveBeenCalledWith("Backup restore started. Server will restart.");

        router.dispose();
    });

    it("renders hardware lockout mode with copy action", async () => {
        getRecoveryState.mockResolvedValue({ enabled: false, message: "", backups: [] });
        getLicenseLockoutState.mockResolvedValue({
            enabled: true,
            reason: "hardware-mismatch",
            message: "Hardware ID Mismatch. Application is locked.",
            hardware_id: "new-hw-123",
        });

        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
            configurable: true,
        });

        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/grn"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByRole("heading", { name: "Hardware ID Mismatch. Application is locked." })).toBeInTheDocument();
        expect(screen.getByText("new-hw-123")).toBeInTheDocument();

        expect(screen.queryByRole("button", { name: "Copy ID" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Copy Diagnostics" }));
        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Hardware ID: new-hw-123"));
        });

        router.dispose();
    });

    it("renders full-expiry lockout mode with renewal guidance", async () => {
        getRecoveryState.mockResolvedValue({ enabled: false, message: "", backups: [] });
        getLicenseLockoutState.mockResolvedValue({
            enabled: true,
            reason: "license-expired",
            message: "License expired. Grace period ended. Application is locked.",
            hardware_id: "expired-hw-999",
        });

        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/grn"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByRole("heading", { name: "License Expired. Application is locked." })).toBeInTheDocument();
        expect(screen.getByText("expired-hw-999")).toBeInTheDocument();
        expect(screen.getByText(/grace period has ended/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Copy Diagnostics" })).toBeInTheDocument();

        router.dispose();
    });

    it("transitions from grace-period to lockout during runtime polling", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        getRecoveryState.mockResolvedValue({ enabled: false, message: "", backups: [] });
        getLicenseLockoutState.mockResolvedValue({
            enabled: false,
            reason: "",
            message: "",
            hardware_id: "",
        });
        getLicenseStatus
            .mockResolvedValueOnce({
                status: "grace-period",
                days_remaining: -1,
                message: "License Expired. Read-only mode active for 6 more days.",
            })
            .mockResolvedValue({
                status: "expired",
                days_remaining: -7,
                message: "License expired. Application is locked.",
                hardware_id: "runtime-hw-321",
            });

        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/grn"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText("License Expired. Read-only mode active for 6 more days.")).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(30000);
        });

        expect(await screen.findByRole("heading", { name: "License Expired. Application is locked." })).toBeInTheDocument();
        expect(screen.getByText("runtime-hw-321")).toBeInTheDocument();

        router.dispose();
        vi.useRealTimers();
    });
});
