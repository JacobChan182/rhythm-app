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
 * A rudiment or exercise: name, tempo, subdivision, and a R/L pattern.
 * Pattern length and subdivision together define the rhythm (e.g. 8 eighths = one bar of 4/4 at eighth subdivision).
 */
export interface Rudiment {
  id: string;
  name: string;
  bpm: number;
  subdivision: Subdivision;
  pattern: Stroke[];
}
