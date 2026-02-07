import type { Subdivision } from "@/types/rudiment";

/**
 * Notes per beat for each subdivision (in 4/4: one beat = one quarter note).
 * Quarter = 1 hit per beat, eighth = 2, sixteenth = 4.
 */
const NOTES_PER_BEAT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
};

/**
 * Compute the time step in seconds for one note at the given BPM and subdivision.
 * Deterministic: step = (60 / bpm) / notesPerBeat.
 */
function stepSeconds(bpm: number, subdivision: Subdivision): number {
  const beatDuration = 60 / bpm;
  return beatDuration / NOTES_PER_BEAT[subdivision];
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
 * Example: paradiddle at 80 BPM, eighth-note subdivision, 8 strokes.
 * One bar at 80 BPM = 60/80 = 0.75 s; eighth step = 0.75/2 = 0.375 s.
 * Hits at start, start+0.375, start+0.75, ... (8 times).
 */
export function getExpectedHitTimesForRudiment(
  startTime: number,
  rudiment: { bpm: number; subdivision: Subdivision; pattern: unknown[] }
): number[] {
  return getExpectedHitTimes(
    startTime,
    rudiment.bpm,
    rudiment.subdivision,
    rudiment.pattern.length
  );
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
