import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
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

describe("App license status banners", () => {
    it("shows grace-period banner and disables New action buttons", async () => {
        (window as unknown as {
            go?: {
                app?: {
                    App?: {
                        GetRecoveryState?: () => Promise<unknown>;
                        GetLicenseLockoutState?: () => Promise<unknown>;
                        GetLicenseStatus?: () => Promise<unknown>;
                    };
                };
            };
        }).go = {
            app: {
                App: {
                    GetRecoveryState: vi.fn().mockResolvedValue({ enabled: false, message: "", backups: [] }),
                    GetLicenseLockoutState: vi.fn().mockResolvedValue({ enabled: false, message: "", hardware_id: "" }),
                    GetLicenseStatus: vi.fn().mockResolvedValue({
                        status: "grace-period",
                        days_remaining: -2,
                        message: "License Expired. Read-only mode active for 5 more days.",
                    }),
                },
            },
        };

        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/dashboard"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText("License Expired. Read-only mode active for 5 more days.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "New GRN" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "New Batch" })).toBeDisabled();

        router.dispose();
        delete (window as unknown as { go?: unknown }).go;
    });

    it("falls back to safe read-only state when license status fetch fails", async () => {
        (window as unknown as {
            go?: {
                app?: {
                    App?: {
                        GetRecoveryState?: () => Promise<unknown>;
                        GetLicenseLockoutState?: () => Promise<unknown>;
                        GetLicenseStatus?: () => Promise<unknown>;
                    };
                };
            };
        }).go = {
            app: {
                App: {
                    GetRecoveryState: vi.fn().mockResolvedValue({ enabled: false, message: "", backups: [] }),
                    GetLicenseLockoutState: vi.fn().mockResolvedValue({ enabled: false, message: "", hardware_id: "" }),
                    GetLicenseStatus: vi.fn().mockRejectedValue(new Error("timeout")),
                },
            },
        };

        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            { initialEntries: ["/dashboard"] },
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText("Unable to verify license status. Read-only mode is active until verification succeeds.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "New GRN" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "New Batch" })).toBeDisabled();

        router.dispose();
        delete (window as unknown as { go?: unknown }).go;
    });
});
