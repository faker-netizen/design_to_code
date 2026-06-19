import {useCallback, useState} from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {useFocusEffect, useRouter} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {ApiError} from "@/api/client";
import {createChatSession, listChatSessions, type ChatSession} from "@/api/chat";
import {EmptyState, LoadingView} from "@/components/EmptyState";
import {colors, spacing} from "@/theme/tokens";

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {month: "short", day: "numeric"});
}

export default function ChatSessionsScreen() {
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const list = await listChatSessions();
            setSessions(list);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : "加载会话失败";
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void load(true);
        }, [load])
    );

    const onCreate = async () => {
        setCreating(true);
        setError(null);
        try {
            const id = await createChatSession();
            router.push(`/(tabs)/chat/${id}`);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "创建会话失败");
        } finally {
            setCreating(false);
        }
    };

    if (loading && sessions.length === 0 && !error) return <LoadingView />;

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            {error && sessions.length === 0 ? (
                <EmptyState title="无法加载" message={error} onRetry={() => void load()} />
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => String(item.id)}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => {
                            setRefreshing(true);
                            void load(true);
                        }} />
                    }
                    ListEmptyComponent={
                        <EmptyState title="暂无对话" message="点击右上角新建会话" />
                    }
                    contentContainerStyle={sessions.length === 0 ? styles.emptyList : undefined}
                    renderItem={({item}) => (
                        <Pressable
                            style={styles.row}
                            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
                        >
                            <Text style={styles.rowTitle} numberOfLines={1}>
                                {item.title || "新对话"}
                            </Text>
                            <Text style={styles.rowMeta}>{formatTime(item.updated_at)}</Text>
                        </Pressable>
                    )}
                />
            )}
            <View style={styles.footer}>
                <Pressable
                    style={[styles.createBtn, creating && styles.createBtnDisabled]}
                    onPress={() => void onCreate()}
                    disabled={creating}
                >
                    <Text style={styles.createBtnText}>{creating ? "创建中…" : "新建对话"}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.bg},
    emptyList: {flexGrow: 1},
    row: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rowTitle: {fontSize: 16, fontWeight: "600", color: colors.text},
    rowMeta: {fontSize: 13, color: colors.textMuted, marginTop: 4},
    footer: {padding: spacing.md},
    createBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    createBtnDisabled: {opacity: 0.7},
    createBtnText: {color: "#fff", fontWeight: "600", fontSize: 16},
});
