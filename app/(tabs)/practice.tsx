import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";
import { useResolvedRudiment } from "@/hooks/useResolvedRudiment";
import { usePractice } from "@/hooks/usePractice";
import { PracticeScreen } from "@/components/screens/PracticeScreen";
import { getAllRudiments } from "@/lib/rudiments";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

export default function Practice() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ rudimentId?: string; bpm?: string }>();
  const initialBpm =
    params.bpm != null ? parseInt(params.bpm, 10) : undefined;
  const { rudiment: resolvedRudiment, loading: rudimentLoading } = useResolvedRudiment(params.rudimentId);
  const defaultRudiment = getAllRudiments()[0] ?? null;
  const practice = usePractice(user, {
    rudiment: rudimentLoading ? undefined : (resolvedRudiment ?? (!params.rudimentId ? defaultRudiment : null)),
    rudimentId: rudimentLoading ? undefined : params.rudimentId,
    initialBpm: Number.isFinite(initialBpm) ? initialBpm : undefined,
  });

  if (rudimentLoading && params.rudimentId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading rudiment…</Text>
      </View>
    );
  }

  return (
    <PracticeScreen
      phase={practice.phase}
      countInBeatsSeen={practice.countInBeatsSeen}
      running={practice.running}
      bpmInput={practice.bpmInput}
      bpm={practice.bpm}
      currentBeat={practice.currentBeat}
      isWeb={practice.isWeb}
      onBpmChange={practice.onBpmChange}
      onStartStop={practice.onStartStop}
      onStopForSummary={practice.onStopForSummary}
      dismissSummary={practice.dismissSummary}
      tapCount={practice.tapCount}
      tapFlashHand={practice.tapFlashHand}
      onTapLeft={practice.onTapLeft}
      onTapRight={practice.onTapRight}
      rudiment={practice.rudiment}
      expectedTimes={practice.expectedTimes}
      liveResults={practice.liveResults}
      summaryResults={practice.summaryResults}
      counts={practice.counts}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
  loadingText: {
    color: "#71717a",
    marginTop: 12,
  },
});
