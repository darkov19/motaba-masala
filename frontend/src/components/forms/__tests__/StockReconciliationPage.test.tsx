import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockReconciliationPage } from "../StockReconciliationPage";

const listItemsMock = vi.fn();
const listMaterialLotsMock = vi.fn();
const createStockAdjustmentMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    REASON_CODES: ["Spoilage", "Audit Correction", "Damage", "Counting Error", "Other"],
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listMaterialLots: (...args: unknown[]) => listMaterialLotsMock(...args),
    createStockAdjustment: (...args: unknown[]) => createStockAdjustmentMock(...args),
}));

const ITEM_RED_CHILI = {
    id: 11,
    sku: "RAW-11",
    name: "Red Chili",
    item_type: "RAW",
    base_unit: "kg",
    item_subtype: "",
    minimum_stock: 50,
    is_active: true,
    updated_at: new Date().toISOString(),
};

describe("StockReconciliationPage", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        listMaterialLotsMock.mockReset();
        createStockAdjustmentMock.mockReset();
        listItemsMock.mockResolvedValue([ITEM_RED_CHILI]);
        listMaterialLotsMock.mockResolvedValue([]);
        createStockAdjustmentMock.mockResolvedValue({
            id: 1,
            item_id: 11,
            lot_id: null,
            qty_delta: -5,
            reason_code: "Spoilage",
            notes: "",
            created_by: "operator",
            created_at: new Date().toISOString(),
        });
    });

    it("renders form fields correctly", async () => {
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);

        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        expect(screen.getByText("Stock Reconciliation Entry")).toBeInTheDocument();
        expect(screen.getByText("Item")).toBeInTheDocument();
        expect(screen.getByText("Lot (optional)")).toBeInTheDocument();
        expect(screen.getByText("Quantity Delta")).toBeInTheDocument();
        expect(screen.getByText("Reason Code")).toBeInTheDocument();
        expect(screen.getByText("Notes (optional)")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Record Adjustment" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    });

    it("shows validation error when reason_code is not selected", async () => {
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }));

        await waitFor(() => {
            expect(screen.getByText("Please select a reason code")).toBeInTheDocument();
        });
        expect(createStockAdjustmentMock).not.toHaveBeenCalled();
    });

    it("shows validation error when item is not selected", async () => {
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }));

        await waitFor(() => {
            expect(screen.getByText("Please select an item")).toBeInTheDocument();
        });
        expect(createStockAdjustmentMock).not.toHaveBeenCalled();
    });

    it("shows validation error when qty_delta is zero", async () => {
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "0" } });
        fireEvent.blur(qtyInput);

        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }));

        await waitFor(() => {
            expect(screen.getByText("Quantity delta must be non-zero")).toBeInTheDocument();
        });
        expect(createStockAdjustmentMock).not.toHaveBeenCalled();
    });

    it("shows error alert when submission fails due to API rejection", async () => {
        createStockAdjustmentMock.mockRejectedValue(new Error("service unavailable"));
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        // Select item via combobox[0] (Item Select with showSearch)
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Red Chili [RAW] (#11)"));

        // Enter qty_delta and commit value
        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "-5" } });
        fireEvent.blur(qtyInput);

        // Select reason code via combobox[2] (Reason Code Select, no showSearch)
        // AntD renders two DOM nodes per option; click the last match (inner content div)
        // to trigger selection — same pattern as PackagingProfileForm duplicate test
        fireEvent.mouseDown(screen.getAllByRole("combobox")[2]);
        const spoilageNodes = await screen.findAllByText("Spoilage");
        fireEvent.click(spoilageNodes[spoilageNodes.length - 1]);

        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }));

        await waitFor(() => {
            expect(createStockAdjustmentMock).toHaveBeenCalledTimes(1);
            expect(screen.getByText("Submission failed")).toBeInTheDocument();
        });
    }, 15000);

    it("calls API with correct payload and shows success on valid submission", async () => {
        render(<StockReconciliationPage onDirtyChange={vi.fn()} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        // Select item
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Red Chili [RAW] (#11)"));

        // Enter qty_delta and commit value
        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "-5" } });
        fireEvent.blur(qtyInput);

        // Select reason code (combobox[2] — lot select is combobox[1])
        // AntD renders two DOM nodes per option; click the last match (inner content div)
        fireEvent.mouseDown(screen.getAllByRole("combobox")[2]);
        const spoilageNodes = await screen.findAllByText("Spoilage");
        fireEvent.click(spoilageNodes[spoilageNodes.length - 1]);

        fireEvent.click(screen.getByRole("button", { name: "Record Adjustment" }));

        await waitFor(() => {
            expect(createStockAdjustmentMock).toHaveBeenCalledTimes(1);
            expect(createStockAdjustmentMock).toHaveBeenCalledWith(expect.objectContaining({
                item_id: 11,
                qty_delta: -5,
                reason_code: "Spoilage",
            }));
        });
        // After success, form resets — no error banner shown
        await waitFor(() => {
            expect(screen.queryByText("Submission failed")).not.toBeInTheDocument();
        });
    }, 15000);

    it("calls onDirtyChange(true) when form values change", async () => {
        const onDirtyChange = vi.fn();
        render(<StockReconciliationPage onDirtyChange={onDirtyChange} />);
        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "5" } });

        expect(onDirtyChange).toHaveBeenCalledWith(true);
    });

    it("calls onDirtyChange(false) on mount", async () => {
        const onDirtyChange = vi.fn();
        render(<StockReconciliationPage onDirtyChange={onDirtyChange} />);

        await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(1));

        expect(onDirtyChange).toHaveBeenCalledWith(false);
    });
});
