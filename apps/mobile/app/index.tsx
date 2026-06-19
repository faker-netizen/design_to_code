import {Redirect} from "expo-router";
import {LoadingView} from "@/components/EmptyState";
import {useAuth} from "@/auth/AuthContext";

export default function Index() {
    const {user, loading} = useAuth();

    if (loading) return <LoadingView />;
    if (!user) return <Redirect href="/login" />;
    return <Redirect href="/(tabs)/chat" />;
}
