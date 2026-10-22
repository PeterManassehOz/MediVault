
import * as SecureStore from "expo-secure-store";

export const AUTH_TOKEN_KEY = "medivault_auth_token";

export async function getAuthToken(
  key: string = AUTH_TOKEN_KEY,
): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function saveAuthToken(
  token: string,
  key: string = AUTH_TOKEN_KEY,
): Promise<void> {
  await SecureStore.setItemAsync(key, token);
}

export async function removeAuthToken(
  key: string = AUTH_TOKEN_KEY,
): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
