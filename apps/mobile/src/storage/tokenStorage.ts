import * as SecureStore from "expo-secure-store";
import {REFRESH_COOKIE_NAME} from "@/config";

const ACCESS_KEY = "d2c_access_token";
const REFRESH_KEY = "d2c_refresh_token";
const USER_KEY = "d2c_user";

export type StoredUser = {id: number; email: string};

export async function getStoredUser(): Promise<StoredUser | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredUser;
    } catch {
        return null;
    }
}

export async function setStoredUser(user: StoredUser): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setTokens(accessToken: string, refreshToken?: string | null): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    }
}

export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
}

/** 从 Set-Cookie 响应头解析 refresh token（RN 不自动存 Cookie） */
export function parseRefreshFromSetCookie(
    setCookie: string | string[] | null | undefined
): string | null {
    if (!setCookie) return null;
    const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const block of parts) {
        const re = new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`);
        const m = block.match(re);
        if (m?.[1]) return m[1];
    }
    return null;
}

export function refreshCookieHeader(refreshToken: string): string {
    return `${REFRESH_COOKIE_NAME}=${refreshToken}`;
}
