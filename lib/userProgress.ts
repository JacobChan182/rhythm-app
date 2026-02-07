/**
 * Minimal Firestore persistence for MVP: last BPM and optional practice stats.
 * Tradeoff: one document per user keeps reads/writes simple; we don't need subcollections yet.
 */

import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";

export type UserProgress = {
  lastBpm: number;
  updatedAt: string; // ISO
  username?: string;
  email?: string;
};

const COLLECTION = "users";
const USERNAMES_COLLECTION = "usernames";
const DEFAULT_BPM = 120;

/** Normalize for case-insensitive uniqueness (e.g. "CoolUser" and "cooluser" are the same). */
export function normalizeUsername(s: string): string {
  return s.trim().toLowerCase();
}

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

/**
 * Check if a username is available (no other user has claimed it).
 * Uses normalized (lowercase) form for case-insensitive uniqueness.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  const db = getFirebaseDb();
  const ref = doc(db, USERNAMES_COLLECTION, normalized);
  const snap = await getDoc(ref);
  return !snap.exists();
}

/**
 * Reserve the username and save user profile in one transaction.
 * Ensures only one user can claim a given username (case-insensitive).
 * @throws Error("Username taken") if the username is already taken.
 */
export async function reserveUsernameAndSaveProfile(
  user: User,
  data: { username: string; email: string }
): Promise<void> {
  const usernameTrimmed = data.username.trim();
  const normalized = normalizeUsername(usernameTrimmed);
  if (!normalized) throw new Error("Invalid username");

  const db = getFirebaseDb();
  const usernameRef = doc(db, USERNAMES_COLLECTION, normalized);
  const userRef = doc(db, COLLECTION, user.uid);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(usernameRef);
    if (snap.exists()) {
      throw new Error("Username taken");
    }
    transaction.set(usernameRef, { userId: user.uid });
    transaction.set(userRef, {
      username: usernameTrimmed,
      email: data.email.trim(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

/**
 * Create or update user profile with username and email (e.g. on sign-up).
 * Does NOT check uniqueness; use reserveUsernameAndSaveProfile for sign-up.
 * Use merge: true so we don't overwrite lastBpm.
 */
export async function saveUserProfile(
  user: User,
  data: { username: string; email: string }
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTION, user.uid);
    await setDoc(
      ref,
      {
        username: data.username.trim(),
        email: data.email.trim(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Non-blocking
  }
}

export function getDefaultBpm(progress: UserProgress | null): number {
  if (!progress || typeof progress.lastBpm !== "number") return DEFAULT_BPM;
  return Math.max(40, Math.min(240, progress.lastBpm));
}
