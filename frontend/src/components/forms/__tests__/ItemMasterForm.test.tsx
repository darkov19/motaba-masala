import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ItemMasterForm } from "../ItemMasterForm";

const listItemsMock = vi.fn();
const createItemMock = vi.fn();
const updateItemMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listItems: (...args: unknown[]) => listItemsMock(...args),
    createItem: (...args: unknown[]) => createItemMock(...args),
    updateItem: (...args: unknown[]) => updateItemMock(...args),
}));

describe("ItemMasterForm", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        createItemMock.mockReset();
        updateItemMock.mockReset();
        listItemsMock.mockResolvedValue([]);
        createItemMock.mockResolvedValue({
            id: 1,
            name: "Chili Powder",
            item_type: "RAW",
            base_unit: "kg",
            item_subtype: "",
            minimum_stock: 0,
            is_active: true,
            updated_at: new Date().toISOString(),
            sku: "",
        });
        vi.spyOn(message, "success").mockImplementation(() => undefined as never);
        vi.spyOn(message, "error").mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("shows inline validation and submits successfully", async () => {
        const onDirty = vi.fn();
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ItemMasterForm onDirtyChange={onDirty} />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByText("Packing Material Items"));
        fireEvent.click(screen.getByRole("button", { name: "Create Item" }));
        expect(await screen.findByText("Item name is required")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Enter item name"), { target: { value: "Jar Lid" } });
        fireEvent.change(screen.getByPlaceholderText("kg, g, pcs, ltr..."), { target: { value: "pcs" } });

        fireEvent.click(screen.getByRole("button", { name: "Create Item" }));
        await waitFor(() => {
            expect(createItemMock).toHaveBeenCalledTimes(1);
            expect(createItemMock).toHaveBeenCalledWith(expect.objectContaining({
                name: "Jar Lid",
                item_type: "PACKING_MATERIAL",
            }));
        });
    }, 15000);

    it("loads existing row and submits update flow", async () => {
        const updatedAt = new Date().toISOString();
        listItemsMock.mockImplementation((_: unknown, itemType: unknown) => Promise.resolve(
            itemType === "PACKING_MATERIAL"
                ? [{
                    id: 22,
                    sku: "SKU-22",
                    name: "Jar Body",
                    item_type: "PACKING_MATERIAL",
                    base_unit: "pcs",
                    item_subtype: "JAR_BODY",
                    minimum_stock: 0,
                    is_active: true,
                    updated_at: updatedAt,
                }]
                : [],
        ));
        updateItemMock.mockResolvedValue({
            id: 22,
            sku: "SKU-22",
            name: "Jar Body Updated",
            item_type: "PACKING_MATERIAL",
            base_unit: "pcs",
            item_subtype: "JAR_BODY",
            minimum_stock: 0,
            is_active: true,
            updated_at: new Date().toISOString(),
        });

        const onDirty = vi.fn();
        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ItemMasterForm onDirtyChange={onDirty} />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByText("Packing Material Items"));
        fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
        const nameInput = screen.getByPlaceholderText("Enter item name");
        fireEvent.change(nameInput, { target: { value: "Jar Body Updated" } });
        fireEvent.click(screen.getByRole("button", { name: "Update Item" }));

        await waitFor(() => {
            expect(updateItemMock).toHaveBeenCalledTimes(1);
            expect(updateItemMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 22,
                    name: "Jar Body Updated",
                    updated_at: updatedAt,
                }),
            );
        });
    }, 15000);
});
