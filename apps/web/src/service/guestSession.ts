import {apiBase} from "@/service/authRefresh.ts";
import {applyAuthSession, clearAuth, getAccessToken, type StoredAuthUser} from "@/service/token.ts";

export type AuthSessionResult = {
    accessToken: string;
    user: StoredAuthUser;
};

/** POST /api/auth/guest — 不经过 axios 拦截器，避免循环 refresh */
export async function startGuestSession(): Promise<AuthSessionResult> {
    const res = await fetch(`${apiBase()}/api/auth/guest`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `访客会话失败 (${res.status})`);
    }
    const data = (await res.json()) as {
        accessToken: string;
        user: {id: number; email: string};
        guest?: boolean;
    };
    if (!data.accessToken || !data.user) {
        throw new Error("访客会话响应不完整");
    }
    const user: StoredAuthUser = {
        id: data.user.id,
        email: data.user.email,
        guest: data.guest ?? true,
    };
    applyAuthSession(data.accessToken, user);
    return {accessToken: data.accessToken, user};
}

/** 无 token 时创建访客；已有 token 则跳过 */
export async function ensureGuestSession(): Promise<void> {
    if (getAccessToken()) return;
    await startGuestSession();
}

/** C 端退出：清登录态并重新建立访客会话（不跳转登录页） */
export async function resetToGuestSession(): Promise<void> {
    clearAuth();
    try {
        await fetch(`${apiBase()}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch {
        /* 忽略 logout 失败，仍尝试 guest */
    }
    await startGuestSession();
}
