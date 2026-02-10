/**
 * Scoring: compare tap times to expected note times and classify each hit.
 *
 * Algorithm (proximity-based matching):
 * 1. Match by proximity: each tap is matched to the expected time it is closest to,
 *    provided the distance is within assignmentWindowMs.
 * 2. Assignment: we consider all (tap, expected) pairs within assignmentWindowMs, sort by
 *    distance ascending, and greedily assign closest pairs first. Each tap and each
 *    expected is used at most once.
 * 3. Offset in ms: offsetMs = (tapTime - expectedTime) * 1000. Negative = early, positive = late.
 * 4. Accuracy (ratio-based): beat_ms = 60000 / BPM, error_ratio = |offsetMs| / beat_ms.
 *    error_ratio <= 0.02 → "perfect"; <= 0.05 → "good" (Great); else "miss".
 *    Expected notes with no assigned tap → "miss".
 */

export type HitAccuracy = "perfect" | "good" | "miss";

export type HitResult = {
  /** Index of the expected note (0-based). */
  index: number;
  /** Expected time in AudioContext seconds. */
  expectedTime: number;
  /** Tap time in AudioContext seconds, or null if no tap for this note. */
  tapTime: number | null;
  /** Timing error in milliseconds. Negative = early, positive = late. Null if miss (no tap). */
  offsetMs: number | null;
  /** perfect | good | miss from configurable thresholds. */
  accuracy: HitAccuracy;
};

export type ScoringThresholds = {
  /** |offsetMs| <= this → "perfect". */
  perfectThresholdMs: number;
  /** |offsetMs| <= this → "good". Must be >= perfectThresholdMs. */
  goodThresholdMs: number;
};

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  perfectThresholdMs: 50,
  goodThresholdMs: 100,
};

const PERFECT_RATIO = 0.02;
const GOOD_RATIO = 0.05;

/**
 * Compute thresholds in ms from BPM using error ratio:
 * beat_ms = 60000 / BPM, error_ratio = |offsetMs| / beat_ms.
 * Perfect <= 0.02, Great <= 0.05.
 */
export function getThresholdsForBpm(bpm: number): ScoringThresholds {
  const beatMs = 60000 / bpm;
  return {
    perfectThresholdMs: PERFECT_RATIO * beatMs,
    goodThresholdMs: GOOD_RATIO * beatMs,
  };
}

/**
 * Classify a single offset (ms) into perfect / good / miss using the given thresholds.
 * Early or late doesn't matter; we use the absolute value.
 */
function classifyOffset(
  offsetMs: number,
  thresholds: ScoringThresholds
): HitAccuracy {
  const abs = Math.abs(offsetMs);
  if (abs <= thresholds.perfectThresholdMs) return "perfect";
  if (abs <= thresholds.goodThresholdMs) return "good";
  return "miss";
}

/** Max distance (ms) for a tap to be assigned to an expected time. Beyond this we treat as wrong beat. */
export const ASSIGNMENT_WINDOW_MS = 150;

/**
 * Score a practice session: match taps to expected times by proximity, then classify each hit.
 *
 * @param tapTimes - Array of tap times in AudioContext seconds (same clock as expectedTimes).
 * @param expectedTimes - Array of expected hit times from the note scheduler.
 * @param thresholds - Optional. Perfect and good bands in ms; defaults to DEFAULT_THRESHOLDS.
 * @returns One HitResult per expected note. Taps are matched to the closest expected within ASSIGNMENT_WINDOW_MS.
 */
export function scoreSession(
  tapTimes: number[],
  expectedTimes: number[],
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): HitResult[] {
  const assignmentWindowSec = ASSIGNMENT_WINDOW_MS / 1000;

  type Pair = { tapIdx: number; expectedIdx: number; distanceMs: number };
  const pairs: Pair[] = [];

  for (let t = 0; t < tapTimes.length; t++) {
    const tapTime = tapTimes[t];
    for (let e = 0; e < expectedTimes.length; e++) {
      const expectedTime = expectedTimes[e];
      const distanceSec = Math.abs(tapTime - expectedTime);
      if (distanceSec <= assignmentWindowSec) {
        const distanceMs = distanceSec * 1000;
        pairs.push({ tapIdx: t, expectedIdx: e, distanceMs });
      }
    }
  }

  pairs.sort((a, b) => a.distanceMs - b.distanceMs);

  const tapAssigned = new Set<number>();
  const expectedToTap = new Map<number, number>();

  for (const { tapIdx, expectedIdx } of pairs) {
    if (tapAssigned.has(tapIdx) || expectedToTap.has(expectedIdx)) continue;
    tapAssigned.add(tapIdx);
    expectedToTap.set(expectedIdx, tapIdx);
  }

  const results: HitResult[] = [];

  for (let i = 0; i < expectedTimes.length; i++) {
    const expectedTime = expectedTimes[i];
    const tapIdx = expectedToTap.get(i);
    const tapTime = tapIdx !== undefined ? tapTimes[tapIdx] : null;

    if (tapTime === null) {
      results.push({
        index: i,
        expectedTime,
        tapTime: null,
        offsetMs: null,
        accuracy: "miss",
      });
      continue;
    }

    const offsetMs = (tapTime - expectedTime) * 1000;
    const accuracy = classifyOffset(offsetMs, thresholds);

    results.push({
      index: i,
      expectedTime,
      tapTime,
      offsetMs,
      accuracy,
    });
  }

  return results;
}

/**
 * Aggregate counts from a list of HitResults (e.g. for display).
 */
export function countByAccuracy(results: HitResult[]): {
  perfect: number;
  good: number;
  miss: number;
} {
  const counts = { perfect: 0, good: 0, miss: 0 };
  for (const r of results) {
    counts[r.accuracy]++;
  }
  return counts;
}
