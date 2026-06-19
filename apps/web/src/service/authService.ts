import http from "@/service/request.ts";
import {applyAuthSession, type StoredAuthUser} from "@/service/token.ts";

export type AuthUserDto = { id: number; email: string };

export type LoginResult = {
    success: boolean;
    accessToken: string;
    user: AuthUserDto;
    guest?: boolean;
};

export type RegisterResult = LoginResult;

function persistSession(data: LoginResult): LoginResult {
    applyAuthSession(data.accessToken, {
        id: data.user.id,
        email: data.user.email,
        guest: data.guest ?? false,
    });
    return data;
}

/** POST /api/auth/login — 与 apps/backend 一致，Set-Cookie 由浏览器处理 */
export function login(email: string, password: string): Promise<LoginResult> {
    return http
        .post<LoginResult, { email: string; password: string }>("/api/auth/login", {
            email,
            password,
        })
        .then(persistSession);
}

/** POST /api/auth/register */
export function register(email: string, password: string): Promise<RegisterResult> {
    return http
        .post<RegisterResult, { email: string; password: string }>("/api/auth/register", {
            email,
            password,
        })
        .then((data) => persistSession({...data, guest: false}));
}

/** POST /api/auth/logout — 撤销 refresh cookie */
export function logout(): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>("/api/auth/logout", {});
}
