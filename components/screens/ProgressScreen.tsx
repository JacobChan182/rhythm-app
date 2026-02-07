import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import type { ProgressStats } from "@/types/progress";

type ProgressScreenProps = {
  stats: ProgressStats & { loading?: boolean };
};

export function ProgressScreen({ stats }: ProgressScreenProps) {
  const loading = stats.loading ?? false;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading stats…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.hint}>Aggregate stats from your practice sessions.</Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Sessions</Text>
        <Text style={styles.statValue}>{stats.sessionsCount}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Total time</Text>
        <Text style={styles.statValue}>{stats.totalMinutes} min</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, styles.perfect]}>Perfect</Text>
        <Text style={styles.statValue}>{stats.totalPerfect}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, styles.good]}>Good</Text>
        <Text style={styles.statValue}>{stats.totalGood}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, styles.miss]}>Miss</Text>
        <Text style={styles.statValue}>{stats.totalMiss}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f0f0f",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  statLabel: {
    fontSize: 16,
    color: "#aaa",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  perfect: { color: "#22c55e" },
  good: { color: "#eab308" },
  miss: { color: "#dc2626" },
});
