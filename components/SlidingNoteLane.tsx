import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getAudioContextTime } from "@/lib/metronome";
import type { PatternCell } from "@/types/rudiment";

/** How many seconds before a note's hit time it enters the track (from the right). */
const APPROACH_SEC = 2;

type SlidingNoteLaneProps = {
  expectedTimes: number[];
  pattern: PatternCell[];
  bpm: number;
  /** Lane width in logical units; bar positions are 0 = hit zone (left), 1 = entry (right). */
  laneWidth?: number;
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
  laneWidth = 720,
}: SlidingNoteLaneProps) {
  const notes = buildNotes(expectedTimes, pattern);
  const [now, setNow] = useState(0);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const tick = () => {
      if (!mountedRef.current) return;
      const t = getAudioContextTime();
      setNow(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (notes.length === 0) return null;

  const hitZoneX = 0.2 * laneWidth; // hit zone at 20% from left
  const startX = laneWidth; // bars enter from the right

  return (
    <View style={[styles.wrapper, { width: laneWidth }]}>
      <View style={styles.track}>
        {/* Hit zone line */}
        <View style={[styles.hitZone, { left: hitZoneX }]} />
        {/* Sliding bars */}
        {notes.map((note, i) => {
          const elapsed = now - (note.time - APPROACH_SEC);
          const progress = elapsed / APPROACH_SEC;
          // 0 = at entry (right), 1 = at hit zone (left)
          const x =
            progress <= 0
              ? startX + BAR_WRAPPER_WIDTH
              : progress >= 1
                ? hitZoneX - BAR_WRAPPER_WIDTH
                : startX - progress * (startX - hitZoneX);
          const visible = progress > -0.2 && progress < 1.4;
          if (!visible) return null;
          return (
            <View
              key={`${note.time}-${i}`}
              style={[
                styles.barWrapper,
                {
                  left: Math.max(0, x - BAR_WRAPPER_WIDTH / 2),
                  opacity: progress > 1 ? 0.4 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  note.hand === "L" ? styles.barL : styles.barR,
                ]}
              />
              <Text style={styles.handLabel}>{note.hand}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    height: 140,
  },
  track: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
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
