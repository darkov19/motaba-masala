import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUnsavedChanges } from "../useUnsavedChanges";

const confirmMock = vi.fn();

vi.mock("antd", () => ({
    Modal: {
        confirm: (...args: unknown[]) => confirmMock(...args),
    },
}));

describe("useUnsavedChanges", () => {
    it("blocks beforeunload when dirty", () => {
        renderHook(() => useUnsavedChanges({ isDirty: true }));

        const event = new Event("beforeunload") as BeforeUnloadEvent;
        Object.defineProperty(event, "returnValue", {
            configurable: true,
            writable: true,
            value: undefined,
        });

        window.dispatchEvent(event);
        expect(event.returnValue).toBe("");
    });

    it("shows confirmation modal and resolves false on cancel", async () => {
        const onConfirm = vi.fn();
        const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

        const promise = result.current.confirmIfUnsaved(onConfirm);
        expect(confirmMock).toHaveBeenCalledTimes(1);

        const args = confirmMock.mock.calls[0][0] as { onCancel: () => void };

        act(() => {
            args.onCancel();
        });

        await expect(promise).resolves.toBe(false);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("opens blocker confirmation and proceeds on ok", async () => {
        const proceed = vi.fn();
        const reset = vi.fn();

        renderHook(() =>
            useUnsavedChanges({
                isDirty: true,
                blocker: {
                    state: "blocked",
                    proceed,
                    reset,
                    location: undefined,
                } as never,
            }),
        );

        expect(confirmMock).toHaveBeenCalled();
        const args = confirmMock.mock.calls.at(-1)?.[0] as { onOk: () => void };

        act(() => {
            args.onOk();
        });

        await waitFor(() => {
            expect(proceed).toHaveBeenCalledTimes(1);
        });
        expect(reset).not.toHaveBeenCalled();
    });
});
