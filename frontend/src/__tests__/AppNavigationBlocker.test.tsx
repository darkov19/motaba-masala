import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Modal } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider } from "react-router-dom";
import { createFutureMemoryRouter } from "../test/router";
import App from "../App";

vi.mock("../components/forms/GRNForm", () => ({
    GRNForm: ({
        onDirtyChange,
    }: {
        onDirtyChange: (value: boolean) => void;
    }) => (
        <div>
            <label htmlFor="grn-dirty">GRN Dirty</label>
            <input
                id="grn-dirty"
                type="checkbox"
                onChange={event => onDirtyChange(event.currentTarget.checked)}
            />
        </div>
    ),
}));

vi.mock("../components/forms/BatchForm", () => ({
    BatchForm: ({
        onDirtyChange,
    }: {
        onDirtyChange: (value: boolean) => void;
    }) => (
        <div>
            <label htmlFor="batch-dirty">Batch Dirty</label>
            <input
                id="batch-dirty"
                type="checkbox"
                onChange={event => onDirtyChange(event.currentTarget.checked)}
            />
        </div>
    ),
}));

vi.mock("../components/forms/ItemMasterForm", () => ({
    ItemMasterForm: ({
        onDirtyChange,
    }: {
        onDirtyChange: (value: boolean) => void;
    }) => (
        <div>
            <label htmlFor="item-master-dirty">Item Master Dirty</label>
            <input
                id="item-master-dirty"
                type="checkbox"
                onChange={event => onDirtyChange(event.currentTarget.checked)}
            />
        </div>
    ),
}));

vi.mock("../components/forms/PackagingProfileForm", () => ({
    PackagingProfileForm: ({
        onDirtyChange,
    }: {
        onDirtyChange: (value: boolean) => void;
    }) => (
        <div>
            <label htmlFor="packaging-profile-dirty">Packaging Profile Dirty</label>
            <input
                id="packaging-profile-dirty"
                type="checkbox"
                onChange={event => onDirtyChange(event.currentTarget.checked)}
            />
        </div>
    ),
}));

const confirmMock = vi.fn<(...args: unknown[]) => unknown>();

describe("App route-level unsaved navigation blocking", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
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
                    GetSessionRole: vi.fn().mockResolvedValue("operator"),
                },
            },
        };
        localStorage.setItem("auth_token", "trusted-session-token");
        confirmMock.mockReset();
        vi.spyOn(Modal, "confirm").mockImplementation(
            (...args: Parameters<typeof Modal.confirm>) => {
                confirmMock(...(args as unknown[]));
                return {
                    destroy: () => {},
                    update: () => {},
                };
            },
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as unknown as { go?: unknown }).go;
    });

    it("blocks dirty active route transition and allows clean active route transition", async () => {
        const router = createFutureMemoryRouter(
            [
                {
                    path: "*",
                    element: <App />,
                },
            ],
            ["/grn"],
        );

        const { unmount } = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);

        expect(await screen.findByText("Operator Shell")).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText("GRN Dirty"));
        fireEvent.click(screen.getByRole("menuitem", { name: "Batches" }));

        expect(confirmMock).toHaveBeenCalledTimes(1);
        expect(router.state.location.pathname).toBe("/grn");

        const firstPrompt = confirmMock.mock.calls[0][0] as { onCancel: () => void };
        act(() => {
            firstPrompt.onCancel();
        });

        expect(router.state.location.pathname).toBe("/grn");

        fireEvent.click(screen.getByRole("menuitem", { name: "Batches" }));
        expect(confirmMock).toHaveBeenCalledTimes(2);

        const secondPrompt = confirmMock.mock.calls[1][0] as { onOk: () => void };
        act(() => {
            secondPrompt.onOk();
        });

        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/production/batches");
        });
        await waitFor(() => {
            expect(screen.getByLabelText("Batch Dirty")).toBeInTheDocument();
        });

        await act(async () => {
            await router.navigate("/grn");
        });

        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/grn");
        });
        expect(confirmMock).toHaveBeenCalledTimes(2);

        unmount();
        router.dispose();
    });
});
