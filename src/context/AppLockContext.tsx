
import {
  AppState,
  Platform,
} from "react-native";

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearAttachmentAccessCache,
} from "@/utils/attachmentAccessCache";
import { useAuth } from "@/context/AuthContext";

const BIOMETRIC_ENABLED_KEY =
  "medivault_biometric_unlock_enabled";

const BACKGROUND_LOCK_TIMEOUT = 30_000;

type AppLockContextValue = {
  isReady: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  isAuthenticating: boolean;
  unlockError: string | null;
  enableBiometricUnlock: () => Promise<void>;
  disableBiometricUnlock: () => Promise<void>;
  authenticateToUnlock: () => Promise<boolean>;
  lockNow: () => void;
};

const AppLockContext =
  createContext<AppLockContextValue | undefined>(undefined);

type AppLockProviderProps = {
  children: ReactNode;
};

function getBiometricErrorMessage(error?: string): string {
  switch (error) {
    case "user_cancel":
      return "Verification was cancelled. Your vault remains locked.";
    case "lockout":
      return "Biometric authentication is temporarily locked. Unlock your device and try again.";
    case "not_enrolled":
      return "No biometrics are enrolled on this device.";
    case "not_available":
      return "Biometric authentication is currently unavailable.";
    case "authentication_failed":
      return "Verification failed. Please try again.";
    default:
      return "Biometric verification could not be completed. Please try again.";
  }
}

