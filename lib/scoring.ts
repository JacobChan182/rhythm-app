/**
 * Scoring: compare tap times to expected note times and classify each hit.
 *
 * Algorithm:
 * 1. Match by order: tap[i] is compared to expectedTimes[i]. So the first tap is
 *    scored against the first expected time, the second tap against the second, etc.
 * 2. Offset in ms: offsetMs = (tapTime - expectedTime) * 1000. Negative = early,
 *    positive = late. This is the timing error in milliseconds.
 * 3. Accuracy band: we use two thresholds (configurable). If |offsetMs| <= perfectThresholdMs
 *    → "perfect"; if |offsetMs| <= goodThresholdMs → "good"; otherwise → "miss".
 *    If there is no tap for an expected note (user skipped or ran out of taps), that note is "miss".
 * 4. We only score the first N taps where N = expectedTimes.length. Extra taps are ignored
 *    (could be counted as "extra" in a future version).
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

/**
 * Score a practice session: compare tap times to expected note times.
 *
 * @param tapTimes - Array of tap times in AudioContext seconds (same clock as expectedTimes).
 * @param expectedTimes - Array of expected hit times from the note scheduler.
 * @param thresholds - Optional. Perfect and good bands in ms; defaults to DEFAULT_THRESHOLDS.
 * @returns One HitResult per expected note. Tap i is matched to expected i. Missing taps → miss.
 */
export function scoreSession(
  tapTimes: number[],
  expectedTimes: number[],
  thresholds: ScoringThresholds = DEFAULT_THRESHOLDS
): HitResult[] {
  const results: HitResult[] = [];

  for (let i = 0; i < expectedTimes.length; i++) {
    const expectedTime = expectedTimes[i];
    const tapTime = i < tapTimes.length ? tapTimes[i] : null;

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

    // Offset in milliseconds. Negative = early, positive = late.
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
