import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Rudiment } from "@/types/rudiment";

const COURSES = "courses";
const RUDIMENTS = "rudiments";
const PATTERN_LENGTH = 32;

/**
 * Parse course rudiment id "course:{courseId}:{rudimentId}".
 */
export function parseCourseRudimentId(
  id: string
): { courseId: string; rudimentId: string } | null {
  if (!id.startsWith("course:")) return null;
  const parts = id.slice(7).split(":");
  if (parts.length !== 2) return null;
  return { courseId: parts[0], rudimentId: parts[1] };
}

function normalizeCell(c: unknown): "" | "L" | "R" {
  if (c === "L" || c === "R") return c;
  return "";
}

/**
 * Fetch a course rudiment from Firestore and convert to Rudiment.
 * Pattern is 32 cells (16th notes); empty string = rest.
 */
export async function getCourseRudiment(
  courseId: string,
  rudimentId: string
): Promise<Rudiment | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COURSES, courseId, RUDIMENTS, rudimentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const raw = Array.isArray(data.pattern) ? data.pattern : [];
  const pattern: ("" | "L" | "R")[] = [];
  for (let i = 0; i < PATTERN_LENGTH; i++) {
    pattern.push(normalizeCell(raw[i]));
  }
  return {
    id: `course:${courseId}:${rudimentId}`,
    name: typeof data.name === "string" ? data.name : "Rudiment",
    bpm: 80,
    subdivision: "sixteenth",
    pattern,
  };
}
