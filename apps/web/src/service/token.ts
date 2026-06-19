const ACCESS_TOKEN_KEY = "accessToken";
const AUTH_USER_KEY = "authUser";

export type StoredAuthUser = {
    id: number;
    email: string;
    guest?: boolean;
};

export function getAccessToken(): string | null {
    try {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setAccessToken(token: string | null): void {
    try {
        if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
        else localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
        /* ignore quota / private mode */
    }
}

export function getAuthUser(): StoredAuthUser | null {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredAuthUser;
        if (!parsed?.id || !parsed.email) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function setAuthUser(user: StoredAuthUser | null): void {
    try {
        if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(AUTH_USER_KEY);
    } catch {
        /* ignore */
    }
}

export function isGuestSession(): boolean {
    const user = getAuthUser();
    if (user?.guest != null) return user.guest;
    return user?.email.toLowerCase().endsWith("@guest.local") ?? false;
}

export function clearAuth(): void {
    setAccessToken(null);
    setAuthUser(null);
}

export function applyAuthSession(accessToken: string, user: StoredAuthUser): void {
    setAccessToken(accessToken);
    setAuthUser(user);
}
