import {useCallback, useState} from "react";
import {FlatList, RefreshControl, StyleSheet, Text, View} from "react-native";
import {useFocusEffect, useLocalSearchParams} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {ApiError} from "@/api/client";
import {listDocuments, type KnowledgeBaseDocument} from "@/api/knowledgeBase";
import {EmptyState, LoadingView} from "@/components/EmptyState";
import {colors, spacing} from "@/theme/tokens";

function statusLabel(doc: KnowledgeBaseDocument): string {
    if (doc.indexing_status !== "done") return `索引：${doc.indexing_status}`;
    if (doc.summary_status !== "done") return `摘要：${doc.summary_status}`;
    return "就绪";
}

export default function KnowledgeDocumentsScreen() {
    const {kbId} = useLocalSearchParams<{kbId: string}>();
    const id = Number(kbId);
    const [docs, setDocs] = useState<KnowledgeBaseDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!id || Number.isNaN(id)) return;
        if (!silent) setLoading(true);
        setError(null);
        try {
            setDocs(await listDocuments(id));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "加载文档失败");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            void load(true);
        }, [load])
    );

    if (loading && docs.length === 0 && !error) return <LoadingView />;
    if (error && docs.length === 0) {
        return <EmptyState title="无法加载" message={error} onRetry={() => void load()} />;
    }

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            <FlatList
                data={docs}
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
                    <EmptyState
                        title="暂无文档"
                        message="请在 Web 端上传文档；移动端暂仅支持浏览"
                    />
                }
                contentContainerStyle={docs.length === 0 ? styles.emptyList : styles.list}
                renderItem={({item}) => (
                    <View style={styles.row}>
                        <Text style={styles.title} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text style={styles.meta}>{statusLabel(item)}</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.bg},
    list: {padding: spacing.md},
    emptyList: {flexGrow: 1},
    row: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    title: {fontSize: 16, fontWeight: "600", color: colors.text},
    meta: {fontSize: 13, color: colors.textMuted, marginTop: 6},
});
