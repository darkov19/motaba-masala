import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionProvider, useConnection } from "../ConnectionContext";

function ProbeConnection() {
    const { appMode, isConnected, retryNow } = useConnection();

    return (
        <>
            <span data-testid="mode">{appMode}</span>
            <span data-testid="connected">{String(isConnected)}</span>
            <button type="button" onClick={() => void retryNow()}>
                Retry
            </button>
        </>
    );
}

describe("ConnectionProvider", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/");
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
        const reachabilityMock = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce(true);
        const setIntervalSpy = vi.spyOn(window, "setInterval");

        (
            window as {
                go?: {
                    app?: {
                        App?: {
                            CheckServerReachability?: () => Promise<boolean>;
                        };
                    };
                };
            }
        ).go = {
            app: {
                App: {
                    CheckServerReachability: reachabilityMock,
                },
            },
        };

        render(
            <ConnectionProvider>
                <ProbeConnection />
            </ConnectionProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("mode")).toHaveTextContent("client");
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
            expect(screen.getByTestId("mode")).toHaveTextContent("client");
            expect(screen.getByTestId("connected")).toHaveTextContent("true");
        });
        expect(reachabilityMock).toHaveBeenCalledTimes(2);
    });

    it("updates state from browser online/offline events", async () => {
        const reachabilityMock = vi.fn().mockResolvedValue(true);
        (
            window as {
                go?: {
                    app?: {
                        App?: {
                            CheckServerReachability?: () => Promise<boolean>;
                        };
                    };
                };
            }
        ).go = {
            app: {
                App: {
                    CheckServerReachability: reachabilityMock,
                },
            },
        };

        render(
            <ConnectionProvider>
                <ProbeConnection />
            </ConnectionProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("mode")).toHaveTextContent("client");
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

    it("uses query override for app mode in browser tests", async () => {
        window.history.replaceState({}, "", "/dashboard?appMode=server");

        render(
            <ConnectionProvider>
                <ProbeConnection />
            </ConnectionProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("mode")).toHaveTextContent("server");
            expect(screen.getByTestId("connected")).toHaveTextContent("true");
        });
    });
});
