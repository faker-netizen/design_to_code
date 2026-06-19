import {ActivityIndicator, Pressable, StyleSheet, Text, View} from "react-native";
import {colors, spacing} from "@/theme/tokens";

type Props = {
    title: string;
    message?: string;
    onRetry?: () => void;
};

export function EmptyState({title, message, onRetry}: Props) {
    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {onRetry ? (
                <Pressable style={styles.btn} onPress={onRetry}>
                    <Text style={styles.btnText}>重试</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function LoadingView() {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 17,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: "center",
        marginBottom: spacing.md,
    },
    btn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 8,
    },
    btnText: {
        color: "#fff",
        fontWeight: "600",
    },
});