export function AppLockProvider({
  children,
}: AppLockProviderProps) {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [isReady, setIsReady] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] =
    useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] =
    useState(false);
  const [unlockError, setUnlockError] =
    useState<string | null>(null);

  const hasLoadedPreference = useRef(false);
  const wasAuthenticated = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const autoPrompted = useRef(false);
  const authenticationInProgress = useRef(false);

  // Load the persisted biometric preference after auth restoration.
  useEffect(() => {
    if (isAuthLoading || hasLoadedPreference.current) {
      return;
    }

    let cancelled = false;

    async function loadPreference() {
      let enabled = false;

      try {
        if (Platform.OS !== "web") {
          enabled =
            (await SecureStore.getItemAsync(
              BIOMETRIC_ENABLED_KEY,
            )) === "true";
        }
      } catch (error) {
        console.error(
          "Unable to load biometric preference:",
          error,
        );
      }

      if (cancelled) {
        return;
      }

      setIsBiometricEnabled(enabled);
      setIsLocked(enabled && Boolean(user));
      wasAuthenticated.current = Boolean(user);
      hasLoadedPreference.current = true;
      setIsReady(true);
    }

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user]);

  // Require verification when an authenticated session starts
  // with biometric unlock enabled, including a subsequent login.
  useEffect(() => {
    if (!isReady || isAuthLoading) {
      return;
    }

    if (!user) {
      setIsLocked(false);
      setUnlockError(null);
      wasAuthenticated.current = false;
      backgroundedAt.current = null;
      return;
    }

    if (
      !wasAuthenticated.current &&
      isBiometricEnabled
    ) {
      setUnlockError(null);
      setIsLocked(true);
    }

    wasAuthenticated.current = true;
  }, [
    user,
    isAuthLoading,
    isReady,
    isBiometricEnabled,
  ]);

  const enableBiometricUnlock = useCallback(
    async (): Promise<void> => {
      if (Platform.OS === "web") {
        throw new Error(
          "Biometric unlock is available in the native mobile app, not the web version.",
        );
      }

      if (authenticationInProgress.current) {
        return;
      }

      authenticationInProgress.current = true;
      setIsAuthenticating(true);

      try {
        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        if (!hasHardware) {
          throw new Error(
            "This device does not support biometric authentication.",
          );
        }

        const isEnrolled =
          await LocalAuthentication.isEnrolledAsync();

        if (!isEnrolled) {
          throw new Error(
            "No fingerprints or other biometrics are enrolled. Enroll a biometric in your device settings first.",
          );
        }

        const supportedTypes =
          await LocalAuthentication
            .supportedAuthenticationTypesAsync();

        if (supportedTypes.length === 0) {
          throw new Error(
            "No supported biometric authentication method was found.",
          );
        }

        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage:
              "Enable MediVault biometric unlock",
            cancelLabel: "Cancel",
            disableDeviceFallback: true,
            biometricsSecurityLevel: "strong",
          });

        if (!result.success) {
          throw new Error(
            getBiometricErrorMessage(result.error),
          );
        }

        await SecureStore.setItemAsync(
          BIOMETRIC_ENABLED_KEY,
          "true",
        );

        setIsBiometricEnabled(true);
        setUnlockError(null);
      } finally {
        authenticationInProgress.current = false;
        setIsAuthenticating(false);
      }
    },
    [],
  );

  const disableBiometricUnlock = useCallback(
    async (): Promise<void> => {
      if (Platform.OS !== "web") {
        await SecureStore.deleteItemAsync(
          BIOMETRIC_ENABLED_KEY,
        );
      }

      setIsBiometricEnabled(false);
      setUnlockError(null);

      // Do not uncover protected screens during recovery
      // from a currently locked state.
      if (!isLocked) {
        setIsLocked(false);
      }
    },
    [isLocked],
  );

  const authenticateToUnlock = useCallback(
    async (): Promise<boolean> => {
      if (
        Platform.OS === "web" ||
        !isBiometricEnabled ||
        authenticationInProgress.current
      ) {
        return false;
      }

      authenticationInProgress.current = true;
      setIsAuthenticating(true);
      setUnlockError(null);

      try {
        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage: "Unlock MediVault",
            cancelLabel: "Cancel",
            disableDeviceFallback: true,
            biometricsSecurityLevel: "strong",
          });

        if (!result.success) {
          setUnlockError(
            getBiometricErrorMessage(result.error),
          );

          return false;
        }

        setIsLocked(false);
        setUnlockError(null);

        return true;
      } catch {
        setUnlockError(
          "Biometric verification failed. Please try again.",
        );

        return false;
      } finally {
        authenticationInProgress.current = false;
        setIsAuthenticating(false);
      }
    },
    [isBiometricEnabled],
  );

  const lockNow = useCallback(() => {
    if (!user || !isBiometricEnabled) {
      return;
    }

    setUnlockError(null);
    setIsLocked(true);
  }, [user, isBiometricEnabled]);

  // Lock after the app has spent 30 seconds inactive/backgrounded.
  useEffect(() => {
    if (
      !isReady ||
      Platform.OS === "web" ||
      !user ||
      !isBiometricEnabled
    ) {
      backgroundedAt.current = null;
      return;
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {

        // Ignore lifecycle changes caused by the native
        // biometric prompt itself.
        if (authenticationInProgress.current) {
          backgroundedAt.current = null;
          return;
        }

        if (
          nextState === "background" ||
          nextState === "inactive"
        ) {
          if (backgroundedAt.current === null) {
            backgroundedAt.current = Date.now();
          }

          return;
        }

        if (nextState === "active") {
          const startedAt = backgroundedAt.current;
          backgroundedAt.current = null;

          if (
            startedAt !== null &&
            Date.now() - startedAt >=
              BACKGROUND_LOCK_TIMEOUT
          ) {
            setUnlockError(null);
            setIsLocked(true);
          }
        }
      },
    );

    return () => subscription.remove();
  }, [isReady, user, isBiometricEnabled]);

  // Automatically present the biometric prompt once per lock.
  useEffect(() => {
    if (!isLocked) {
      autoPrompted.current = false;
      return;
    }

    if (
      !isReady ||
      !isBiometricEnabled ||
      autoPrompted.current
    ) {
      return;
    }

    autoPrompted.current = true;
    void authenticateToUnlock();
  }, [
    isReady,
    isLocked,
    isBiometricEnabled,
    authenticateToUnlock,
  ]);

  const value = useMemo(
    () => ({
      isReady,
      isBiometricEnabled,
      isLocked,
      isAuthenticating,
      unlockError,
      enableBiometricUnlock,
      disableBiometricUnlock,
      authenticateToUnlock,
      lockNow,
    }),
    [
      isReady,
      isBiometricEnabled,
      isLocked,
      isAuthenticating,
      unlockError,
      enableBiometricUnlock,
      disableBiometricUnlock,
      authenticateToUnlock,
      lockNow,
    ],
  );

  useEffect(() => {
    if (isLocked) {
      clearAttachmentAccessCache();
    }
  }, [isLocked]);

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const context = useContext(AppLockContext);

  if (!context) {
    throw new Error(
      "useAppLock must be used inside an AppLockProvider.",
    );
  }

  return context;
}
