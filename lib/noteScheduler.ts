import type { Subdivision } from "@/types/rudiment";

/**
 * Notes per beat for each subdivision (in 4/4: one beat = one quarter note).
 * Quarter = 1, eighth = 2, sixteenth = 4, eighthTriplet = 3.
 */
const NOTES_PER_BEAT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  eighthTriplet: 3,
};

/**
 * Compute the time step in seconds for one note at the given BPM and subdivision.
 * Deterministic: step = (60 / bpm) / notesPerBeat.
 */
export function stepSeconds(bpm: number, subdivision: Subdivision): number {
  const beatDuration = 60 / bpm;
  return beatDuration / NOTES_PER_BEAT[subdivision];
}

/**
 * Duration in seconds of one full pattern cycle (patternLength steps).
 */
export function getCycleDurationSeconds(
  bpm: number,
  subdivision: Subdivision,
  patternLength: number
): number {
  return patternLength * stepSeconds(bpm, subdivision);
}

/**
 * Generate expected hit times (in AudioContext time) for a rudiment exercise.
 * Pure and deterministic: same inputs always produce the same array.
 *
 * @param startTime - When the exercise starts on the AudioContext clock (seconds).
 * @param bpm - Tempo in beats per minute.
 * @param subdivision - Grid for the pattern (quarter, eighth, sixteenth).
 * @param patternLength - Number of hits (e.g. pattern.length). Each hit is one step apart.
 * @returns Array of expected hit times in seconds, one per pattern note.
 */
export function getExpectedHitTimes(
  startTime: number,
  bpm: number,
  subdivision: Subdivision,
  patternLength: number
): number[] {
  const step = stepSeconds(bpm, subdivision);
  const times: number[] = [];
  for (let i = 0; i < patternLength; i++) {
    times.push(startTime + i * step);
  }
  return times;
}

/**
 * Generate expected hit times for a pattern that may include rests ("").
 * Only returns a time for each non-rest cell. Used for course rudiments (e.g. 32 sixteenths with some rests).
 */
export function getExpectedHitTimesFromPattern(
  startTime: number,
  bpm: number,
  subdivision: Subdivision,
  pattern: (string | null)[]
): number[] {
  const step = stepSeconds(bpm, subdivision);
  const times: number[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const cell = pattern[i];
    if (cell === "L" || cell === "R") {
      times.push(startTime + i * step);
    }
  }
  return times;
}

/**
 * Expected hit times for a rudiment. Uses session BPM (passed in), not rudiment.bpm.
 * Supports patterns with rests (e.g. course rudiments with 32 cells, some "").
 */
export function getExpectedHitTimesForRudiment(
  startTime: number,
  bpm: number,
  rudiment: { subdivision: Subdivision; pattern: unknown[] }
): number[] {
  const pattern = rudiment.pattern as (string | null)[];
  const hasRests = pattern.some((c) => c === "" || c == null);
  if (hasRests) {
    return getExpectedHitTimesFromPattern(startTime, bpm, rudiment.subdivision, pattern);
  }
  return getExpectedHitTimes(startTime, bpm, rudiment.subdivision, rudiment.pattern.length);
}

/**
 * Expected hit times for multiple consecutive cycles (for looping display).
 */
export function getExpectedHitTimesForRudimentCycles(
  startTime: number,
  bpm: number,
  rudiment: { subdivision: Subdivision; pattern: unknown[] },
  cycleCount: number
): number[] {
  const pattern = rudiment.pattern as (string | null)[];
  const cycleDuration = getCycleDurationSeconds(bpm, rudiment.subdivision, pattern.length);
  const out: number[] = [];
  for (let c = 0; c < cycleCount; c++) {
    const cycleStart = startTime + c * cycleDuration;
    const times = getExpectedHitTimesForRudiment(cycleStart, bpm, rudiment);
    out.push(...times);
  }
  return out;
}

/*
 * Example usage with paradiddle:
 *
 *   import { getExpectedHitTimesForRudiment } from "@/lib/noteScheduler";
 *   import { getRudimentById } from "@/lib/rudiments";
 *   import { getAudioContextTime } from "@/lib/metronome";
 *
 *   const paradiddle = getRudimentById("paradiddle-1")!;
 *   const startTime = getAudioContextTime();  // e.g. when user hits Start
 *
 *   const expectedTimes = getExpectedHitTimesForRudiment(startTime, paradiddle);
 *   // Paradiddle: 8 eighths at 80 BPM → step = (60/80)/2 = 0.375 s
 *   // expectedTimes = [startTime, startTime+0.375, startTime+0.75, ...] (8 values)
 *
 *   // For scoring: compare each tap time to the nearest value in expectedTimes.
 */
