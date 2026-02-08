import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { AccountScreen } from "@/components/screens/AccountScreen";

export default function Account() {
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    router.replace("/");
  }

  return <AccountScreen user={user} onSignOut={handleSignOut} />;
}
