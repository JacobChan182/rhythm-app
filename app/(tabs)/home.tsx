import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUserProgress } from "@/lib/userProgress";
import { signOut } from "firebase/auth";
import { HomeScreen } from "@/components/screens/HomeScreen";

export default function Home() {
  const { user } = useAuth();
  const [userLabel, setUserLabel] = useState("Hi");

  useEffect(() => {
    if (!user) {
      setUserLabel("Hi");
      return;
    }
    if (user.isAnonymous) {
      setUserLabel("Signed in as guest");
      return;
    }
    let cancelled = false;
    getUserProgress(user)
      .then((progress) => {
        if (cancelled) return;
        const name =
          progress?.username ||
          user.displayName ||
          (user.email ? user.email.split("@")[0] : null);
        setUserLabel(name ? `Hi, ${name}` : "Hi");
      })
      .catch(() => {
        if (!cancelled) {
          const name = user.displayName || (user.email ? user.email.split("@")[0] : null);
          setUserLabel(name ? `Hi, ${name}` : "Hi");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    router.replace("/");
  }

  return (
    <HomeScreen
      userLabel={userLabel}
      onStartPractice={() => router.push("/(tabs)/practice")}
      onSignOut={handleSignOut}
    />
  );
}
