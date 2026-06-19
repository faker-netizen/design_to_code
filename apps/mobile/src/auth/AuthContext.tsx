import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {login as loginApi, type AuthUser} from "@/api/auth";
import {logoutApi} from "@/api/client";
import {getAccessToken, getStoredUser} from "@/storage/tokenStorage";

type AuthState = {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const token = await getAccessToken();
            if (!token) {
                setUser(null);
            } else {
                setUser((await getStoredUser()) ?? {id: 0, email: ""});
            }
            setLoading(false);
        })();
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const result = await loginApi(email, password);
        setUser(result.user);
    }, []);

    const signOut = useCallback(async () => {
        await logoutApi();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({user, loading, signIn, signOut}),
        [user, loading, signIn, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
