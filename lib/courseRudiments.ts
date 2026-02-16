import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Rudiment } from "@/types/rudiment";

const COURSES = "courses";
const RUDIMENTS = "rudiments";
const PATTERN_LENGTH = 32;

export interface CourseRudimentSummary {
  id: string;
  name: string;
  order: number;
}

/**
 * List rudiments in a course (from subcollection), ordered by order.
 * id is the full course rudiment id: course:{courseId}:{rudimentId}.
 */
export async function getRudimentsByCourseId(
  courseId: string
): Promise<CourseRudimentSummary[]> {
  const db = getFirebaseDb();
  const ref = collection(db, COURSES, courseId, RUDIMENTS);
  const q = query(ref, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: `course:${courseId}:${d.id}`,
      name: typeof data.name === "string" ? data.name : "Rudiment",
      order: typeof data.order === "number" ? data.order : 0,
    };
  });
}

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
