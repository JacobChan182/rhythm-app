import { useState, useEffect } from "react";
import { getRudimentById } from "@/lib/rudiments";
import { parseCourseRudimentId, getCourseRudiment } from "@/lib/courseRudiments";
import type { Rudiment } from "@/types/rudiment";

/**
 * Resolve rudimentId to a Rudiment (static list or course rudiment from Firestore).
 */
export function useResolvedRudiment(rudimentId: string | undefined): {
  rudiment: Rudiment | null;
  loading: boolean;
} {
  const [rudiment, setRudiment] = useState<Rudiment | null>(() => {
    if (!rudimentId) return null;
    const parsed = parseCourseRudimentId(rudimentId);
    if (!parsed) return getRudimentById(rudimentId) ?? null;
    return null;
  });
  const [loading, setLoading] = useState(!!rudimentId && rudiment === null && parseCourseRudimentId(rudimentId ?? "") != null);

  useEffect(() => {
    if (!rudimentId) {
      setRudiment(null);
      setLoading(false);
      return;
    }
    const parsed = parseCourseRudimentId(rudimentId);
    if (!parsed) {
      setRudiment(getRudimentById(rudimentId) ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCourseRudiment(parsed.courseId, parsed.rudimentId)
      .then((r) => {
        setRudiment(r);
      })
      .catch(() => {
        setRudiment(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rudimentId]);

  return { rudiment, loading };
}
