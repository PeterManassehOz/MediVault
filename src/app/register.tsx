
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      Alert.alert(
        "Missing information",
        "Enter your name, email address, and password.",
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least eight characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Enter the same password in both password fields.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await register({
        name: normalizedName,
        email: normalizedEmail,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });

      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to create your account. Check your connection and try again.";

      Alert.alert("Registration failed", message);
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
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.subtitle}>
            Set up your secure space for managing personal health records.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#8A8FA3"
              autoCapitalize="words"
              autoComplete="name"
              editable={!isSubmitting}
            />

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
            />

            <Text style={styles.label}>Phone number (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              placeholderTextColor="#8A8FA3"
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#8A8FA3"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter your password again"
              placeholderTextColor="#8A8FA3"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!isSubmitting}
              onSubmitEditing={() => void handleRegister()}
              returnKeyType="go"
            />

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={() => void handleRegister()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Create account
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>
            <Pressable
              onPress={() => router.replace("/login")}
              disabled={isSubmitting}
            >
              <Text style={styles.link}>Sign in</Text>
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
    paddingVertical: 32,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D2F82",
    marginBottom: 12,
  },
  brandInitial: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  brand: {
    color: "#2D2F82",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 26,
  },
  heading: {
    color: "#1E1E57",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 9,
  },
  subtitle: {
    color: "#666B80",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  form: {
    gap: 9,
  },
  label: {
    color: "#282A45",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: "#E0E3ED",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    color: "#20213E",
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 53,
    borderRadius: 13,
    backgroundColor: "#2D2F82",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
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
    marginTop: 23,
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
