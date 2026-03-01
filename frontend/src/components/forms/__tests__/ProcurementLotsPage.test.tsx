import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcurementLotsPage } from "../ProcurementLotsPage";

const listItemsMock = vi.fn();
const listMaterialLotsMock = vi.fn();
const getItemStockBalanceMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listMaterialLots: (...args: unknown[]) => listMaterialLotsMock(...args),
    getItemStockBalance: (...args: unknown[]) => getItemStockBalanceMock(...args),
}));

describe("ProcurementLotsPage", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        listMaterialLotsMock.mockReset();
        getItemStockBalanceMock.mockReset();
        getItemStockBalanceMock.mockResolvedValue(0);
        listItemsMock.mockResolvedValue([
            {
                id: 11,
                sku: "RAW-11",
                name: "Red Chili",
                item_type: "RAW",
                base_unit: "kg",
                item_subtype: "",
                minimum_stock: 0,
                is_active: true,
                updated_at: new Date().toISOString(),
            },
        ]);
    });

    it("renders lot rows and required traceability fields", async () => {
        listMaterialLotsMock.mockResolvedValue([
            {
                id: 1,
                lot_number: "LOT-20260227-001",
                grn_id: 100,
                grn_line_id: 1,
                grn_number: "GRN-3001",
                item_id: 11,
                supplier_name: "Acme Supplier",
                quantity_received: 42,
                created_at: "2026-02-27T10:00:00Z",
            },
        ]);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        await waitFor(() =>
            expect(listMaterialLotsMock).toHaveBeenCalledTimes(1),
        );
        expect(screen.getByText("LOT-20260227-001")).toBeInTheDocument();
        expect(screen.getByText("GRN-3001")).toBeInTheDocument();
        expect(screen.getByText("Acme Supplier")).toBeInTheDocument();
        expect(screen.getByText("Red Chili")).toBeInTheDocument();
        expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("sends deterministic filter payload to listMaterialLots", async () => {
        listMaterialLotsMock.mockResolvedValue([]);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);
        await waitFor(() =>
            expect(listMaterialLotsMock).toHaveBeenCalledTimes(1),
        );

        fireEvent.change(screen.getByPlaceholderText("lot, GRN, supplier..."), {
            target: { value: "LOT-2026" },
        });
        fireEvent.change(screen.getByPlaceholderText("LOT-..."), {
            target: { value: "LOT-20260227-001" },
        });
        fireEvent.change(screen.getByPlaceholderText("GRN-..."), {
            target: { value: "GRN-3001" },
        });
        fireEvent.change(screen.getByPlaceholderText("Supplier name"), {
            target: { value: "Acme Supplier" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Search" }));

        await waitFor(() => {
            expect(listMaterialLotsMock).toHaveBeenLastCalledWith({
                activeOnly: true,
                search: "LOT-2026",
                lotNumber: "LOT-20260227-001",
                grnNumber: "GRN-3001",
                supplier: "Acme Supplier",
                itemId: undefined,
            });
        });
    });

    it("maps unauthorized and forbidden errors to clear alert states", async () => {
        listMaterialLotsMock.mockRejectedValueOnce(
            new Error("unauthorized token"),
        );
        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        expect(
            await screen.findByText("Authentication required (401)"),
        ).toBeInTheDocument();

        listMaterialLotsMock.mockReset();
        listMaterialLotsMock.mockReset();
        listItemsMock.mockResolvedValue([]);
        listMaterialLotsMock.mockRejectedValueOnce(
            new Error("role is not allowed to read master data"),
        );
        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        expect(
            await screen.findByText("Access denied (403)"),
        ).toBeInTheDocument();
    });

    it("maps validation errors to clear alert states (400)", async () => {
        listMaterialLotsMock.mockRejectedValueOnce(
            new Error("validation failed for filters"),
        );
        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        expect(
            await screen.findByText("Invalid filter input (400)"),
        ).toBeInTheDocument();
    });

    it("shows External badge for SUPPLIER_GRN lots", async () => {
        listMaterialLotsMock.mockResolvedValue([
            {
                id: 2,
                lot_number: "LOT-20260228-001",
                grn_id: 101,
                grn_line_id: 2,
                grn_number: "GRN-BP-001",
                item_id: 11,
                supplier_name: "Bulk Supplier Co",
                quantity_received: 100,
                source_type: "SUPPLIER_GRN",
                unit_cost: 0,
                created_at: "2026-02-28T10:00:00Z",
            },
        ]);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        await waitFor(() => expect(listMaterialLotsMock).toHaveBeenCalledTimes(1));
        expect(screen.getByText("External")).toBeInTheDocument();
    });

    it("renders unit_cost value in Unit Cost column", async () => {
        listMaterialLotsMock.mockResolvedValue([
            {
                id: 3,
                lot_number: "LOT-20260228-002",
                grn_id: 102,
                grn_line_id: 3,
                grn_number: "GRN-BP-002",
                item_id: 11,
                supplier_name: "Bulk Supplier Co",
                quantity_received: 200,
                source_type: "SUPPLIER_GRN",
                unit_cost: 55.5,
                created_at: "2026-02-28T11:00:00Z",
            },
        ]);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        await waitFor(() => expect(listMaterialLotsMock).toHaveBeenCalledTimes(1));
        expect(screen.getByText("55.50")).toBeInTheDocument();
    });

    it("shows Low Stock tag when item balance is below minimum_stock", async () => {
        listItemsMock.mockResolvedValue([
            {
                id: 11,
                sku: "RAW-11",
                name: "Red Chili",
                item_type: "RAW",
                base_unit: "kg",
                item_subtype: "",
                minimum_stock: 50,
                is_active: true,
                updated_at: new Date().toISOString(),
            },
        ]);
        listMaterialLotsMock.mockResolvedValue([
            {
                id: 4,
                lot_number: "LOT-20260228-003",
                grn_id: 103,
                grn_line_id: 4,
                grn_number: "GRN-003",
                item_id: 11,
                supplier_name: "Test Supplier",
                quantity_received: 10,
                source_type: "SUPPLIER_GRN",
                unit_cost: 0,
                created_at: "2026-02-28T12:00:00Z",
            },
        ]);
        // Stock balance (10) is below minimum_stock (50)
        getItemStockBalanceMock.mockResolvedValue(10);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        await waitFor(() => expect(listMaterialLotsMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(getItemStockBalanceMock).toHaveBeenCalledWith(11));
        expect(await screen.findByText("Low Stock")).toBeInTheDocument();
    });

    it("does not show Low Stock tag when balance meets minimum_stock", async () => {
        listItemsMock.mockResolvedValue([
            {
                id: 11,
                sku: "RAW-11",
                name: "Red Chili",
                item_type: "RAW",
                base_unit: "kg",
                item_subtype: "",
                minimum_stock: 50,
                is_active: true,
                updated_at: new Date().toISOString(),
            },
        ]);
        listMaterialLotsMock.mockResolvedValue([
            {
                id: 5,
                lot_number: "LOT-20260228-004",
                grn_id: 104,
                grn_line_id: 5,
                grn_number: "GRN-004",
                item_id: 11,
                supplier_name: "Test Supplier",
                quantity_received: 100,
                source_type: "SUPPLIER_GRN",
                unit_cost: 0,
                created_at: "2026-02-28T12:00:00Z",
            },
        ]);
        // Stock balance (100) meets or exceeds minimum_stock (50)
        getItemStockBalanceMock.mockResolvedValue(100);

        render(<ProcurementLotsPage onDirtyChange={vi.fn()} />);

        await waitFor(() => expect(listMaterialLotsMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(getItemStockBalanceMock).toHaveBeenCalledWith(11));
        expect(screen.queryByText("Low Stock")).not.toBeInTheDocument();
    });
});
