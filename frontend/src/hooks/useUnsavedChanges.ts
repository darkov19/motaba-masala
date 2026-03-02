import { ExclamationCircleFilled } from "@ant-design/icons";
import { Modal } from "antd";
import { createElement, useEffect, useRef } from "react";
import type { Blocker } from "react-router-dom";
import { SetForceQuit } from "../../wailsjs/go/app/App";
import { EventsOn, LogInfo, Quit } from "../../wailsjs/runtime/runtime";

type UseUnsavedChangesOptions = {
    isDirty: boolean;
    message?: string;
    blocker?: Blocker;
    appMode?: "server" | "client";
};

function setForceQuit(force: boolean) {
    try {
        return SetForceQuit(force).catch(() => {
            // Ignore when running in non-Wails test/dev browser environments.
        });
    } catch {
        // Ignore when bridge is unavailable.
        return Promise.resolve();
    }
}

function trace(message: string) {
    console.info(message);
    try {
        LogInfo(message);
    } catch {
        // no-op outside Wails runtime
    }
}

export function useUnsavedChanges(options: UseUnsavedChangesOptions) {
    const {
        isDirty,
        message = "You have unsaved changes. Leave anyway?",
        blocker,
        appMode = "server",
    } = options;
    const quitInProgressRef = useRef(false);
    const quitDialogOpenRef = useRef(false);

    const unsavedModalBaseProps = {
        title: "Unsaved changes",
        icon: createElement(ExclamationCircleFilled, {
            style: { color: "#7D1111", fontSize: "24px" },
        }),
        centered: true,
        okText: "Leave anyway",
        cancelText: "Stay",
        okButtonProps: { danger: true, size: "large" as const },
        cancelButtonProps: { size: "large" as const },
        width: 480,
    };

    const requestQuit = () => {
        if (quitInProgressRef.current) {
            return;
        }
        quitInProgressRef.current = true;
        void setForceQuit(true).finally(() => {
            Quit();
        });
    };

    useEffect(() => {
        // Keep close interception enabled by default. Force quit should only be
        // enabled for explicit user-confirmed exit paths.
        setForceQuit(false);

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) {
                return;
            }

            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        if (!blocker || blocker.state !== "blocked") {
            return;
        }

        Modal.confirm({
            ...unsavedModalBaseProps,
            content: message,
            onOk: () => {
                blocker.proceed();
            },
            onCancel: () => {
                blocker.reset();
            },
        });
    }, [blocker, message]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let unsubscribeQuitConfirm: (() => void) | undefined;

        try {
            unsubscribe = EventsOn("app:before-close", () => {
                trace("[UI][QuitFlow] app:before-close event received");
                if (quitInProgressRef.current || quitDialogOpenRef.current) {
                    return;
                }
                if (!isDirty) {
                    requestQuit();
                    return;
                }

                quitDialogOpenRef.current = true;
                Modal.confirm({
                    ...unsavedModalBaseProps,
                    content: message,
                    onOk: () => {
                        requestQuit();
                    },
                    onCancel: () => {
                        quitDialogOpenRef.current = false;
                    },
                });
            });

            unsubscribeQuitConfirm = EventsOn(
                "app:request-quit-confirm",
                () => {
                    trace(
                        "[UI][QuitFlow] app:request-quit-confirm event received",
                    );
                    if (
                        quitInProgressRef.current ||
                        quitDialogOpenRef.current
                    ) {
                        return;
                    }
                    quitDialogOpenRef.current = true;
                    const appLabel = appMode === "server" ? "Server" : "Client";
                    const exitLabel =
                        appMode === "server" ? "Exit Server" : "Exit Client";
                    const runningLabel =
                        appMode === "server" ? "Keep Running" : "Stay Open";
                    Modal.confirm({
                        title: `Exit Masala Inventory ${appLabel}?`,
                        content: isDirty
                            ? "You have unsaved changes. Exiting now may lose recent edits. Do you want to exit anyway?"
                            : appMode === "server"
                              ? "The server will stop and connected clients may be disconnected. Do you want to exit now?"
                              : "The client application will close. Do you want to exit now?",
                        icon: createElement(ExclamationCircleFilled, {
                            style: { color: "#7D1111", fontSize: "24px" },
                        }),
                        centered: true,
                        width: 480,
                        okText: exitLabel,
                        cancelText: runningLabel,
                        okButtonProps: { danger: true, size: "large" as const },
                        cancelButtonProps: { size: "large" as const },
                        onOk: () => {
                            trace(
                                "[UI][QuitFlow] Confirm dialog accepted -> quitting",
                            );
                            requestQuit();
                        },
                        onCancel: () => {
                            quitDialogOpenRef.current = false;
                            trace(
                                "[UI][QuitFlow] Confirm dialog cancelled -> keep running",
                            );
                        },
                    });
                },
            );
        } catch {
            // Ignore when runtime event bus is unavailable (non-Wails test/browser mode).
        }

        return () => {
            unsubscribe?.();
            unsubscribeQuitConfirm?.();
        };
    }, [appMode, isDirty, message]);

    const confirmIfUnsaved = async (
        onConfirm: () => void,
    ): Promise<boolean> => {
        if (!isDirty) {
            onConfirm();
            return true;
        }

        return new Promise<boolean>(resolve => {
            Modal.confirm({
                ...unsavedModalBaseProps,
                content: message,
                onOk: () => {
                    onConfirm();
                    resolve(true);
                },
                onCancel: () => {
                    resolve(false);
                },
            });
        });
    };

    return {
        confirmIfUnsaved,
    };
}
