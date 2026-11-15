import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import {
  mockLoginWithCredentials,
  mockRegisterAccount,
  type AuthActionResult,
  type MockAuthUser,
  type RegisterPayload,
  type StoredMockAccount,
} from '../data/authMockData';

const AUTH_SESSION_STORAGE_KEY = 'parttime-student-auth-session-v1';
const AUTH_ACCOUNTS_STORAGE_KEY = 'parttime-student-auth-accounts-v1';

interface AuthMockContextValue {
  currentUser: MockAuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => AuthActionResult;
  register: (payload: RegisterPayload) => AuthActionResult;
  logout: () => void;
}

const AuthMockContext = createContext<AuthMockContextValue | null>(null);

function readStoredUser(): MockAuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as MockAuthUser;
  } catch {
    return null;
  }
}

function readRegisteredAccounts(): StoredMockAccount[] {
  try {
    const raw = window.localStorage.getItem(AUTH_ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredMockAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AuthMockProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MockAuthUser | null>(() => readStoredUser());
  const [registeredAccounts, setRegisteredAccounts] = useState<StoredMockAccount[]>(() =>
    readRegisteredAccounts()
  );

  const persistSession = useCallback((user: MockAuthUser | null, rememberMe = true) => {
    setCurrentUser(user);
    try {
      if (user && rememberMe) {
        window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      }
    } catch {
      // Bỏ qua lỗi storage trong môi trường sandbox/test
    }
  }, []);

  const login = useCallback(
    (email: string, password: string, rememberMe = true): AuthActionResult => {
      const result = mockLoginWithCredentials(email, password, registeredAccounts);
      if (result.ok && result.user) {
        persistSession(result.user, rememberMe);
        notifications.show({
          title: 'Đăng nhập thành công',
          message: result.message ?? `Xin chào ${result.user.fullName}`,
          color: 'success',
        });
      }
      return result;
    },
    [registeredAccounts, persistSession]
  );

  const register = useCallback(
    (payload: RegisterPayload): AuthActionResult => {
      const result = mockRegisterAccount(payload, registeredAccounts);
      if (result.ok && result.user && result.createdAccount) {
        const nextAccounts = [result.createdAccount, ...registeredAccounts];
        setRegisteredAccounts(nextAccounts);
        try {
          window.localStorage.setItem(AUTH_ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
        } catch {
          // Bỏ qua lỗi storage trong môi trường sandbox/test
        }
        persistSession(result.user, true);
        notifications.show({
          title: 'Tạo tài khoản thành công',
          message: result.message ?? 'Tài khoản sinh viên đã sẵn sàng.',
          color: 'success',
        });
      }
      return result;
    },
    [registeredAccounts, persistSession]
  );

  const logout = useCallback(() => {
    persistSession(null, false);
    notifications.show({
      title: 'Đã đăng xuất',
      message: 'Bạn có thể đăng nhập lại hoặc chuyển sang tài khoản sinh viên khác.',
      color: 'brand',
    });
  }, [persistSession]);

  const value = useMemo<AuthMockContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      register,
      logout,
    }),
    [currentUser, login, register, logout]
  );

  return <AuthMockContext.Provider value={value}>{children}</AuthMockContext.Provider>;
}

export function useAuthMock(): AuthMockContextValue {
  const ctx = useContext(AuthMockContext);
  if (!ctx) {
    throw new Error('useAuthMock phải được gọi bên trong AuthMockProvider');
  }
  return ctx;
}

export function useOptionalAuthMock(): AuthMockContextValue | null {
  return useContext(AuthMockContext);
}
