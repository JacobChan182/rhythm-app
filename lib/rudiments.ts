import type { Rudiment } from "@/types/rudiment";

/**
 * Static rudiment/exercise data. Replace with JSON load or Firestore later if needed.
 */
export const RUDIMENTS: Rudiment[] = [
  {
    id: "paradiddle-1",
    name: "Paradiddle",
    bpm: 80,
    subdivision: "eighth",
    pattern: ["R", "L", "R", "R", "L", "R", "L", "L"],
  },
];

export function getRudimentById(id: string): Rudiment | undefined {
  return RUDIMENTS.find((r) => r.id === id);
}

export function getAllRudiments(): Rudiment[] {
  return [...RUDIMENTS];
}
