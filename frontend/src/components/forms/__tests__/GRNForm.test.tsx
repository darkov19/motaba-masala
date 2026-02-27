import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GRNForm } from "../GRNForm";

const listItemsMock = vi.fn();
const listPartiesMock = vi.fn();
const createGRNMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listParties: (...args: unknown[]) => listPartiesMock(...args),
    createGRN: (...args: unknown[]) => createGRNMock(...args),
}));

describe("GRNForm", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        listPartiesMock.mockReset();
        createGRNMock.mockReset();
        listPartiesMock.mockResolvedValue([
            {
                id: 1,
                party_type: "SUPPLIER",
                name: "Acme Supplier",
                phone: "",
                email: "",
                address: "",
                is_active: true,
                updated_at: new Date().toISOString(),
            },
        ]);
        listItemsMock.mockImplementation((_: unknown, itemType: unknown) => {
            if (itemType === "RAW") {
                return Promise.resolve([
                    {
                        id: 10,
                        sku: "RAW-10",
                        name: "Raw Chili",
                        item_type: "RAW",
                        base_unit: "kg",
                        item_subtype: "",
                        minimum_stock: 0,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                    },
                ]);
            }
            return Promise.resolve([
                {
                    id: 20,
                    sku: "PACK-20",
                    name: "Pouch Film",
                    item_type: "PACKING_MATERIAL",
                    base_unit: "pcs",
                    item_subtype: "",
                    minimum_stock: 0,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                },
            ]);
        });
        createGRNMock.mockResolvedValue({
            id: 1,
            grn_number: "GRN-3001",
            supplier_name: "Acme Supplier",
            invoice_no: "INV-3001",
            notes: "Dock receipt",
            updated_at: new Date().toISOString(),
            lines: [
                { line_no: 1, item_id: 10, quantity_received: 40, lot_number: "LOT-20260227-001" },
                { line_no: 2, item_id: 20, quantity_received: 15, lot_number: "LOT-20260227-002" },
            ],
        });
    });

    it("submits multiline GRN payload as discrete RAW and PACKING_MATERIAL lines", async () => {
        render(
            <GRNForm
                userKey="operator"
                onDirtyChange={vi.fn()}
                initialValues={{
                    supplierName: "Acme Supplier",
                    lines: [
                        { item_id: 10, quantity_received: 40 },
                        { item_id: 20, quantity_received: 15 },
                    ],
                }}
            />,
        );
        await waitFor(() => expect(listPartiesMock).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByPlaceholderText("GRN-3001"), { target: { value: "GRN-3001" } });
        fireEvent.change(screen.getByPlaceholderText("INV-3001"), { target: { value: "INV-3001" } });

        fireEvent.click(screen.getByRole("button", { name: "Submit GRN" }));

        await waitFor(() => {
            expect(createGRNMock).toHaveBeenCalledTimes(1);
            expect(createGRNMock).toHaveBeenCalledWith(expect.objectContaining({
                grn_number: "GRN-3001",
                supplier_name: "Acme Supplier",
                invoice_no: "INV-3001",
                lines: [
                    { item_id: 10, line_no: 1, quantity_received: 40 },
                    { item_id: 20, line_no: 2, quantity_received: 15 },
                ],
            }));
        });
    }, 20000);

    it("supports keyboard-first enter submit and rapid repeat entry reset", async () => {
        render(
            <GRNForm
                userKey="operator"
                onDirtyChange={vi.fn()}
                initialValues={{
                    supplierName: "Acme Supplier",
                    lines: [{ item_id: 10, quantity_received: 1 }],
                }}
            />,
        );
        await waitFor(() => expect(listPartiesMock).toHaveBeenCalledTimes(1));

        const grnNumberInput = screen.getByPlaceholderText("GRN-3001");
        expect(grnNumberInput).toHaveFocus();

        fireEvent.change(grnNumberInput, { target: { value: "GRN-3010" } });
        fireEvent.change(screen.getByPlaceholderText("INV-3001"), { target: { value: "INV-3010" } });
        const qtyInput = screen.getByRole("spinbutton");
        fireEvent.change(qtyInput, { target: { value: "22" } });

        fireEvent.keyDown(qtyInput, { key: "Enter", code: "Enter", charCode: 13 });

        await waitFor(() => {
            expect(createGRNMock).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText("GRN-3001")).toHaveFocus();
            expect(screen.getByRole("spinbutton")).toHaveValue("1.0");
        });
    }, 20000);

    it("blocks submit when any line quantity is zero", async () => {
        render(
            <GRNForm
                userKey="operator"
                onDirtyChange={vi.fn()}
                initialValues={{
                    supplierName: "Acme Supplier",
                    lines: [{ item_id: 10, quantity_received: 1 }],
                }}
            />,
        );
        await waitFor(() => expect(listPartiesMock).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByPlaceholderText("GRN-3001"), { target: { value: "GRN-3002" } });
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });

        fireEvent.click(screen.getByRole("button", { name: "Submit GRN" }));

        await waitFor(() => {
            expect(createGRNMock).not.toHaveBeenCalled();
        });
    }, 20000);

    it("blocks submit when any line quantity is negative", async () => {
        render(
            <GRNForm
                userKey="operator"
                onDirtyChange={vi.fn()}
                initialValues={{
                    supplierName: "Acme Supplier",
                    lines: [{ item_id: 10, quantity_received: 1 }],
                }}
            />,
        );
        await waitFor(() => expect(listPartiesMock).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByPlaceholderText("GRN-3001"), { target: { value: "GRN-3003" } });
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "-3" } });

        fireEvent.click(screen.getByRole("button", { name: "Submit GRN" }));

        await waitFor(() => {
            expect(createGRNMock).not.toHaveBeenCalled();
        });
    }, 20000);

    it("shows generated lot IDs and deferred printing notice after submit", async () => {
        render(
            <GRNForm
                userKey="operator"
                onDirtyChange={vi.fn()}
                initialValues={{
                    supplierName: "Acme Supplier",
                    lines: [{ item_id: 10, quantity_received: 3 }],
                }}
            />,
        );
        await waitFor(() => expect(listPartiesMock).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByPlaceholderText("GRN-3001"), { target: { value: "GRN-3011" } });
        fireEvent.change(screen.getByPlaceholderText("INV-3001"), { target: { value: "INV-3011" } });
        fireEvent.click(screen.getByRole("button", { name: "Submit GRN" }));

        await waitFor(() => {
            expect(createGRNMock).toHaveBeenCalledTimes(1);
            expect(screen.getByText("Generated Lot IDs (copyable)")).toBeInTheDocument();
            expect(screen.getByText("LOT-20260227-001")).toBeInTheDocument();
            expect(screen.getByText("Lot labels are deferred in this release. Use these IDs for traceability.")).toBeInTheDocument();
        });
    }, 20000);
});
