"use client";

/**
 * Client-side auth helpers — JWT bearer-token flow.
 *
 * Token is stored in localStorage under "retroguard_token".
 * No cookies are used, so CSRF is not a concern.
 *
 * AuthProvider (JSX) lives in AuthProvider.tsx — imported from there.
 */

import { createContext, useContext } from "react";

const TOKEN_KEY = "retroguard_token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  role: "admin" | "supervisor" | "inspector";
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail ?? j.message ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const data = await authFetch<{ access_token: string; token_type: string; user: AuthUser }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) }
  );
  return { token: data.access_token, user: data.user };
}

export async function getMe(token: string): Promise<AuthUser> {
  return authFetch<AuthUser>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function logout(): void {
  clearToken();
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
