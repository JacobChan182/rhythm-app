import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import type { HitResult } from "@/lib/scoring";
import type { Rudiment } from "@/types/rudiment";
import { SlidingNoteLane } from "@/components/SlidingNoteLane";

type PracticeScreenProps = {
  phase: "idle" | "count-in" | "exercising" | "summary";
  countInBeatsSeen: number;
  running: boolean;
  bpmInput: string;
  bpm: number;
  currentBeat: number;
  /** Beat within current loop (0-3) when exercising; -1 otherwise. Use for beat display during exercise so it resets each loop. */
  currentBeatInCycle: number;
  isWeb: boolean;
  onBpmChange: (text: string) => void;
  onStartStop: () => void;
  onStopForSummary: () => void;
  dismissSummary: () => void;
  tapCount: number;
  tapFlashHand: "L" | "R" | null;
  onTapLeft: () => void;
  onTapRight: () => void;
  rudiment: Rudiment | null;
  expectedTimes: number[];
  expectedTimesExtended: number[];
  liveResults: HitResult[];
  summaryResults: HitResult[] | null;
  counts: { perfect: number; good: number; miss: number } | null;
};

export function PracticeScreen({
  phase,
  countInBeatsSeen,
  running,
  bpmInput,
  bpm,
  currentBeat,
  currentBeatInCycle,
  isWeb,
  onBpmChange,
  onStartStop,
  onStopForSummary,
  dismissSummary,
  tapCount,
  tapFlashHand,
  onTapLeft,
  onTapRight,
  rudiment,
  expectedTimes,
  expectedTimesExtended,
  liveResults,
  counts,
}: PracticeScreenProps) {
  const showCountIn = phase === "count-in";
  const showLane = phase === "exercising" || phase === "summary";
  const showSummary = phase === "summary";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Practice</Text>
      <Text style={styles.subtitle}>
        {rudiment ? rudiment.name : "—"} • Play with the metronome
      </Text>
      {!isWeb && (
        <Text style={styles.warn}>Metronome is web-only in this MVP.</Text>
      )}

      {showCountIn && (
        <View style={styles.countIn}>
          <Text style={styles.countInLabel}>Count in</Text>
          <View style={styles.countInDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.countInDot,
                  i < countInBeatsSeen && styles.countInDotDone,
                ]}
              >
                <Text
                  style={[
                    styles.countInDotText,
                    i < countInBeatsSeen && styles.countInDotTextDone,
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {showLane && rudiment && (
        <View style={styles.lane}>
          <Text style={styles.laneTitle}>Notes</Text>
          <View style={styles.laneRow}>
            {rudiment.pattern.map((stroke, i) => {
              const result = liveResults[i];
              const status =
                result?.tapTime == null && result?.accuracy === "miss"
                  ? "pending"
                  : result?.accuracy ?? "pending";
              return (
                <View
                  key={i}
                  style={[
                    styles.noteCell,
                    status === "perfect" && styles.notePerfect,
                    status === "good" && styles.noteGood,
                    status === "miss" && styles.noteMiss,
                  ]}
                >
                  <Text style={styles.noteStroke}>{stroke}</Text>
                  {result?.offsetMs != null && (
                    <Text style={styles.noteOffset}>
                      {result.offsetMs > 0 ? "+" : ""}
                      {Math.round(result.offsetMs)} ms
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {phase === "exercising" && (
        <>
          {rudiment && expectedTimesExtended.length > 0 && isWeb && (
            <SlidingNoteLane
              expectedTimes={expectedTimesExtended}
              pattern={rudiment.pattern}
              bpm={bpm}
            />
          )}
          <View style={styles.tapRow}>
            <TouchableOpacity
              style={[
                styles.tapArea,
                styles.tapAreaL,
                tapFlashHand === "L" && styles.tapAreaFlashL,
              ]}
              onPress={onTapLeft}
              activeOpacity={1}
            >
              <Text style={styles.tapLabel}>L</Text>
              <Text style={styles.tapSubtext}>Left</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tapArea,
                styles.tapAreaR,
                tapFlashHand === "R" && styles.tapAreaFlashR,
              ]}
              onPress={onTapRight}
              onContextMenu={(e) => {
                const ev = (e as unknown as { nativeEvent?: { preventDefault?: () => void } })
                  .nativeEvent;
                if (ev?.preventDefault) ev.preventDefault();
                onTapRight();
              }}
              activeOpacity={1}
            >
              <Text style={styles.tapLabel}>R</Text>
              <Text style={styles.tapSubtext}>Right</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tapCount}>{tapCount} taps</Text>
        </>
      )}

      <View style={styles.beatRow}>
        {[0, 1, 2, 3].map((i) => {
          const beat =
            phase === "exercising" && currentBeatInCycle >= 0
              ? currentBeatInCycle
              : currentBeat;
          return (
            <View
              key={i}
              style={[styles.beatBox, beat === i && styles.beatBoxActive]}
            >
              <Text
                style={[
                  styles.beatLabel,
                  beat === i && styles.beatLabelActive,
                ]}
              >
                {i + 1}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>BPM</Text>
        <TextInput
          style={styles.input}
          value={bpmInput}
          onChangeText={onBpmChange}
          keyboardType="number-pad"
          editable={!running}
          maxLength={3}
        />
        {phase === "exercising" ? (
          <TouchableOpacity style={styles.buttonStop} onPress={onStopForSummary}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, running ? styles.buttonStop : styles.buttonStart]}
            onPress={onStartStop}
          >
            <Text style={styles.buttonText}>
              {running ? "Stop" : "Start"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showSummary && counts && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Session summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.summaryPerfect]}>
              Perfect
            </Text>
            <Text style={styles.summaryValue}>{counts.perfect}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.summaryGood]}>Good</Text>
            <Text style={styles.summaryValue}>{counts.good}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.summaryMiss]}>Miss</Text>
            <Text style={styles.summaryValue}>{counts.miss}</Text>
          </View>
          <TouchableOpacity style={styles.summaryButton} onPress={dismissSummary}>
            <Text style={styles.summaryButtonText}>Practice again</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === "idle" && (
        <Text style={styles.hint}>
          Start for a 4-beat count-in, then play the pattern. Tap in time for
          feedback.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f0f0f",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  warn: {
    color: "#f59e0b",
    marginBottom: 16,
  },
  countIn: {
    marginBottom: 24,
    alignItems: "center",
  },
  countInLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  countInDots: {
    flexDirection: "row",
  },
  countInDot: {
    width: 40,
    height: 40,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  countInDotDone: {
    backgroundColor: "#22c55e",
  },
  countInDotText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
  },
  countInDotTextDone: {
    color: "#000",
  },
  lane: {
    marginBottom: 20,
  },
  laneTitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  laneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  noteCell: {
    minWidth: 44,
    margin: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
  },
  notePerfect: {
    backgroundColor: "#22c55e",
  },
  noteGood: {
    backgroundColor: "#eab308",
  },
  noteMiss: {
    backgroundColor: "#dc2626",
  },
  noteStroke: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  noteOffset: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  tapRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  tapArea: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  tapAreaL: {},
  tapAreaR: {},
  tapAreaFlashL: {
    backgroundColor: "#3b82f622",
    borderColor: "#3b82f6",
  },
  tapAreaFlashR: {
    backgroundColor: "#ef444422",
    borderColor: "#ef4444",
  },
  tapLabel: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  tapSubtext: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  tapCount: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
    textAlign: "center",
  },
  beatRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 24,
  },
  beatBox: {
    width: 56,
    height: 56,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  beatBoxActive: {
    backgroundColor: "#22c55e",
  },
  beatLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
  },
  beatLabelActive: {
    color: "#000",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    color: "#888",
    fontSize: 14,
    marginRight: 12,
  },
  input: {
    marginRight: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    width: 72,
    fontSize: 18,
    color: "#fff",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonStart: {
    backgroundColor: "#22c55e",
  },
  buttonStop: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  summary: {
    marginTop: 16,
    padding: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryPerfect: { color: "#22c55e" },
  summaryGood: { color: "#eab308" },
  summaryMiss: { color: "#dc2626" },
  summaryValue: {
    fontSize: 16,
    color: "#fff",
  },
  summaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 8,
  },
  summaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 14,
    color: "#666",
  },
});
