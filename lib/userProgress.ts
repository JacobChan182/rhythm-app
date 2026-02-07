/**
 * Minimal Firestore persistence for MVP: last BPM and optional practice stats.
 * Tradeoff: one document per user keeps reads/writes simple; we don't need subcollections yet.
 */

import {
  doc,
  getDoc,
  setDoc,
  getFirebaseDb,
} from "firebase/firestore";
import type { User } from "firebase/auth";

export type UserProgress = {
  lastBpm: number;
  updatedAt: string; // ISO
};

const COLLECTION = "users";
const DEFAULT_BPM = 120;

export async function getUserProgress(user: User): Promise<UserProgress | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION, user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProgress;
  } catch {
    return null;
  }
}

export async function saveLastBpm(user: User, bpm: number): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION, user.uid);
    await setDoc(
      ref,
      {
        lastBpm: Math.max(40, Math.min(240, bpm)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Non-blocking; don't break UX if Firestore fails
  }
}

export function getDefaultBpm(progress: UserProgress | null): number {
  if (!progress || typeof progress.lastBpm !== "number") return DEFAULT_BPM;
  return Math.max(40, Math.min(240, progress.lastBpm));
}
