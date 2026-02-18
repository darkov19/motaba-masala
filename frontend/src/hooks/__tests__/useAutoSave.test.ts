import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "../useAutoSave";

const confirmMock = vi.fn();

vi.mock("antd", () => ({
    Modal: {
        confirm: (...args: unknown[]) => confirmMock(...args),
    },
}));

describe("useAutoSave", () => {
    beforeEach(() => {
        localStorage.clear();
        confirmMock.mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("writes draft to localStorage every 5 seconds", () => {
        const data = { supplierName: "Acme" };

        renderHook(() =>
            useAutoSave("operator:grn", data, {
                enabled: true,
                shouldSave: value => Boolean(value.supplierName),
            }),
        );

        expect(localStorage.getItem("draft:operator:grn")).toBeNull();

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        const raw = localStorage.getItem("draft:operator:grn");
        expect(raw).not.toBeNull();

        const parsed = JSON.parse(raw ?? "{}");
        expect(parsed.data).toEqual(data);
        expect(typeof parsed.savedAt).toBe("number");
    });

    it("prompts to resume when a draft exists and restores on confirm", () => {
        const onRestore = vi.fn();
        localStorage.setItem(
            "draft:operator:batch",
            JSON.stringify({
                data: { batchNumber: "B-100" },
                savedAt: Date.now() - 2 * 60000,
            }),
        );

        renderHook(() =>
            useAutoSave("operator:batch", { batchNumber: "" }, { onRestore }),
        );

        expect(confirmMock).toHaveBeenCalledTimes(1);
        const args = confirmMock.mock.calls[0][0] as {
            onOk: () => void;
            title: string;
            content: string;
        };

        expect(args.title).toContain("Resume draft");
        expect(args.content).toContain("unsaved form");

        act(() => {
            args.onOk();
        });

        expect(onRestore).toHaveBeenCalledWith({ batchNumber: "B-100" });
    });

    it("does not throw when localStorage setItem fails", () => {
        const setItemSpy = vi
            .spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new Error("quota exceeded");
            });

        expect(() => {
            renderHook(() =>
                useAutoSave("operator:grn", { supplierName: "Acme" }, { enabled: true }),
            );

            act(() => {
                vi.advanceTimersByTime(5000);
            });
        }).not.toThrow();

        expect(setItemSpy).toHaveBeenCalled();
    });
});
