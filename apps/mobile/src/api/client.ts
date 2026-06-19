import {apiBaseUrl} from "@/config";
import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    parseRefreshFromSetCookie,
    refreshCookieHeader,
    setTokens,
} from "@/storage/tokenStorage";

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

type JsonRequestInit = Omit<RequestInit, "body"> & {
    body?: unknown;
    auth?: boolean;
};

async function parseError(res: Response): Promise<string> {
    const text = await res.text().catch(() => "");
    if (!text) return `请求失败(${res.status})`;
    try {
        const j = JSON.parse(text) as {error?: string; message?: string};
        return j.error || j.message || text;
    } catch {
        return text;
    }
}

async function refreshAccessToken(): Promise<boolean> {
    const refresh = await getRefreshToken();
    if (!refresh) return false;

    const res = await fetch(`${apiBaseUrl()}/api/auth/refresh`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-D2C-Client": "mobile",
            Cookie: refreshCookieHeader(refresh),
        },
    });
    if (!res.ok) return false;

    const data = (await res.json()) as {accessToken?: string; refreshToken?: string};
    if (!data.accessToken) return false;

    const setCookie = res.headers.get("set-cookie");
    const newRefresh =
        data.refreshToken ?? parseRefreshFromSetCookie(setCookie) ?? refresh;
    await setTokens(data.accessToken, newRefresh);
    return true;
}

export async function apiFetch<T>(path: string, init: JsonRequestInit = {}): Promise<T> {
    const run = async (retried: boolean): Promise<T> => {
        const headers: Record<string, string> = {
            Accept: "application/json",
            ...(init.headers as Record<string, string> | undefined),
        };

        if (init.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        if (init.auth !== false) {
            const token = await getAccessToken();
            if (token) headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBaseUrl()}${path}`, {
            ...init,
            headers,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        });

        if (res.status === 401 && init.auth !== false && !retried) {
            const ok = await refreshAccessToken();
            if (ok) return run(true);
        }

        if (!res.ok) {
            throw new ApiError(await parseError(res), res.status);
        }

        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
    };

    return run(false);
}

export async function logoutApi(): Promise<void> {
    const refresh = await getRefreshToken();
    try {
        await fetch(`${apiBaseUrl()}/api/auth/logout`, {
            method: "POST",
            headers: refresh
                ? {"Content-Type": "application/json", Cookie: refreshCookieHeader(refresh)}
                : {"Content-Type": "application/json"},
        });
    } finally {
        await clearTokens();
    }
}

export {refreshAccessToken, getAccessToken};
