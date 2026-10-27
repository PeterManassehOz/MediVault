
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppLock } from "@/context/AppLockContext";
import { useAuth } from "@/context/AuthContext";

export default function AppLockScreen() {
  const {
    isReady,
    isLocked,
    isAuthenticating,
    unlockError,
    authenticateToUnlock,
    disableBiometricUnlock,
  } = useAppLock();

  const { logout } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);

  async function performRecoverySignOut() {
    try {
      setIsSigningOut(true);

      // Remove the biometric requirement before ending the
      // session so the user can sign in again if necessary.
      await disableBiometricUnlock();
      await logout();
    } catch {
      Alert.alert(
        "Sign-out failed",
        "Your session could not be cleared. Please try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function confirmRecoverySignOut() {
    Alert.alert(
      "Sign out of MediVault?",
      "This will disable biometric unlock on this device and end your current session.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void performRecoverySignOut();
          },
        },
      ],
    );
  }

  if (isReady && !isLocked) {
    return null;
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 9999,
          elevation: 9999,
        },
      ]}
      className="flex-1 items-center justify-center bg-[#F8FAFC] px-7"
    >
      <View className="w-full max-w-sm items-center rounded-3xl border border-[#E5E7EB] bg-white px-6 py-9">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50">
          <Ionicons
            name="finger-print"
            size={46}
            color="#047857"
          />
        </View>

        <Text className="mt-6 text-2xl font-extrabold text-[#101828]">
          {isReady ? "MediVault is locked" : "Securing your vault"}
        </Text>

        <Text className="mt-3 text-center text-sm leading-6 text-[#667085]">
          {isReady
            ? "Verify your identity to access your personal health records."
            : "Please wait while MediVault restores your security settings."}
        </Text>

        {!isReady ? (
          <ActivityIndicator
            size="large"
            color="#047857"
            style={{ marginTop: 28 }}
          />
        ) : (
          <>
            {unlockError ? (
              <Text
                accessibilityRole="alert"
                className="mt-5 text-center text-sm leading-5 text-red-700"
              >
                {unlockError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unlock MediVault with biometrics"
              disabled={isAuthenticating || isSigningOut}
              onPress={() => {
                void authenticateToUnlock();
              }}
              className="mt-7 w-full flex-row items-center justify-center rounded-xl bg-emerald-700 px-5 py-4 active:bg-emerald-800"
              style={{
                opacity: isAuthenticating || isSigningOut ? 0.65 : 1,
              }}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="finger-print"
                  size={21}
                  color="#FFFFFF"
                />
              )}

              <Text className="ml-2 text-sm font-bold text-white">
                {isAuthenticating
                  ? "Verifying identity..."
                  : "Unlock with biometrics"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isAuthenticating || isSigningOut}
              onPress={confirmRecoverySignOut}
              className="mt-5 rounded-lg px-4 py-3 active:bg-gray-50"
            >
              <Text className="text-sm font-semibold text-[#667085]">
                {isSigningOut
                  ? "Signing out..."
                  : "Sign out instead"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Text className="mt-6 text-center text-xs leading-5 text-[#98A2B3]">
        Your health records remain protected until verification succeeds.
      </Text>
    </View>
  );
}
