import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { HomeScreen } from "@/components/screens/HomeScreen";

export default function Home() {
  const { user } = useAuth();

  const userLabel = user?.isAnonymous
    ? "Signed in as guest"
    : user?.email
      ? `Hi ${user.email.split("@")[0]}`
      : "Hi";

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
