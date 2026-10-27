
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const AUTH_TOKEN_KEY = "medivault_auth_token";

export async function getAuthToken(
  key: string = AUTH_TOKEN_KEY,
): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage.getItem(key);
    } catch (error) {
      console.error(
        "Failed to read authentication token from browser storage:",
        error,
      );

      return null;
    }
  }

  return SecureStore.getItemAsync(key);
}

export async function saveAuthToken(
  token: string,
  key: string = AUTH_TOKEN_KEY,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage.setItem(key, token);
      return;
    } catch (error) {
      console.error(
        "Failed to save authentication token to browser storage:",
        error,
      );

      throw new Error(
        "Unable to save your session. Please check your browser storage settings.",
      );
    }
  }

  await SecureStore.setItemAsync(key, token);
}

export async function removeAuthToken(
  key: string = AUTH_TOKEN_KEY,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage.removeItem(key);
      return;
    } catch (error) {
      console.error(
        "Failed to remove authentication token from browser storage:",
        error,
      );

      throw new Error(
        "Unable to clear your browser session.",
      );
    }
  }

  await SecureStore.deleteItemAsync(key);
}
