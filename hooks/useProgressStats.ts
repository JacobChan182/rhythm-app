import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import type { ProgressStats } from "@/types/progress";
import { getAggregateStats } from "@/lib/sessions";

const DEFAULT_STATS: ProgressStats = {
  sessionsCount: 0,
  totalMinutes: 0,
  totalPerfect: 0,
  totalGood: 0,
  totalMiss: 0,
};

/**
 * Fetches aggregate practice stats from Firestore (sessions for the user).
 * Refetches when userId changes.
 */
export function useProgressStats(user: User | null): ProgressStats & { loading: boolean } {
  const [stats, setStats] = useState<ProgressStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(DEFAULT_STATS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAggregateStats(user)
      .then((aggregate) => {
        if (cancelled) return;
        setStats({
          sessionsCount: aggregate.sessionsCount,
          totalMinutes: aggregate.totalMinutes,
          totalPerfect: aggregate.totalPerfect,
          totalGood: aggregate.totalGood,
          totalMiss: aggregate.totalMiss,
        });
      })
      .catch(() => {
        if (!cancelled) setStats(DEFAULT_STATS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { ...stats, loading };
}
