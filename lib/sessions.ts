import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";

const SESSIONS_COLLECTION = "sessions";

/**
 * Payload when saving a practice session.
 */
export type SessionWrite = {
  rudimentName: string;
  bpm: number;
  perfect: number;
  good: number;
  miss: number;
  durationSeconds: number;
};

/**
 * Stored session document (read from Firestore).
 */
export type SessionDoc = SessionWrite & {
  id: string;
  userId: string;
  createdAt: string; // ISO
};

/**
 * Save one practice session. Call after the user stops and we have summary counts.
 * Non-blocking: failures are caught and logged; UX is not blocked.
 */
export async function saveSession(
  user: User,
  data: SessionWrite
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const col = collection(db, SESSIONS_COLLECTION);
    await addDoc(col, {
      userId: user.uid,
      createdAt: new Date().toISOString(),
      rudimentName: data.rudimentName,
      bpm: data.bpm,
      perfect: data.perfect,
      good: data.good,
      miss: data.miss,
      durationSeconds: data.durationSeconds,
    });
  } catch (e) {
    // Non-blocking; don't break UX
    if (typeof console !== "undefined" && console.warn) {
      console.warn("Failed to save session", e);
    }
  }
}

/**
 * Fetch recent sessions for a user. Used for history or client-side aggregation.
 *
 * Example query:
 *   collection(db, 'sessions')
 *     .where('userId', '==', user.uid)
 *     .orderBy('createdAt', 'desc')
 *     .limit(500)
 */
export async function getSessionsForUser(
  user: User,
  maxSessions: number = 500
): Promise<SessionDoc[]> {
  try {
    const db = getFirebaseDb();
    const col = collection(db, SESSIONS_COLLECTION);
    const q = query(
      col,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(maxSessions)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId as string,
        createdAt: data.createdAt as string,
        rudimentName: data.rudimentName as string,
        bpm: data.bpm as number,
        perfect: data.perfect as number,
        good: data.good as number,
        miss: data.miss as number,
        durationSeconds: data.durationSeconds as number,
      } as SessionDoc;
    });
  } catch {
    return [];
  }
}

export type AggregateStats = {
  sessionsCount: number;
  totalMinutes: number;
  totalPerfect: number;
  totalGood: number;
  totalMiss: number;
};

/**
 * Compute aggregate stats from all sessions for the user.
 * Fetches sessions then sums in the client (no server-side aggregation in this MVP).
 *
 * Example: getSessionsForUser(user) then reduce to totals.
 */
export async function getAggregateStats(user: User): Promise<AggregateStats> {
  const sessions = await getSessionsForUser(user);
  let totalSeconds = 0;
  let totalPerfect = 0;
  let totalGood = 0;
  let totalMiss = 0;
  for (const s of sessions) {
    totalSeconds += s.durationSeconds ?? 0;
    totalPerfect += s.perfect ?? 0;
    totalGood += s.good ?? 0;
    totalMiss += s.miss ?? 0;
  }
  return {
    sessionsCount: sessions.length,
    totalMinutes: Math.round((totalSeconds / 60) * 10) / 10,
    totalPerfect,
    totalGood,
    totalMiss,
  };
}
