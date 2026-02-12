import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Animated } from "react-native";
import Slider from "@react-native-community/slider";
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
  auditoryCompensationMs: number;
  visualCompensationMs: number;
  onAuditoryCompensationChange: (ms: number) => void;
  onVisualCompensationChange: (ms: number) => void;
};

const COMPENSATION_MIN_MS = 0;
/** Slider thumb max; typing can go higher. */
const SLIDER_MAX_MS = 200;
/** Max value when typing in the input (slider is capped at SLIDER_MAX_MS). */
const COMPENSATION_INPUT_MAX_MS = 999;

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
  auditoryCompensationMs,
  visualCompensationMs,
  onAuditoryCompensationChange,
  onVisualCompensationChange,
}: PracticeScreenProps) {
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [auditoryInputStr, setAuditoryInputStr] = useState<string | null>(null);
  const [visualInputStr, setVisualInputStr] = useState<string | null>(null);

  const commitAuditory = (raw: string) => {
    const n = parseInt(raw, 10);
    const clamped = Number.isNaN(n)
      ? auditoryCompensationMs
      : Math.max(COMPENSATION_MIN_MS, Math.min(COMPENSATION_INPUT_MAX_MS, n));
    onAuditoryCompensationChange(clamped);
    setAuditoryInputStr(null);
  };
  const commitVisual = (raw: string) => {
    const n = parseInt(raw, 10);
    const clamped = Number.isNaN(n)
      ? visualCompensationMs
      : Math.max(COMPENSATION_MIN_MS, Math.min(COMPENSATION_INPUT_MAX_MS, n));
    onVisualCompensationChange(clamped);
    setVisualInputStr(null);
  };
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
      <View style={styles.titleBeatRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>
            {rudiment ? rudiment.name : "—"} • Play with the metronome
          </Text>
        </View>
        {rudiment && isWeb && (
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
        )}
      </View>
      {!isWeb && (
        <Text style={styles.warn}>Metronome is web-only in this MVP.</Text>
      )}

      {rudiment && isWeb && (
        <>
          <View style={styles.trackContainer}>
            {phase === "exercising" &&
            expectedTimesExtended.length > 0 ? (
              <SlidingNoteLane
                expectedTimes={expectedTimesExtended}
                pattern={rudiment.pattern}
                bpm={bpm}
                hitFeedback={hitFeedback}
                visualCompensationMs={visualCompensationMs}
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
          {...(Platform.OS === "web"
            ? {
                onContextMenu: (e: unknown) => {
                  const ev = (e as { nativeEvent?: { preventDefault?: () => void } }).nativeEvent;
                  if (ev?.preventDefault) ev.preventDefault();
                  onTapRight();
                },
              }
            : {})}
          activeOpacity={1}
        >
          <Text style={styles.tapLabel}>R</Text>
          <Text style={styles.tapSubtext}>Right</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.tapCount}>{tapCount} taps</Text>

      <View style={styles.settingsRow}>
        <View style={styles.settingsGrid}>
          {/* Row 1: Sound | Auditory */}
          <View style={styles.settingsLine}>
            <View style={[styles.settingsBlock, styles.settingsCell]}>
            {isWeb ? (
              <View style={styles.controls}>
                <Text style={styles.settingsLabel}>Sound</Text>
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
            ) : (
              <View style={styles.controls} />
            )}
            </View>
            <View style={[styles.settingsBlock, styles.settingsCell]}>
              <View style={styles.sliderRow}>
                <Text style={styles.settingsLabel}>Auditory</Text>
                <TextInput
                  style={styles.compensationInput}
                  value={auditoryInputStr ?? String(auditoryCompensationMs)}
                  onChangeText={setAuditoryInputStr}
                  onFocus={() => setAuditoryInputStr(String(auditoryCompensationMs))}
                  onBlur={() => auditoryInputStr !== null && commitAuditory(auditoryInputStr)}
                  onEndEditing={(e) => commitAuditory(e.nativeEvent.text)}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.sliderUnit}>ms</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={COMPENSATION_MIN_MS}
                  maximumValue={SLIDER_MAX_MS}
                  step={5}
                  value={Math.min(auditoryCompensationMs, SLIDER_MAX_MS)}
                  onValueChange={onAuditoryCompensationChange}
                  minimumTrackTintColor="#22c55e"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#22c55e"
                />
              </View>
            </View>
          </View>
          {/* Row 2: BPM | Visual */}
          <View style={styles.settingsLine}>
            <View style={[styles.settingsBlock, styles.settingsCell]}>
              <View style={styles.controlsRow}>
                <View style={styles.controls}>
                  <Text style={styles.settingsLabel}>BPM</Text>
                  <TextInput
                    style={styles.input}
                    value={bpmInput}
                    onChangeText={onBpmChange}
                    keyboardType="number-pad"
                    editable={!running}
                    maxLength={3}
                  />
                </View>
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
            </View>
            <View style={[styles.settingsBlock, styles.settingsCell]}>
              <View style={styles.sliderRow}>
                <Text style={styles.settingsLabel}>Visual</Text>
                <TextInput
                  style={styles.compensationInput}
                  value={visualInputStr ?? String(visualCompensationMs)}
                  onChangeText={setVisualInputStr}
                  onFocus={() => setVisualInputStr(String(visualCompensationMs))}
                  onBlur={() => visualInputStr !== null && commitVisual(visualInputStr)}
                  onEndEditing={(e) => commitVisual(e.nativeEvent.text)}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.sliderUnit}>ms</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={COMPENSATION_MIN_MS}
                  maximumValue={SLIDER_MAX_MS}
                  step={5}
                  value={Math.min(visualCompensationMs, SLIDER_MAX_MS)}
                  onValueChange={onVisualCompensationChange}
                  minimumTrackTintColor="#22c55e"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#22c55e"
                />
              </View>
            </View>
          </View>
        </View>
        {showSummary && counts && (
          <View style={[styles.summary, styles.settingsBlock]}>
            <Text style={styles.summaryTitle}>Session summary</Text>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryLabel, styles.summaryPerfect]}>Perfect</Text>
                <Text style={styles.summaryValue}>{counts.perfect}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryLabel, styles.summaryGood]}>Good</Text>
                <Text style={styles.summaryValue}>{counts.good}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryLabel, styles.summaryMiss]}>Miss</Text>
                <Text style={styles.summaryValue}>{counts.miss}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

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
  titleBeatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  titleBlock: {
    flexShrink: 0,
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
    marginBottom: 0,
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
    flexShrink: 0,
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
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  /** Consistent width for metronome, delay sliders, and summary blocks. */
  settingsBlock: {
    width: 240,
    minWidth: 240,
  },
  settingsGrid: {
    flexDirection: "column",
    gap: 12,
  },
  settingsLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  settingsCell: {
    minHeight: 44,
  },
  settingsLabel: {
    color: "#888",
    fontSize: 12,
    width: 52,
    marginRight: 8,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
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
  sliderColumn: {
    flexDirection: "column",
    gap: 4,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compensationInput: {
    fontSize: 12,
    color: "#fff",
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 44,
    textAlign: "center",
  },
  sliderUnit: {
    fontSize: 12,
    color: "#888",
    width: 20,
  },
  slider: {
    width: 100,
    height: 44,
  },
  summary: {
    padding: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  summaryStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  summaryStat: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
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
  hint: {
    fontSize: 14,
    color: "#666",
  },
});
