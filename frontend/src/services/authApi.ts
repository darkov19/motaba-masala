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

export type UserAccount = {
    id: string;
    username: string;
    role: "Admin" | "DataEntryOperator";
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type UpdateUserRolePayload = {
    username: string;
    role: "admin" | "operator";
    auth_token?: string;
};

export type SetUserActivePayload = {
    username: string;
    is_active: boolean;
    auth_token?: string;
};

export type ResetUserPasswordPayload = {
    username: string;
    new_password: string;
    auth_token?: string;
};

export type DeleteUserPayload = {
    username: string;
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
    ListUsers?: (input: {
        auth_token?: string;
    }) => Promise<UserAccount[]>;
    UpdateUserRole?: (input: {
        auth_token?: string;
        username: string;
        role: string;
    }) => Promise<void>;
    SetUserActive?: (input: {
        auth_token?: string;
        username: string;
        is_active: boolean;
    }) => Promise<void>;
    ResetUserPassword?: (input: {
        auth_token?: string;
        username: string;
        new_password: string;
    }) => Promise<void>;
    DeleteUser?: (input: {
        auth_token?: string;
        username: string;
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
    if (typeof error === "string" && error.trim().length > 0) {
        return error;
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

export async function listUsers(): Promise<UserAccount[]> {
    const fn = getBinding().ListUsers;
    if (typeof fn !== "function") {
        return [];
    }
    try {
        return await fn({
            auth_token: resolveAuthToken(),
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}

export async function updateUserRole(payload: UpdateUserRolePayload): Promise<void> {
    const fn = getBinding().UpdateUserRole;
    if (typeof fn !== "function") {
        throw new Error("UpdateUserRole binding is unavailable");
    }
    try {
        await fn({
            auth_token: payload.auth_token || resolveAuthToken(),
            username: payload.username,
            role: payload.role,
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}

export async function setUserActive(payload: SetUserActivePayload): Promise<void> {
    const fn = getBinding().SetUserActive;
    if (typeof fn !== "function") {
        throw new Error("SetUserActive binding is unavailable");
    }
    try {
        await fn({
            auth_token: payload.auth_token || resolveAuthToken(),
            username: payload.username,
            is_active: payload.is_active,
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}

export async function resetUserPassword(payload: ResetUserPasswordPayload): Promise<void> {
    const fn = getBinding().ResetUserPassword;
    if (typeof fn !== "function") {
        throw new Error("ResetUserPassword binding is unavailable");
    }
    try {
        await fn({
            auth_token: payload.auth_token || resolveAuthToken(),
            username: payload.username,
            new_password: payload.new_password,
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}

export async function deleteUser(payload: DeleteUserPayload): Promise<void> {
    const fn = getBinding().DeleteUser;
    if (typeof fn !== "function") {
        throw new Error("DeleteUser binding is unavailable");
    }
    try {
        await fn({
            auth_token: payload.auth_token || resolveAuthToken(),
            username: payload.username,
        });
    } catch (error) {
        if (isSessionAuthError(error)) {
            notifyAuthSessionExpired("Your session is no longer valid. Please sign in again.");
        }
        throw error;
    }
}
