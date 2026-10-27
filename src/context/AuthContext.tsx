
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ApiError,
} from "@/services/api";

import {
  getCurrentUser,
  loginAccount,
  registerAccount,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "@/services/auth";

import {
  getAuthToken,
  removeAuthToken,
  saveAuthToken,
} from "@/utils/authStorage";

import {
  clearAttachmentAccessCache,
} from "@/utils/attachmentAccessCache";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const token = await getAuthToken();

        if (!token) {
          return;
        }

        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await removeAuthToken();
        }

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginAccount(input);

    await saveAuthToken(response.data.token);
    setUser(response.data.user);
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await registerAccount(input);

      await saveAuthToken(response.data.token);
      setUser(response.data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    // Clear sensitive in-memory attachment URLs immediately.
    clearAttachmentAccessCache();

    await removeAuthToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider.",
    );
  }

  return context;
}
