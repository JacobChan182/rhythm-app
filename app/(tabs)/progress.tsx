import { useAuth } from "@/contexts/AuthContext";
import { useProgressStats } from "@/hooks/useProgressStats";
import { ProgressScreen } from "@/components/screens/ProgressScreen";

export default function Progress() {
  const { user } = useAuth();
  const stats = useProgressStats(user);
  return <ProgressScreen stats={stats} />;
}
