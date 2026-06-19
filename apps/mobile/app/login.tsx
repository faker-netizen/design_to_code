import {useState} from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {Redirect} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {useAuth} from "@/auth/AuthContext";
import {LoadingView} from "@/components/EmptyState";
import {colors, spacing} from "@/theme/tokens";

export default function LoginScreen() {
    const {user, loading, signIn} = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (loading) return <LoadingView />;
    if (user) return <Redirect href="/(tabs)/chat" />;

    const onSubmit = async () => {
        setError(null);
        if (!email.trim() || !password) {
            setError("请输入邮箱和密码");
            return;
        }
        setSubmitting(true);
        try {
            await signIn(email.trim(), password);
        } catch (e) {
            setError(e instanceof Error ? e.message : "登录失败");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.wrap}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>文档 AI</Text>
                    <Text style={styles.subtitle}>登录以继续</Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="邮箱"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        editable={!submitting}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="密码"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!submitting}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <Pressable
                        style={[styles.btn, submitting && styles.btnDisabled]}
                        onPress={() => void onSubmit()}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>登录</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.bg},
    wrap: {flex: 1, justifyContent: "center", padding: spacing.lg},
    header: {marginBottom: spacing.lg},
    title: {fontSize: 32, fontWeight: "700", color: colors.text},
    subtitle: {fontSize: 16, color: colors.textMuted, marginTop: spacing.sm},
    form: {gap: spacing.md},
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        fontSize: 16,
    },
    error: {color: colors.danger, fontSize: 14},
    btn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    btnDisabled: {opacity: 0.7},
    btnText: {color: "#fff", fontSize: 17, fontWeight: "600"},
});
