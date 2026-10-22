
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert(
        "Missing information",
        "Enter your email address and password.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await login({
        email: normalizedEmail,
        password,
      });

      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to sign in. Check your connection and try again.";

      Alert.alert("Sign-in failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandMark}>
            <Text style={styles.brandInitial}>M</Text>
          </View>

          <Text style={styles.brand}>MediVault</Text>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your personal health records.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#8A8FA3"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isSubmitting}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8A8FA3"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!isSubmitting}
              onSubmitEditing={() => void handleLogin()}
              returnKeyType="go"
            />

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={() => void handleLogin()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account?
            </Text>
            <Pressable
              onPress={() => router.push("/register")}
              disabled={isSubmitting}
            >
              <Text style={styles.link}>Create account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 40,
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D2F82",
    marginBottom: 14,
  },
  brandInitial: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
  },
  brand: {
    color: "#2D2F82",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 36,
  },
  heading: {
    color: "#1E1E57",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "#666B80",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 30,
  },
  form: {
    gap: 10,
  },
  label: {
    color: "#282A45",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#E0E3ED",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    color: "#20213E",
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: "#2D2F82",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 26,
  },
  footerText: {
    color: "#666B80",
    fontSize: 14,
  },
  link: {
    color: "#2D2F82",
    fontWeight: "800",
    fontSize: 14,
  },
});
