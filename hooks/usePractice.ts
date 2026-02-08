import { useState, useCallback, useEffect, useRef } from "react";
import { useMetronome } from "@/hooks/useMetronome";
import { useTapCapture } from "@/hooks/useTapCapture";
import type { User } from "firebase/auth";
import { getUserProgress, saveLastBpm, getDefaultBpm } from "@/lib/userProgress";
import { getAudioContextTime } from "@/lib/metronome";
import {
  getExpectedHitTimesForRudiment,
  getExpectedHitTimesForRudimentCycles,
  getCycleDurationSeconds,
} from "@/lib/noteScheduler";
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
  const [expectedTimesExtended, setExpectedTimesExtended] = useState<number[]>([]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [liveResults, setLiveResults] = useState<HitResult[]>([]);
  const [summaryResults, setSummaryResults] = useState<HitResult[] | null>(null);

  const onBeatRef = useRef<((beat: number) => void) | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const exerciseStartTimeRef = useRef<number>(0);
  const cycleDurationRef = useRef<number>(0);
  const notesPerCycleRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [currentBeatInCycle, setCurrentBeatInCycle] = useState(-1);

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

  // Keep bpm ref in sync for RAF
  bpmRef.current = metronome.bpm;

  // Advance current cycle index and beat-within-cycle while exercising (timer resets each loop)
  useEffect(() => {
    if (phase !== "exercising") return;
    mountedRef.current = true;
    const tick = () => {
      if (!mountedRef.current) return;
      const now = getAudioContextTime();
      const start = exerciseStartTimeRef.current;
      const cycleDur = cycleDurationRef.current;
      const bpm = bpmRef.current;
      if (cycleDur <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const cycleIndex = Math.floor((now - start) / cycleDur);
      setCurrentCycleIndex((prev) => (cycleIndex > prev ? cycleIndex : prev));
      const cycleStart = start + cycleIndex * cycleDur;
      const beatDuration = 60 / bpm;
      const elapsedInCycle = now - cycleStart;
      const beatInCycle = Math.floor(elapsedInCycle / beatDuration) % 4;
      setCurrentBeatInCycle(beatInCycle);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // Real-time scoring for the current cycle only (use current cycle's expected times so tap timer resets each loop)
  useEffect(() => {
    if (phase !== "exercising" && phase !== "summary") return;
    if (expectedTimes.length === 0 || !rudiment) return;
    const start = exerciseStartTimeRef.current;
    const cycleDur = cycleDurationRef.current;
    const notesPerCycle = notesPerCycleRef.current;
    if (cycleDur <= 0 || notesPerCycle <= 0) return;

    const cycleStart = start + currentCycleIndex * cycleDur;
    const cycleEnd = cycleStart + cycleDur;
    const tapsInCycle = tapCapture.taps
      .filter((t) => t.time >= cycleStart && t.time < cycleEnd)
      .sort((a, b) => a.time - b.time)
      .map((t) => t.time);
    const expectedTimesThisCycle = getExpectedHitTimesForRudiment(
      cycleStart,
      bpmRef.current,
      rudiment
    );
    const results = scoreSession(tapsInCycle, expectedTimesThisCycle);
    setLiveResults(results);
  }, [phase, expectedTimes.length, currentCycleIndex, tapCapture.taps, rudiment]);

  const handleStartStop = useCallback(async () => {
    if (metronome.running) {
      metronome.stop();
      if (user) saveLastBpm(user, metronome.bpm);
      setPhase("idle");
      setSummaryResults(null);
      setExpectedTimes([]);
      setExpectedTimesExtended([]);
      setCurrentCycleIndex(0);
      setCurrentBeatInCycle(-1);
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
    setExpectedTimesExtended([]);
    setCurrentCycleIndex(0);
    setCurrentBeatInCycle(-1);
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
          const cycleDuration = getCycleDurationSeconds(
            metronome.bpm,
            rudiment.subdivision,
            rudiment.pattern.length
          );
          cycleDurationRef.current = cycleDuration;
          notesPerCycleRef.current = times.length;
          setExpectedTimes(times);
          setExpectedTimesExtended(
            getExpectedHitTimesForRudimentCycles(
              exerciseStartTime,
              metronome.bpm,
              rudiment,
              80
            )
          );
          setCurrentCycleIndex(0);
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
    const notesPerCycle = notesPerCycleRef.current;
    let results: HitResult[] = [];
    if (notesPerCycle > 0 && rudiment) {
      const cyclesPlayed = Math.ceil(tapTimes.length / notesPerCycle);
      const expectedAll = getExpectedHitTimesForRudimentCycles(
        exerciseStartTimeRef.current,
        metronome.bpm,
        rudiment,
        Math.max(cyclesPlayed, 1)
      );
      results = scoreSession(tapTimes, expectedAll);
    }
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
  }, [metronome, tapCapture.taps, user, rudiment]);

  const dismissSummary = useCallback(() => {
    setPhase("idle");
    setSummaryResults(null);
    setExpectedTimes([]);
    setExpectedTimesExtended([]);
    setCurrentCycleIndex(0);
    setCurrentBeatInCycle(-1);
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
    sound: metronome.sound,
    onSoundChange: metronome.setSound,
    currentBeat: metronome.currentBeat,
    currentBeatInCycle,
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
    expectedTimesExtended,
    liveResults,
    summaryResults,
    counts,
  };
}
