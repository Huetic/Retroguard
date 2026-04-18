"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AuthContext,
  AuthUser,
  getToken,
  setToken,
  clearToken,
  login,
  getMe,
  logout,
} from "./auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: check for a stored token and validate it
  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    getMe(stored)
      .then((u) => {
        setTokenState(stored);
        setUser(u);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { token: tok, user: u } = await login(username, password);
    setToken(tok);
    setTokenState(tok);
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    logout();
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
