import {Stack, useRouter} from "expo-router";
import {Pressable, Text} from "react-native";
import {useAuth} from "@/auth/AuthContext";
import {colors} from "@/theme/tokens";

function SignOutButton() {
    const {signOut} = useAuth();
    const router = useRouter();
    return (
        <Pressable
            onPress={() => {
                void signOut().then(() => router.replace("/login"));
            }}
            style={{marginRight: 12}}
        >
            <Text style={{color: colors.primary, fontWeight: "600"}}>退出</Text>
        </Pressable>
    );
}

export default function KnowledgeStackLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {backgroundColor: colors.surface},
                headerTintColor: colors.text,
                headerShadowVisible: false,
                headerRight: () => <SignOutButton />,
            }}
        >
            <Stack.Screen name="index" options={{title: "知识库"}} />
            <Stack.Screen name="[kbId]" options={{title: "文档"}} />
        </Stack>
    );
}
