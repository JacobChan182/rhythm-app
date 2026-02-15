import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { setAuthPersistence, setAuthCookie, clearAuthCookie } from "@/lib/authPersistence";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string | null;
  /** Call to sign in anonymously (e.g. "Continue as guest"). */
  signInAsGuest: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      setAuthPersistence(auth).catch(() => {});
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
        setAuthError(null);
        if (u) setAuthCookie();
        else clearAuthCookie();
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to load auth");
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  const signInAsGuest = useCallback(async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Guest sign-in failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
