import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const anonymousSignInStarted = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        anonymousSignInStarted.current = false;
        return;
      }
      // No user: sign in anonymously (e.g. first load or after sign-out)
      if (anonymousSignInStarted.current) return;
      anonymousSignInStarted.current = true;
      signInAnonymously(auth).catch(() => {
        anonymousSignInStarted.current = false;
      });
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
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
