import {useCallback, useEffect, useRef, useState} from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {useLocalSearchParams} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {ApiError} from "@/api/client";
import {
    listChatMessages,
    streamChatMessage,
    type ChatMessage,
} from "@/api/chat";
import {EmptyState, LoadingView} from "@/components/EmptyState";
import {colors, spacing} from "@/theme/tokens";

type Row =
    | ChatMessage
    | {id: string; role: "user" | "assistant"; content: string; streaming?: boolean};

export default function ChatConversationScreen() {
    const {sessionId} = useLocalSearchParams<{sessionId: string}>();
    const sid = Number(sessionId);
    const [messages, setMessages] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [streamText, setStreamText] = useState("");
    const abortRef = useRef<AbortController | null>(null);
    const listRef = useRef<FlatList<Row>>(null);

    const load = useCallback(async () => {
        if (!sid || Number.isNaN(sid)) return;
        setLoading(true);
        setError(null);
        try {
            const list = await listChatMessages(sid);
            setMessages(list);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "加载消息失败");
        } finally {
            setLoading(false);
        }
    }, [sid]);

    useEffect(() => {
        void load();
        return () => abortRef.current?.abort();
    }, [load]);

    const scrollToEnd = () => {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({animated: true}));
    };

    const onSend = async () => {
        const text = input.trim();
        if (!text || sending || !sid) return;

        setInput("");
        setSending(true);
        setStreamText("");
        setError(null);

        const userMsg: Row = {
            id: `u-${Date.now()}`,
            role: "user",
            content: text,
        };
        setMessages((prev) => [...prev, userMsg]);
        scrollToEnd();

        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            {id: assistantId, role: "assistant", content: "", streaming: true},
        ]);

        const controller = new AbortController();
        abortRef.current = controller;
        let accumulated = "";

        try {
            await streamChatMessage(
                sid,
                text,
                {
                    onToken: (chunk) => {
                        accumulated += chunk;
                        setStreamText(accumulated);
                        scrollToEnd();
                    },
                    onDone: (answer) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId
                                    ? {...m, content: answer, streaming: false}
                                    : m
                            )
                        );
                        setStreamText("");
                    },
                    onError: (msg) => setError(msg),
                },
                controller.signal
            );
        } catch (e) {
            if (!(e instanceof Error && e.name === "AbortError")) {
                setError(e instanceof ApiError ? e.message : "发送失败");
            }
        } finally {
            setSending(false);
            abortRef.current = null;
            void load();
        }
    };

    if (loading) return <LoadingView />;
    if (error && messages.length === 0) {
        return <EmptyState title="无法加载" message={error} onRetry={() => void load()} />;
    }

    const displayMessages: Row[] = messages.map((m) => {
        const last = messages[messages.length - 1];
        if (
            last &&
            m.id === last.id &&
            m.role === "assistant" &&
            "streaming" in m &&
            m.streaming
        ) {
            return {...m, content: streamText || m.content};
        }
        return m;
    });

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={88}
            >
                <FlatList
                    ref={listRef}
                    data={displayMessages}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={scrollToEnd}
                    renderItem={({item}) => {
                        const isUser = item.role === "user";
                        return (
                            <View
                                style={[
                                    styles.bubbleWrap,
                                    isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.bubble,
                                        isUser ? styles.bubbleUser : styles.bubbleAssistant,
                                    ]}
                                >
                                    <Text style={isUser ? styles.textUser : styles.textAssistant}>
                                        {item.content ||
                                            ("streaming" in item && item.streaming ? "…" : "")}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.composer}>
                    <TextInput
                        style={styles.input}
                        placeholder="输入消息…"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        editable={!sending}
                    />
                    <Pressable
                        style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
                        onPress={() => void onSend()}
                        disabled={!input.trim() || sending}
                    >
                        <Text style={styles.sendText}>{sending ? "…" : "发送"}</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.bg},
    flex: {flex: 1},
    list: {padding: spacing.md, paddingBottom: spacing.sm},
    bubbleWrap: {marginBottom: spacing.sm, flexDirection: "row"},
    bubbleWrapUser: {justifyContent: "flex-end"},
    bubbleWrapAssistant: {justifyContent: "flex-start"},
    bubble: {
        maxWidth: "82%",
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
    },
    bubbleUser: {backgroundColor: colors.userBubble},
    bubbleAssistant: {backgroundColor: colors.assistantBubble},
    textUser: {color: "#fff", fontSize: 16, lineHeight: 22},
    textAssistant: {color: colors.text, fontSize: 16, lineHeight: 22},
    error: {
        color: colors.danger,
        fontSize: 13,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xs,
    },
    composer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: colors.bg,
    },
    sendBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
    },
    sendDisabled: {opacity: 0.5},
    sendText: {color: "#fff", fontWeight: "600"},
});
