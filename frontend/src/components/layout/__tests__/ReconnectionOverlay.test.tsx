import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReconnectionOverlay } from "../ReconnectionOverlay";

const useConnectionMock = vi.fn();

vi.mock("../../../context/ConnectionContext", () => ({
    useConnection: () => useConnectionMock(),
}));

describe("ReconnectionOverlay", () => {
    it("renders overlay when disconnected and allows retry", () => {
        const retryNow = vi.fn();
        useConnectionMock.mockReturnValue({
            appMode: "client",
            isConnected: false,
            isChecking: false,
            retryNow,
        });

        render(<ReconnectionOverlay />);

        expect(screen.getByText("Attempting to reconnect...")).toBeInTheDocument();
        const button = screen.getByRole("button", { name: "Retry" });
        fireEvent.click(button);
        expect(retryNow).toHaveBeenCalledTimes(1);
    });

    it("hides overlay when connected", () => {
        useConnectionMock.mockReturnValue({
            appMode: "client",
            isConnected: true,
            isChecking: false,
            retryNow: vi.fn(),
        });

        const { container } = render(<ReconnectionOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it("hides overlay in server mode", () => {
        useConnectionMock.mockReturnValue({
            appMode: "server",
            isConnected: true,
            isChecking: false,
            retryNow: vi.fn(),
        });

        const { container } = render(<ReconnectionOverlay />);
        expect(container).toBeEmptyDOMElement();
    });
});
