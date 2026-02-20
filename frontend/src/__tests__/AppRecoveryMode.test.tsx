import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import App from "../App";

vi.mock("../components/forms/GRNForm", () => ({
    GRNForm: () => <div>Mock GRN Form</div>,
}));

vi.mock("../components/forms/BatchForm", () => ({
    BatchForm: () => <div>Mock Batch Form</div>,
}));

describe("App recovery mode", () => {
    const getRecoveryState = vi.fn();
    const restoreBackup = vi.fn();

    beforeEach(() => {
        getRecoveryState.mockReset();
        restoreBackup.mockReset();

        getRecoveryState.mockResolvedValue({
            enabled: true,
            message: "Recovery required.",
            backups: ["backups/backup-2026-02-18T120000.zip"],
        });
        restoreBackup.mockResolvedValue(undefined);

        (window as unknown as {
            go?: {
                app?: {
                    App?: {
                        GetRecoveryState?: typeof getRecoveryState;
                        RestoreBackup?: typeof restoreBackup;
                    };
                };
            };
        }).go = {
            app: {
                App: {
                    GetRecoveryState: getRecoveryState,
                    RestoreBackup: restoreBackup,
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
            {
                initialEntries: ["/grn"],
                future: {
                    v7_startTransition: true,
                },
            },
        );

        render(
            <RouterProvider
                router={router}
                future={{
                    v7_startTransition: true,
                }}
            />,
        );

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
});
