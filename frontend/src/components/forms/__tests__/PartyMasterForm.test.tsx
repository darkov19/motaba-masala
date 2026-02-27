import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartyMasterForm } from "../PartyMasterForm";

const listPartiesMock = vi.fn();
const createPartyMock = vi.fn();
const updatePartyMock = vi.fn();

vi.mock("../../../services/masterDataApi", () => ({
    listParties: (...args: unknown[]) => listPartiesMock(...args),
    createParty: (...args: unknown[]) => createPartyMock(...args),
    updateParty: (...args: unknown[]) => updatePartyMock(...args),
}));

describe("PartyMasterForm", () => {
    beforeEach(() => {
        listPartiesMock.mockReset();
        createPartyMock.mockReset();
        updatePartyMock.mockReset();
        listPartiesMock.mockResolvedValue([]);
        createPartyMock.mockResolvedValue({
            id: 1,
            party_type: "SUPPLIER",
            name: "Acme Supplier",
            phone: "9998887777",
            email: "",
            address: "",
            is_active: true,
            updated_at: new Date().toISOString(),
        });
    });

    it("validates and submits create flow", async () => {
        const onDirty = vi.fn();
        render(<PartyMasterForm onDirtyChange={onDirty} />);

        fireEvent.click(screen.getByRole("button", { name: "Create Party" }));
        expect(await screen.findByText("Name is required")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Acme Supplier / Metro Distributor"), { target: { value: "Acme Supplier" } });
        fireEvent.change(screen.getByPlaceholderText("Contact phone number"), { target: { value: "9998887777" } });
        fireEvent.click(screen.getByRole("button", { name: "Create Party" }));

        await waitFor(() => {
            expect(createPartyMock).toHaveBeenCalledTimes(1);
            expect(createPartyMock).toHaveBeenCalledWith(expect.objectContaining({
                party_type: "SUPPLIER",
                name: "Acme Supplier",
            }));
        });
    }, 15000);

    it("loads row and submits update flow", async () => {
        const updatedAt = new Date().toISOString();
        listPartiesMock.mockResolvedValue([
            {
                id: 7,
                party_type: "SUPPLIER",
                name: "Acme Supplier",
                phone: "9998887777",
                email: "",
                address: "",
                lead_time_days: 4,
                is_active: true,
                updated_at: updatedAt,
            },
        ]);
        updatePartyMock.mockResolvedValue({
            id: 7,
            party_type: "SUPPLIER",
            name: "Acme Supplier Updated",
            phone: "9998887777",
            email: "",
            address: "",
            lead_time_days: 4,
            is_active: true,
            updated_at: new Date().toISOString(),
        });

        const onDirty = vi.fn();
        render(<PartyMasterForm onDirtyChange={onDirty} />);

        fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
        fireEvent.change(screen.getByPlaceholderText("Acme Supplier / Metro Distributor"), { target: { value: "Acme Supplier Updated" } });
        fireEvent.click(screen.getByRole("button", { name: "Update Party" }));

        await waitFor(() => {
            expect(updatePartyMock).toHaveBeenCalledTimes(1);
            expect(updatePartyMock).toHaveBeenCalledWith(expect.objectContaining({
                id: 7,
                name: "Acme Supplier Updated",
                updated_at: updatedAt,
            }));
        });
    }, 15000);

    it("renders operator read-only mode with list access and no write controls", async () => {
        listPartiesMock.mockResolvedValue([
            {
                id: 7,
                party_type: "SUPPLIER",
                name: "Acme Supplier",
                phone: "9998887777",
                email: "",
                address: "",
                lead_time_days: 4,
                is_active: true,
                updated_at: new Date().toISOString(),
            },
        ]);
        const onDirty = vi.fn();
        render(<PartyMasterForm onDirtyChange={onDirty} readOnly />);

        expect(await screen.findByText("Read-only access")).toBeInTheDocument();
        expect(await screen.findByText("Acme Supplier")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Create Party" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Update Party" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    }, 15000);
});
