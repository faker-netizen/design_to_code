import {Redirect, Tabs} from "expo-router";
import {useAuth} from "@/auth/AuthContext";
import {LoadingView} from "@/components/EmptyState";
import {colors} from "@/theme/tokens";

export default function TabsLayout() {
    const {user, loading} = useAuth();

    if (loading) return <LoadingView />;
    if (!user) return <Redirect href="/login" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
            }}
        >
            <Tabs.Screen name="chat" options={{title: "对话", headerShown: false}} />
            <Tabs.Screen name="knowledge" options={{title: "知识库", headerShown: false}} />
        </Tabs>
    );
}
