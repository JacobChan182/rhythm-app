/**
 * Subdivision of the beat the rudiment is written in.
 * Affects how the pattern aligns to the metronome (e.g. eighth = 2 strokes per click at quarter-note pulse).
 */
export type Subdivision = "quarter" | "eighth" | "sixteenth";

/**
 * Single hand stroke in a pattern.
 */
export type Stroke = "R" | "L";

/**
 * One cell in a pattern: L, R, or rest (empty string).
 */
export type PatternCell = Stroke | "";

/**
 * A rudiment or exercise: name, tempo, subdivision, and a pattern (L/R/rest).
 * Pattern may include "" for rest (e.g. course rudiments with 32 sixteenths).
 */
export interface Rudiment {
  id: string;
  name: string;
  bpm: number;
  subdivision: Subdivision;
  pattern: PatternCell[];
}
