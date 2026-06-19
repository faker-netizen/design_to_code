import {useCallback, useState} from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {useFocusEffect, useRouter} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {ApiError} from "@/api/client";
import {createKnowledgeBase, listKnowledgeBases, type KnowledgeBase} from "@/api/knowledgeBase";
import {EmptyState, LoadingView} from "@/components/EmptyState";
import {colors, spacing} from "@/theme/tokens";

export default function KnowledgeListScreen() {
    const router = useRouter();
    const [items, setItems] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            setItems(await listKnowledgeBases());
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "加载知识库失败");
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
        const trimmed = name.trim();
        if (!trimmed) {
            setError("请输入知识库名称");
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const id = await createKnowledgeBase(trimmed);
            setName("");
            router.push(`/(tabs)/knowledge/${id}`);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "创建失败");
        } finally {
            setCreating(false);
        }
    };

    if (loading && items.length === 0 && !error) return <LoadingView />;

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            {error && items.length === 0 ? (
                <EmptyState title="无法加载" message={error} onRetry={() => void load()} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => String(item.id)}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void load(true);
                            }}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState title="暂无知识库" message="在下方创建第一个知识库" />
                    }
                    contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
                    renderItem={({item}) => (
                        <Pressable
                            style={styles.row}
                            onPress={() => router.push(`/(tabs)/knowledge/${item.id}`)}
                        >
                            <Text style={styles.rowTitle}>{item.name}</Text>
                            {item.description ? (
                                <Text style={styles.rowDesc} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            ) : null}
                        </Pressable>
                    )}
                />
            )}

            <View style={styles.footer}>
                {error && items.length > 0 ? (
                    <Text style={styles.inlineError}>{error}</Text>
                ) : null}
                <TextInput
                    style={styles.input}
                    placeholder="新知识库名称"
                    value={name}
                    onChangeText={setName}
                    editable={!creating}
                />
                <Pressable
                    style={[styles.createBtn, creating && styles.createBtnDisabled]}
                    onPress={() => void onCreate()}
                    disabled={creating}
                >
                    <Text style={styles.createBtnText}>{creating ? "创建中…" : "创建知识库"}</Text>
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
    rowDesc: {fontSize: 14, color: colors.textMuted, marginTop: 4},
    footer: {padding: spacing.md, gap: spacing.sm},
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        fontSize: 16,
    },
    inlineError: {color: colors.danger, fontSize: 13},
    createBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    createBtnDisabled: {opacity: 0.7},
    createBtnText: {color: "#fff", fontWeight: "600", fontSize: 16},
});
