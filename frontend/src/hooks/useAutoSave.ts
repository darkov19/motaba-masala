import { Modal } from "antd";
import { useEffect, useMemo, useRef } from "react";

type StoredDraft<T> = {
    data: T;
    savedAt: number;
};

type UseAutoSaveOptions<T> = {
    enabled?: boolean;
    contextLabel?: string;
    shouldSave?: (value: T) => boolean;
    onRestore?: (value: T) => void;
    onDiscard?: () => void;
};

const AUTO_SAVE_INTERVAL_MS = 5000;

function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage quota/privacy failures to keep form interactions responsive.
    }
}

function safeRemoveItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore cleanup failures.
    }
}

function getRelativeTime(savedAt: number): string {
    const minutes = Math.max(1, Math.floor((Date.now() - savedAt) / 60000));
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function useAutoSave<T>(
    key: string,
    data: T,
    options: UseAutoSaveOptions<T> = {},
) {
    const {
        enabled = true,
        contextLabel = "form",
        shouldSave,
        onRestore,
        onDiscard,
    } = options;
    const hasPromptedRef = useRef(false);

    const storageKey = useMemo(() => `draft:${key}`, [key]);

    useEffect(() => {
        if (hasPromptedRef.current) {
            return;
        }

        hasPromptedRef.current = true;
        const raw = safeGetItem(storageKey);
        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw) as StoredDraft<T>;
            const age = getRelativeTime(parsed.savedAt);

            Modal.confirm({
                title: "Resume draft?",
                content: `You have an unsaved ${contextLabel} from ${age} ago. Resume?`,
                okText: "Resume",
                cancelText: "Discard",
                onOk: () => {
                onRestore?.(parsed.data);
                },
                onCancel: () => {
                    safeRemoveItem(storageKey);
                    onDiscard?.();
                },
            });
        } catch {
            safeRemoveItem(storageKey);
        }
    }, [contextLabel, onDiscard, onRestore, storageKey]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const timer = window.setInterval(() => {
            if (shouldSave && !shouldSave(data)) {
                return;
            }

            const payload: StoredDraft<T> = {
                data,
                savedAt: Date.now(),
            };
            safeSetItem(storageKey, JSON.stringify(payload));
        }, AUTO_SAVE_INTERVAL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, [data, enabled, shouldSave, storageKey]);

    const clearDraft = () => {
        safeRemoveItem(storageKey);
    };

    return {
        clearDraft,
    };
}
