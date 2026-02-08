import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { HomeScreen } from "@/components/screens/HomeScreen";

export default function Home() {
  useAuth(); // ensure we're in authenticated context

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    router.replace("/");
  }

  return (
    <HomeScreen
      onStartPractice={() => router.push("/(tabs)/practice")}
      onSignOut={handleSignOut}
    />
  );
}
