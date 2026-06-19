/** API 根地址。真机调试填 ECS 公网 IP 或域名，如 http://47.x.x.x */
export function apiBaseUrl(): string {
    const url = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (url) return url.replace(/\/$/, "");
    return "http://localhost:3001";
}

export const REFRESH_COOKIE_NAME = "refresh_token";
