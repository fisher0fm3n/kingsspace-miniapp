"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "./config";
import { login as apiLogin } from "./api";
import type { CurrentUser } from "./types";

type AuthContextValue = {
  user: CurrentUser | null;
  token: string;
  loading: boolean;
  isLoggedIn: boolean;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  setSession: (token: string, user: CurrentUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEYS.token) || "";
    setToken(t && t !== "null" ? t : "");
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const setSession = useCallback((nextToken: string, nextUser: CurrentUser) => {
    localStorage.setItem(STORAGE_KEYS.token, nextToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    if (nextUser.profile_pic)
      localStorage.setItem(STORAGE_KEYS.profilePic, nextUser.profile_pic);
    if (nextUser.fname)
      localStorage.setItem(STORAGE_KEYS.fname, nextUser.fname);
    if (nextUser.userID)
      localStorage.setItem(STORAGE_KEYS.userID, String(nextUser.userID));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signInWithPassword = useCallback(
    async (username: string, password: string) => {
      const res = await apiLogin(username, password);
      const payload = res?.data ?? res;
      const nextToken = payload?.token || payload?.user?.token;
      const nextUser: CurrentUser = payload?.user ?? payload ?? {};
      if (!nextToken) throw new Error("No token returned from login.");
      setSession(nextToken, { ...nextUser, token: nextToken });
    },
    [setSession],
  );

  const signOut = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isLoggedIn: Boolean(token),
      signInWithPassword,
      setSession,
      signOut,
    }),
    [user, token, loading, signInWithPassword, setSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
