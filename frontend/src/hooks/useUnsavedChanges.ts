import { Modal } from "antd";
import { useEffect } from "react";
import type { Blocker } from "react-router-dom";
import { SetForceQuit } from "../../wailsjs/go/app/App";
import { EventsOn, Quit } from "../../wailsjs/runtime/runtime";

type UseUnsavedChangesOptions = {
    isDirty: boolean;
    message?: string;
    blocker?: Blocker;
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

export function useUnsavedChanges(options: UseUnsavedChangesOptions) {
    const {
        isDirty,
        message = "You have unsaved changes. Leave anyway?",
        blocker,
    } = options;

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
            title: "Unsaved changes",
            content: message,
            okText: "Leave anyway",
            cancelText: "Stay",
            onOk: () => {
                void setForceQuit(true).finally(() => {
                    blocker.proceed();
                });
            },
            onCancel: () => {
                blocker.reset();
            },
        });
    }, [blocker, message]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        try {
            unsubscribe = EventsOn("app:before-close", () => {
                if (!isDirty) {
                    void setForceQuit(true).finally(() => {
                        Quit();
                    });
                    return;
                }

                Modal.confirm({
                    title: "Unsaved changes",
                    content: message,
                    okText: "Leave anyway",
                    cancelText: "Stay",
                    onOk: () => {
                        return setForceQuit(true).finally(() => {
                            Quit();
                        });
                    },
                });
            });
        } catch {
            // Ignore when runtime event bus is unavailable (non-Wails test/browser mode).
        }

        return () => {
            unsubscribe?.();
        };
    }, [isDirty, message]);

    const confirmIfUnsaved = async (onConfirm: () => void): Promise<boolean> => {
        if (!isDirty) {
            await setForceQuit(true);
            onConfirm();
            return true;
        }

        return new Promise<boolean>(resolve => {
            Modal.confirm({
                title: "Unsaved changes",
                content: message,
                okText: "Leave anyway",
                cancelText: "Stay",
                onOk: () => {
                    return setForceQuit(true).finally(() => {
                        onConfirm();
                        resolve(true);
                    });
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
