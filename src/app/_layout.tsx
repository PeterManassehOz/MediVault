import { useEffect } from "react";

import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
} from "expo-router";

import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";

import { HealthRecordsProvider } from "@/context/HealthRecordsContext";

import "../global.css";
import { useSegments } from "expo-router";

import { AuthProvider, useAuth } from "@/context/AuthContext";

void SplashScreen.preventAutoHideAsync();

const mediVaultTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: "#059669",
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#101828",
    border: "#E5E7EB",
    notification: "#059669",
  },
};



function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentRoute = segments[0];
    const isAuthRoute =
      currentRoute === "login" ||
      currentRoute === "register";

    if (!user && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (user && isAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  return null;
}


export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={mediVaultTheme}>
      <AuthProvider>
        <HealthRecordsProvider>
          <AuthGuard />
          <StatusBar style="dark" />
          <RootNavigator />
        </HealthRecordsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#101828",
        headerTitleStyle: {
          color: "#101828",
          fontSize: 18,
          fontWeight: "700",
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "default",
        contentStyle: {
          backgroundColor: "#F8FAFC",
        },
        animation: "default",
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerTitle: () => (
            <View className="justify-center">
              <Text className="text-lg font-extrabold tracking-tight text-[#101828]">
                MediVault
              </Text>

              <Text className="text-[10px] font-medium tracking-wide text-[#667085]">
                PERSONAL HEALTH VAULT
              </Text>
            </View>
          ),
          headerTitleAlign: "left",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile and settings"
              onPress={() => router.push("/profile")}
              className="mr-1 h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F8FAFC] active:bg-emerald-50"
              hitSlop={8}
            >
              <Ionicons
                name="person-outline"
                size={21}
                color="#344054"
              />
            </Pressable>
          ),
        }}
      />

      <Stack.Screen
        name="profile"
        options={{
          title: "Profile & Settings",
          presentation: "card",
        }}
      />

      <Stack.Screen
        name="records/[id]"
        options={{
          title: "Record details",
        }}
      />

      <Stack.Screen
        name="records/add"
        options={{
          title: "Add health record",
          presentation: "card",
        }}
      />

      <Stack.Screen
        name="login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="register"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}