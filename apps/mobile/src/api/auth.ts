import {apiBaseUrl} from "@/config";
import {parseRefreshFromSetCookie, setStoredUser, setTokens} from "@/storage/tokenStorage";

export type AuthUser = {id: number; email: string};

export type LoginResult = {
    success: boolean;
    accessToken: string;
    user: AuthUser;
};

const MOBILE_CLIENT_HEADER = {"X-D2C-Client": "mobile"};

export async function login(email: string, password: string): Promise<LoginResult> {
    const res = await fetch(`${apiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...MOBILE_CLIENT_HEADER,
        },
        body: JSON.stringify({email, password}),
    });

    const data = (await res.json()) as LoginResult & {
        error?: string;
        refreshToken?: string;
    };

    if (!res.ok) {
        throw new Error(data.error ?? "登录失败");
    }

    const refresh =
        data.refreshToken ?? parseRefreshFromSetCookie(res.headers.get("set-cookie"));
    await setTokens(data.accessToken, refresh);
    await setStoredUser(data.user);
    return data;
}
