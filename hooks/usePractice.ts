import { useState, useCallback, useEffect, useRef } from "react";
import { useMetronome } from "@/hooks/useMetronome";
import { useTapCapture } from "@/hooks/useTapCapture";
import type { User } from "firebase/auth";
import { getUserProgress, saveLastBpm, getDefaultBpm } from "@/lib/userProgress";
import { getAudioContextTime } from "@/lib/metronome";
import { getExpectedHitTimesForRudiment } from "@/lib/noteScheduler";
import { scoreSession, countByAccuracy, type HitResult } from "@/lib/scoring";
import { getAllRudiments, getRudimentById } from "@/lib/rudiments";
import { saveSession } from "@/lib/sessions";
import type { Rudiment } from "@/types/rudiment";

const MIN_BPM = 40;
const MAX_BPM = 240;
const COUNT_IN_BEATS = 4;

export type PracticePhase = "idle" | "count-in" | "exercising" | "summary";

export type UsePracticeOptions = {
  /** Pre-resolved rudiment (e.g. from useResolvedRudiment). When set, rudimentId is ignored. */
  rudiment?: Rudiment | null;
  rudimentId?: string;
  initialBpm?: number;
};

export function usePractice(user: User | null, options?: UsePracticeOptions) {
  const rudimentFromOptions =
    options?.rudiment !== undefined
      ? options.rudiment
      : options?.rudimentId != null
        ? getRudimentById(options.rudimentId)
        : undefined;
  const rudiment = rudimentFromOptions ?? getAllRudiments()[0] ?? null;
  const initialBpm =
    options?.initialBpm != null
      ? Math.min(MAX_BPM, Math.max(MIN_BPM, options.initialBpm))
      : null;

  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [countInBeatsSeen, setCountInBeatsSeen] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [expectedTimes, setExpectedTimes] = useState<number[]>([]);
  const [liveResults, setLiveResults] = useState<HitResult[]>([]);
  const [summaryResults, setSummaryResults] = useState<HitResult[] | null>(null);

  const onBeatRef = useRef<((beat: number) => void) | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const exerciseStartTimeRef = useRef<number>(0);

  const defaultBpm = initialBpm ?? 120;
  const metronome = useMetronome(defaultBpm, {
    onBeat: (beatIndex) => {
      onBeatRef.current?.(beatIndex);
    },
  });
  const tapCapture = useTapCapture();
  const [bpmInput, setBpmInput] = useState(String(defaultBpm));
  const [progressLoaded, setProgressLoaded] = useState(initialBpm != null);

  useEffect(() => {
    if (!user || progressLoaded) return;
    let cancelled = false;
    getUserProgress(user).then((progress) => {
      if (cancelled) return;
      const bpm = getDefaultBpm(progress);
      metronome.setBpm(bpm);
      setBpmInput(String(bpm));
      setProgressLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when user/progressLoaded changes
  }, [user, progressLoaded]);

  // Real-time scoring for the note lane (exercising) or summary display
  useEffect(() => {
    if (phase !== "exercising" && phase !== "summary") return;
    if (expectedTimes.length === 0) return;
    const tapTimes = tapCapture.taps.map((t) => t.time);
    const results = scoreSession(tapTimes, expectedTimes);
    setLiveResults(results);
  }, [phase, expectedTimes, tapCapture.taps]);

  const handleStartStop = useCallback(async () => {
    if (metronome.running) {
      metronome.stop();
      if (user) saveLastBpm(user, metronome.bpm);
      setPhase("idle");
      setSummaryResults(null);
      setExpectedTimes([]);
      setLiveResults([]);
      setCountInBeatsSeen(0);
      setSessionStartTime(null);
      return;
    }
    if (!rudiment) return;
    const value = parseInt(bpmInput, 10);
    const clamped = isNaN(value) ? 120 : Math.min(MAX_BPM, Math.max(MIN_BPM, value));
    metronome.setBpm(clamped);
    setBpmInput(String(clamped));
    tapCapture.clearTaps();
    setSummaryResults(null);
    setLiveResults([]);
    setExpectedTimes([]);
    setCountInBeatsSeen(0);

    onBeatRef.current = (beatIndex: number) => {
      setCountInBeatsSeen((prev) => {
        const next = prev + 1;
        if (next >= COUNT_IN_BEATS) {
          const start = sessionStartTimeRef.current;
          const exerciseStartTime = start + COUNT_IN_BEATS * (60 / metronome.bpm);
          exerciseStartTimeRef.current = exerciseStartTime;
          const times = getExpectedHitTimesForRudiment(
            exerciseStartTime,
            metronome.bpm,
            rudiment
          );
          setExpectedTimes(times);
          setPhase("exercising");
          tapCapture.clearTaps();
          onBeatRef.current = null;
        }
        return next;
      });
    };

    await metronome.start();
    sessionStartTimeRef.current = getAudioContextTime();
    setSessionStartTime(sessionStartTimeRef.current);
    setPhase("count-in");
  }, [metronome, bpmInput, user, rudiment, tapCapture.clearTaps]);

  const handleStopForSummary = useCallback(() => {
    if (!metronome.running) return;
    const tapTimes = tapCapture.taps.map((t) => t.time);
    const results = expectedTimes.length > 0 ? scoreSession(tapTimes, expectedTimes) : [];
    setSummaryResults(results);
    setPhase("summary");
    metronome.stop();
    if (user) {
      saveLastBpm(user, metronome.bpm);
      const counts = countByAccuracy(results);
      const durationSeconds = Math.max(
        0,
        getAudioContextTime() - exerciseStartTimeRef.current
      );
      saveSession(user, {
        rudimentName: rudiment?.name ?? "—",
        bpm: metronome.bpm,
        perfect: counts.perfect,
        good: counts.good,
        miss: counts.miss,
        durationSeconds,
      });
    }
  }, [metronome, tapCapture.taps, expectedTimes, user, rudiment]);

  const dismissSummary = useCallback(() => {
    setPhase("idle");
    setSummaryResults(null);
    setExpectedTimes([]);
    setLiveResults([]);
    setCountInBeatsSeen(0);
    setSessionStartTime(null);
  }, []);

  const handleBpmChange = useCallback(
    (text: string) => {
      setBpmInput(text);
      const value = parseInt(text, 10);
      if (!isNaN(value)) {
        metronome.setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, value)));
      }
    },
    []
  );

  const counts = summaryResults ? countByAccuracy(summaryResults) : null;

  return {
    phase,
    countInBeatsSeen,
    running: metronome.running,
    bpmInput,
    bpm: metronome.bpm,
    currentBeat: metronome.currentBeat,
    isWeb: metronome.isWeb,
    onBpmChange: handleBpmChange,
    onStartStop: handleStartStop,
    onStopForSummary: handleStopForSummary,
    dismissSummary,
    tapCount: tapCapture.tapCount,
    tapFlashHand: tapCapture.tapFlashHand,
    onTapLeft: () => tapCapture.registerTap("L"),
    onTapRight: () => tapCapture.registerTap("R"),
    rudiment,
    expectedTimes,
    liveResults,
    summaryResults,
    counts,
  };
}
