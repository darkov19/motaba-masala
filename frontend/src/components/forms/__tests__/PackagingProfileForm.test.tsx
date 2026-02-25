import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PackagingProfileForm } from "../PackagingProfileForm";

const listItemsMock = vi.fn();
const listPackagingProfilesMock = vi.fn();
const createPackagingProfileMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listItems: (...args: unknown[]) => listItemsMock(...args),
    listPackagingProfiles: (...args: unknown[]) => listPackagingProfilesMock(...args),
    createPackagingProfile: (...args: unknown[]) => createPackagingProfileMock(...args),
}));

describe("PackagingProfileForm", () => {
    beforeEach(() => {
        listItemsMock.mockReset();
        listPackagingProfilesMock.mockReset();
        createPackagingProfileMock.mockReset();
        listItemsMock.mockResolvedValue([
            {
                id: 11,
                name: "Jar Body",
                item_type: "PACKING_MATERIAL",
                item_subtype: "JAR_BODY",
                base_unit: "pcs",
                updated_at: new Date().toISOString(),
                minimum_stock: 0,
                is_active: true,
                sku: "",
            },
            {
                id: 12,
                name: "Jar Lid",
                item_type: "PACKING_MATERIAL",
                item_subtype: "JAR_LID",
                base_unit: "pcs",
                updated_at: new Date().toISOString(),
                minimum_stock: 0,
                is_active: true,
                sku: "",
            },
        ]);
        listPackagingProfilesMock.mockResolvedValue([]);
        createPackagingProfileMock.mockResolvedValue({
            id: 91,
            name: "Jar Pack 200g",
            pack_mode: "JAR_200G",
            is_active: true,
            updated_at: new Date().toISOString(),
            components: [{ packing_material_item_id: 11, qty_per_unit: 1 }],
        });
    });

    it("validates required fields and submits profile", async () => {
        const onDirty = vi.fn();
        render(<PackagingProfileForm onDirtyChange={onDirty} />);

        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
        expect(await screen.findByText("Profile name is required")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Jar Pack 200g"), { target: { value: "Jar Pack 200g" } });
        fireEvent.change(screen.getByPlaceholderText("JAR_200G"), { target: { value: "JAR_200G" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Jar Body (JAR_BODY)"));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });

        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
        await waitFor(() => {
            expect(createPackagingProfileMock).toHaveBeenCalledTimes(1);
        });
    }, 15000);

    it("blocks duplicate component selection before submit", async () => {
        const onDirty = vi.fn();
        render(<PackagingProfileForm onDirtyChange={onDirty} />);

        fireEvent.change(await screen.findByPlaceholderText("Jar Pack 200g"), { target: { value: "Jar Pack Duplicate" } });
        fireEvent.change(screen.getByPlaceholderText("JAR_200G"), { target: { value: "JAR_DUP" } });

        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Jar Body (JAR_BODY)"));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });

        fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

        fireEvent.mouseDown(screen.getAllByRole("combobox")[1]);
        const duplicateChoices = await screen.findAllByText("Jar Body (JAR_BODY)");
        fireEvent.click(duplicateChoices[duplicateChoices.length - 1]);

        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));

        await waitFor(() => {
            expect(createPackagingProfileMock).not.toHaveBeenCalled();
        });
    }, 15000);

    it("calls API and handles API failure path", async () => {
        createPackagingProfileMock.mockRejectedValue(new Error("server rejected profile"));
        const onDirty = vi.fn();
        render(<PackagingProfileForm onDirtyChange={onDirty} />);

        fireEvent.change(await screen.findByPlaceholderText("Jar Pack 200g"), { target: { value: "Jar Pack 500g" } });
        fireEvent.change(screen.getByPlaceholderText("JAR_200G"), { target: { value: "JAR_500G" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Jar Lid (JAR_LID)"));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));

        await waitFor(() => {
            expect(createPackagingProfileMock).toHaveBeenCalledTimes(1);
        });
    }, 15000);

    it("blocks zero quantity boundary before submit", async () => {
        const onDirty = vi.fn();
        render(<PackagingProfileForm onDirtyChange={onDirty} />);

        fireEvent.change(await screen.findByPlaceholderText("Jar Pack 200g"), { target: { value: "Jar Pack Zero" } });
        fireEvent.change(screen.getByPlaceholderText("JAR_200G"), { target: { value: "JAR_ZERO" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Jar Body (JAR_BODY)"));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));

        await waitFor(() => {
            expect(createPackagingProfileMock).not.toHaveBeenCalled();
        });
    }, 15000);

    it("blocks negative quantity boundary before submit", async () => {
        const onDirty = vi.fn();
        render(<PackagingProfileForm onDirtyChange={onDirty} />);

        fireEvent.change(await screen.findByPlaceholderText("Jar Pack 200g"), { target: { value: "Jar Pack Negative" } });
        fireEvent.change(screen.getByPlaceholderText("JAR_200G"), { target: { value: "JAR_NEG" } });
        fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
        fireEvent.click(await screen.findByText("Jar Body (JAR_BODY)"));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "-1" } });
        fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));

        await waitFor(() => {
            expect(createPackagingProfileMock).not.toHaveBeenCalled();
        });
    }, 15000);
});
