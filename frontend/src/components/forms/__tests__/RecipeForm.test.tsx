import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeForm } from "../RecipeForm";

const listItemsMock = vi.fn();
const listRecipesMock = vi.fn();
const createRecipeMock = vi.fn();
const updateRecipeMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listRecipes: (...args: unknown[]) => listRecipesMock(...args),
    createRecipe: (...args: unknown[]) => createRecipeMock(...args),
    updateRecipe: (...args: unknown[]) => updateRecipeMock(...args),
}));

describe("RecipeForm", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        listRecipesMock.mockReset();
        createRecipeMock.mockReset();
        updateRecipeMock.mockReset();
        listItemsMock.mockImplementation((_: unknown, type: unknown) => {
            if (type === "BULK_POWDER") {
                return Promise.resolve([
                    {
                        id: 100,
                        name: "Bulk Garam",
                        item_type: "BULK_POWDER",
                        base_unit: "kg",
                        item_subtype: "",
                        minimum_stock: 0,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                        sku: "",
                    },
                ]);
            }
            return Promise.resolve([
                {
                    id: 10,
                    name: "Raw Chili",
                    item_type: "RAW",
                    base_unit: "kg",
                    item_subtype: "",
                    minimum_stock: 0,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                    sku: "",
                },
            ]);
        });
        listRecipesMock.mockResolvedValue([]);
        createRecipeMock.mockResolvedValue({
            id: 1,
            recipe_code: "RCP-GM-001",
            output_item_id: 100,
            output_qty_base: 100,
            expected_wastage_pct: 2.5,
            is_active: true,
            updated_at: new Date().toISOString(),
            components: [{ input_item_id: 10, input_qty_base: 60, line_no: 1 }],
        });
    });

    it("validates and submits recipe create flow", async () => {
        const onDirty = vi.fn();
        render(<RecipeForm onDirtyChange={onDirty} />);

        fireEvent.click(await screen.findByRole("button", { name: "Create Recipe" }));
        expect(await screen.findByText("Recipe code is required")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("RCP-GM-001"), { target: { value: "RCP-GM-001" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Bulk Garam"));
        fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "100" } });
        fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "2.5" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
        fireEvent.click(await screen.findByText("Raw Chili"));
        fireEvent.change(screen.getAllByRole("spinbutton")[2], { target: { value: "60" } });

        fireEvent.click(screen.getByRole("button", { name: "Create Recipe" }));
        await waitFor(() => {
            expect(createRecipeMock).toHaveBeenCalledTimes(1);
            expect(createRecipeMock).toHaveBeenCalledWith(expect.objectContaining({
                recipe_code: "RCP-GM-001",
                output_item_id: 100,
            }));
        });
    }, 15000);

    it("loads row and submits update flow", async () => {
        const updatedAt = new Date().toISOString();
        listRecipesMock.mockResolvedValue([
            {
                id: 2,
                recipe_code: "RCP-EDIT-1",
                output_item_id: 100,
                output_qty_base: 120,
                expected_wastage_pct: 2,
                is_active: true,
                updated_at: updatedAt,
                components: [{ input_item_id: 10, input_qty_base: 70, line_no: 1 }],
            },
        ]);
        updateRecipeMock.mockResolvedValue({
            id: 2,
            recipe_code: "RCP-EDIT-1",
            output_item_id: 100,
            output_qty_base: 130,
            expected_wastage_pct: 2,
            is_active: true,
            updated_at: new Date().toISOString(),
            components: [{ input_item_id: 10, input_qty_base: 75, line_no: 1 }],
        });

        const onDirty = vi.fn();
        render(<RecipeForm onDirtyChange={onDirty} />);

        fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
        fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "130" } });
        fireEvent.click(screen.getByRole("button", { name: "Update Recipe" }));

        await waitFor(() => {
            expect(updateRecipeMock).toHaveBeenCalledTimes(1);
            expect(updateRecipeMock).toHaveBeenCalledWith(expect.objectContaining({
                id: 2,
                updated_at: updatedAt,
                output_qty_base: 130,
            }));
        });
    }, 15000);
});

