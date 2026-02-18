import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionProvider, useConnection } from "../ConnectionContext";

function ProbeConnection() {
    const { isConnected, retryNow } = useConnection();

    return (
        <>
            <span data-testid="connected">{String(isConnected)}</span>
            <button type="button" onClick={() => void retryNow()}>
                Retry
            </button>
        </>
    );
}

describe("ConnectionProvider", () => {
    beforeEach(() => {
        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as { go?: unknown }).go;
    });

    it("switches reconnect cadence and recovers state after retry", async () => {
        const greetMock = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce("ok");
        const setIntervalSpy = vi.spyOn(window, "setInterval");

        (
            window as {
                go?: {
                    app?: {
                        App?: {
                            Greet?: (value: string) => Promise<string>;
                        };
                    };
                };
            }
        ).go = {
            app: {
                App: {
                    Greet: greetMock,
                },
            },
        };

        render(
            <ConnectionProvider>
                <ProbeConnection />
            </ConnectionProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("connected")).toHaveTextContent("false");
        });

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
        await waitFor(() => {
            expect(
                setIntervalSpy.mock.calls.some(([, interval]) => interval === 3000),
            ).toBe(true);
        });

        fireEvent.click(screen.getByRole("button", { name: "Retry" }));

        await waitFor(() => {
            expect(screen.getByTestId("connected")).toHaveTextContent("true");
        });
        expect(greetMock).toHaveBeenCalledTimes(2);
    });

    it("updates state from browser online/offline events", async () => {
        const greetMock = vi.fn().mockResolvedValue("ok");
        (
            window as {
                go?: {
                    app?: {
                        App?: {
                            Greet?: (value: string) => Promise<string>;
                        };
                    };
                };
            }
        ).go = {
            app: {
                App: {
                    Greet: greetMock,
                },
            },
        };

        render(
            <ConnectionProvider>
                <ProbeConnection />
            </ConnectionProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("connected")).toHaveTextContent("true");
        });

        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: false,
        });
        fireEvent(window, new Event("offline"));
        expect(screen.getByTestId("connected")).toHaveTextContent("false");

        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: true,
        });
        fireEvent(window, new Event("online"));

        await waitFor(() => {
            expect(screen.getByTestId("connected")).toHaveTextContent("true");
        });
    });
});
