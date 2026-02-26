export type AuthTokenResult = {
    token: string;
    expires_at: number;
};

export type CreateUserPayload = {
    username: string;
    password: string;
    role: "admin" | "operator";
    auth_token?: string;
};

type SessionExpiredDetail = {
    message?: string;
};

type AppBinding = {
    Login?: (username: string, password: string) => Promise<AuthTokenResult>;
    GetSessionRole?: (authToken: string) => Promise<string>;
    CreateUser?: (input: {
        auth_token?: string;
        username: string;
        password: string;
        role: string;
    }) => Promise<void>;
};

const STORAGE_KEYS = [
    "auth_token",
    "token",
    "auth_expires_at",
    "username",
    "user_name",
];

export const AUTH_SESSION_EXPIRED_EVENT = "masala:auth-session-expired";

function getBinding(): AppBinding {
    return ((window as unknown as { go?: { app?: { App?: AppBinding } } }).go?.app?.App) || {};
}

export function resolveAuthToken(): string | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }
    try {
        return (
            window.localStorage.getItem("auth_token")
            || window.localStorage.getItem("token")
            || window.sessionStorage.getItem("auth_token")
            || window.sessionStorage.getItem("token")
            || undefined
        );
    } catch {
        return undefined;
    }
}

export function resolveAuthExpiry(): number | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }
    try {
        const raw = window.localStorage.getItem("auth_expires_at")
            || window.sessionStorage.getItem("auth_expires_at");
        if (!raw) {
            return undefined;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return undefined;
        }
        return parsed;
    } catch {
        return undefined;
    }
}

export function saveAuthSession(token: string, username: string, expiresAt: number): void {
    if (typeof window === "undefined") {
        return;
    }
    clearAuthSession();
    window.localStorage.setItem("auth_token", token);
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("username", username);
    window.localStorage.setItem("user_name", username);
    window.localStorage.setItem("auth_expires_at", String(expiresAt));
}

export function clearAuthSession(): void {
    if (typeof window === "undefined") {
        return;
    }
    for (const key of STORAGE_KEYS) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
    }
}

export function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
        const withMessage = error as { message?: string };
        if (withMessage.message) {
            return withMessage.message;
        }
    }
    return "Request failed";
}

export function isSessionAuthError(error: unknown): boolean {
    const message = extractErrorMessage(error).toLowerCase();
    return message.includes("unauthorized")
        || message.includes("forbidden")
        || message.includes("invalid token")
        || message.includes("token is expired")
        || message.includes("token has expired")
        || message.includes("expired");
}

export function notifyAuthSessionExpired(message?: string): void {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(new CustomEvent<SessionExpiredDetail>(AUTH_SESSION_EXPIRED_EVENT, {
        detail: { message },
    }));
}

export async function login(username: string, password: string): Promise<AuthTokenResult> {
    const fn = getBinding().Login;
    if (typeof fn !== "function") {
        throw new Error("Login binding is unavailable");
    }
    return fn(username, password);
}

export async function getSessionRole(authToken: string): Promise<string> {
    const fn = getBinding().GetSessionRole;
    if (typeof fn !== "function") {
        throw new Error("GetSessionRole binding is unavailable");
    }
    return fn(authToken);
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
    const fn = getBinding().CreateUser;
    if (typeof fn !== "function") {
        throw new Error("CreateUser binding is unavailable");
    }
    try {
        await fn({
            auth_token: payload.auth_token || resolveAuthToken(),
            username: payload.username,
            password: payload.password,
            role: payload.role,
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}
