import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Hydrate from localStorage on mount (avoid SSR mismatch by reading after hydration)
  useEffect(() => {
    setIsAuthenticated(api.hasToken());
  }, []);

  const login = useCallback(async (password: string) => {
    const res = await api.login(password);
    api.setToken(res.access_token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}