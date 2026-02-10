import { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { getAudioContextTime } from "@/lib/metronome";
import type { PatternCell } from "@/types/rudiment";

/** How many seconds before a note's hit time it enters the track (from the right). */
const APPROACH_SEC = 5;
/** How often we update which notes are in the visible window (ms). Reduces mount churn. */
const VISIBILITY_UPDATE_MS = 250;

type SlidingNoteLaneProps = {
  expectedTimes: number[];
  pattern: PatternCell[];
  bpm: number;
  /** Optional fixed width; if omitted, lane fills container and uses onLayout to measure. */
  laneWidth?: number;
  /** Show "Perfect" / "Great" / "Miss" to the left of the hit zone for a moment after each hit or miss. */
  hitFeedback?: "perfect" | "good" | "miss" | null;
};

type Note = { time: number; hand: "L" | "R" };

function buildNotes(expectedTimes: number[], pattern: PatternCell[]): Note[] {
  const handsPerCycle = pattern.filter(
    (c): c is "L" | "R" => c === "L" || c === "R"
  );
  const notesPerCycle = handsPerCycle.length;
  if (expectedTimes.length <= notesPerCycle) {
    const notes: Note[] = [];
    let idx = 0;
    for (const cell of pattern) {
      if (cell === "L" || cell === "R") {
        if (idx < expectedTimes.length) {
          notes.push({ time: expectedTimes[idx], hand: cell });
          idx++;
        }
      }
    }
    return notes;
  }
  return expectedTimes.map((time, i) => ({
    time,
    hand: handsPerCycle[i % notesPerCycle],
  }));
}

const BAR_WIDTH = 8;
const BAR_WRAPPER_WIDTH = 24;

export function SlidingNoteLane({
  expectedTimes,
  pattern,
  bpm,
  laneWidth: laneWidthProp,
  hitFeedback,
}: SlidingNoteLaneProps) {
  const notes = useMemo(() => buildNotes(expectedTimes, pattern), [expectedTimes, pattern]);
  const nowVal = useRef(new Animated.Value(0)).current;
  const nowRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const visibilityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  /** Throttled "now" used only to pick which notes to mount. Positions are driven by nowVal. */
  const [visibleWindowStart, setVisibleWindowStart] = useState(0);
  /** Measured width when no laneWidth prop; spans container (e.g. L–R button row). */
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const laneWidth = laneWidthProp ?? measuredWidth;

  useEffect(() => {
    mountedRef.current = true;
    const t0 = getAudioContextTime();
    nowRef.current = t0;
    nowVal.setValue(t0);
    setVisibleWindowStart(t0 - 1);
    const tick = () => {
      if (!mountedRef.current) return;
      const t = getAudioContextTime();
      nowRef.current = t;
      nowVal.setValue(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [nowVal]);

  useEffect(() => {
    const updateVisibility = () => {
      if (!mountedRef.current) return;
      const t = nowRef.current;
      setVisibleWindowStart(t - 1);
    };
    updateVisibility();
    visibilityIntervalRef.current = setInterval(updateVisibility, VISIBILITY_UPDATE_MS);
    return () => {
      if (visibilityIntervalRef.current != null) {
        clearInterval(visibilityIntervalRef.current);
        visibilityIntervalRef.current = null;
      }
    };
  }, []);

  if (notes.length === 0) return null;
  if (laneWidth <= 0) {
    return (
      <View
        style={[styles.wrapper, styles.wrapperFullWidth]}
        onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}
      />
    );
  }

  const hitZoneX = 0.2 * laneWidth;
  const startX = laneWidth;

  const visibleNotes = notes.filter(
    (note) =>
      note.time >= visibleWindowStart - 0.5 &&
      note.time <= visibleWindowStart + APPROACH_SEC + 2
  );

  return (
    <View
      style={[styles.wrapper, laneWidthProp != null ? { width: laneWidth } : styles.wrapperFullWidth]}
      onLayout={laneWidthProp == null ? (e) => setMeasuredWidth(e.nativeEvent.layout.width) : undefined}
    >
      <View style={styles.track}>
        {hitFeedback != null && (
          <View
            style={[styles.hitFeedbackWrap, { left: 0, width: hitZoneX - 8 }]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.hitFeedbackText,
                hitFeedback === "perfect" && styles.hitFeedbackPerfect,
                hitFeedback === "good" && styles.hitFeedbackGood,
                hitFeedback === "miss" && styles.hitFeedbackMiss,
              ]}
            >
              {hitFeedback === "perfect"
                ? "Perfect"
                : hitFeedback === "good"
                  ? "Great"
                  : "Miss"}
            </Text>
          </View>
        )}
        <View style={[styles.hitZone, { left: hitZoneX }]} />
        {visibleNotes.map((note) => {
          const tMin = note.time - APPROACH_SEC;
          const tHit = note.time;
          const leftAnim = nowVal.interpolate({
            inputRange: [tMin, tHit],
            outputRange: [
              Math.max(0, startX - BAR_WRAPPER_WIDTH / 2),
              Math.max(0, hitZoneX - BAR_WRAPPER_WIDTH / 2),
            ],
            extrapolate: "clamp",
          });
          const opacityAnim = nowVal.interpolate({
            inputRange: [tHit - 0.05, tHit, tHit + 0.15],
            outputRange: [1, 1, 0.4],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={note.time}
              style={[styles.barWrapper, { left: leftAnim, opacity: opacityAnim }]}
            >
              <View
                style={[
                  styles.bar,
                  note.hand === "L" ? styles.barL : styles.barR,
                ]}
              />
              <Text style={styles.handLabel}>{note.hand}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    height: 112,
  },
  wrapperFullWidth: {
    width: "100%",
  },
  track: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  hitFeedbackWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    zIndex: 11,
  },
  hitFeedbackText: {
    fontSize: 14,
    fontWeight: "700",
  },
  hitFeedbackPerfect: {
    color: "#22c55e",
  },
  hitFeedbackGood: {
    color: "#eab308",
  },
  hitFeedbackMiss: {
    color: "#ef4444",
  },
  hitZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#22c55e",
    borderRadius: 2,
    zIndex: 10,
  },
  barWrapper: {
    position: "absolute",
    top: 12,
    width: BAR_WRAPPER_WIDTH,
    height: 100,
    alignItems: "center",
    zIndex: 5,
  },
  bar: {
    width: BAR_WIDTH,
    height: 72,
    borderRadius: 4,
  },
  barL: {
    backgroundColor: "#3b82f6",
  },
  barR: {
    backgroundColor: "#ef4444",
  },
  handLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
});
