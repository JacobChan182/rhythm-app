import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Animated } from "react-native";
import type { HitResult } from "@/lib/scoring";
import type { Rudiment } from "@/types/rudiment";
import type { MetronomeSoundId } from "@/lib/metronome";
import { METRONOME_SOUND_PRESETS } from "@/lib/metronome";
import { SlidingNoteLane } from "@/components/SlidingNoteLane";
import { TAB_BAR_TOP_OFFSET } from "@/constants/layout";

type PracticeScreenProps = {
  phase: "idle" | "exercising" | "summary";
  countInBeatsSeen: number;
  running: boolean;
  bpmInput: string;
  bpm: number;
  sound: MetronomeSoundId;
  onSoundChange: (id: MetronomeSoundId) => void;
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
  lastFeedbackAccuracy: "perfect" | "good" | "miss" | null;
  summaryResults: HitResult[] | null;
  counts: { perfect: number; good: number; miss: number } | null;
};

export function PracticeScreen({
  phase,
  countInBeatsSeen,
  running,
  bpmInput,
  bpm,
  sound,
  onSoundChange,
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
  lastFeedbackAccuracy: hitFeedback,
  counts,
}: PracticeScreenProps) {
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const nameFadeOpacity = useRef(new Animated.Value(1)).current;
  const prevPhaseRef = useRef<typeof phase>("idle");
  const showSummary = phase === "summary";
  const currentPreset = METRONOME_SOUND_PRESETS.find((p) => p.id === sound) ?? METRONOME_SOUND_PRESETS[0];

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase === "exercising") {
      if (prevPhase === "idle" || prevPhase === "summary") {
        nameFadeOpacity.setValue(1);
        Animated.timing(nameFadeOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } else {
      nameFadeOpacity.setValue(1);
    }
  }, [phase, nameFadeOpacity]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Practice</Text>
      <Text style={styles.subtitle}>
        {rudiment ? rudiment.name : "—"} • Play with the metronome
      </Text>
      {!isWeb && (
        <Text style={styles.warn}>Metronome is web-only in this MVP.</Text>
      )}

      {rudiment && isWeb && (
        <>
          <View style={styles.beatRow}>
            {[0, 1, 2, 3].map((i) => {
              // Beat from same AudioContext time as metronome and scoring (no separate count-in phase).
              const beat =
                phase === "exercising"
                  ? currentBeatInCycle >= 0
                    ? currentBeatInCycle
                    : 0
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
          <View style={styles.trackContainer}>
            {phase === "exercising" &&
            expectedTimesExtended.length > 0 ? (
              <SlidingNoteLane
                expectedTimes={expectedTimesExtended}
                pattern={rudiment.pattern}
                bpm={bpm}
                hitFeedback={hitFeedback}
              />
            ) : (
              <View style={styles.trackPlaceholderWrapper}>
                <View style={styles.trackPlaceholderInner}>
                  <Text style={styles.trackPlaceholderText}>
                    {rudiment.name}
                  </Text>
                </View>
              </View>
            )}
            <Animated.View
              style={[
                styles.trackNameOverlay,
                { opacity: nameFadeOpacity },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.trackPlaceholderText}>
                {rudiment.name}
              </Text>
            </Animated.View>
          </View>
        </>
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

      {isWeb && (
        <View style={styles.controls}>
          <Text style={styles.label}>Sound</Text>
          {Platform.OS === "web" ? (
            <select
              value={sound}
              onChange={(e) =>
                onSoundChange((e.target as HTMLSelectElement).value as MetronomeSoundId)
              }
              style={styles.soundSelect as unknown as React.CSSProperties}
              disabled={running}
            >
              {METRONOME_SOUND_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          ) : (
            <>
              <TouchableOpacity
                style={styles.soundTouchable}
                onPress={() => setSoundPickerOpen(true)}
                disabled={running}
              >
                <Text style={styles.soundTouchableText}>{currentPreset.label}</Text>
              </TouchableOpacity>
              <Modal
                visible={soundPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setSoundPickerOpen(false)}
              >
                <TouchableOpacity
                  style={styles.soundModalBackdrop}
                  activeOpacity={1}
                  onPress={() => setSoundPickerOpen(false)}
                >
                  <View style={styles.soundModalContent}>
                    <ScrollView
                      style={styles.soundModalScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {METRONOME_SOUND_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.soundModalOption,
                          sound === preset.id && styles.soundModalOptionActive,
                        ]}
                        onPress={() => {
                          onSoundChange(preset.id);
                          setSoundPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.soundModalOptionText,
                            sound === preset.id && styles.soundModalOptionTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          )}
        </View>
      )}

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
    paddingTop: TAB_BAR_TOP_OFFSET + 24,
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
    minHeight: 300,
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
  trackContainer: {
    position: "relative",
    minHeight: 112,
    marginBottom: 20,
  },
  trackPlaceholderWrapper: {
    height: 112,
    width: "100%",
  },
  trackPlaceholderInner: {
    flex: 1,
    height: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  trackPlaceholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  trackNameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 112,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  soundSelect: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    fontSize: 16,
    color: "#fff",
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    maxWidth: 220,
    borderWidth: 0,
    cursor: "pointer",
    marginRight: 12,
  },
  soundTouchable: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    maxWidth: 220,
    marginRight: 12,
  },
  soundTouchableText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  soundModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  soundModalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    minWidth: 240,
    maxHeight: 320,
  },
  soundModalScroll: {
    maxHeight: 280,
  },
  soundModalOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  soundModalOptionActive: {
    backgroundColor: "#22c55e",
  },
  soundModalOptionText: {
    fontSize: 16,
    color: "#e5e5e5",
  },
  soundModalOptionTextActive: {
    color: "#000",
    fontWeight: "600",
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
