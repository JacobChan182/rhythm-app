import { useState, useCallback, useEffect, useRef } from "react";
import { useMetronome } from "@/hooks/useMetronome";
import { useTapCapture } from "@/hooks/useTapCapture";
import type { User } from "firebase/auth";
import { getUserProgress, saveLastBpm, getDefaultBpm } from "@/lib/userProgress";
import { getAudioContextTime, getMetronomeFirstBeatTime } from "@/lib/metronome";
import {
  getExpectedHitTimesForRudiment,
  getExpectedHitTimesForRudimentCycles,
  getCycleDurationSeconds,
} from "@/lib/noteScheduler";
import { scoreSession, countByAccuracy, getThresholdsForBpm, ASSIGNMENT_WINDOW_MS, type HitResult } from "@/lib/scoring";
import { getAllRudiments, getRudimentById } from "@/lib/rudiments";
import { saveSession } from "@/lib/sessions";
import type { Rudiment } from "@/types/rudiment";

const MIN_BPM = 40;
const MAX_BPM = 240;
const COUNT_IN_BEATS = 4;

/**
 * TIMING: All of these use the same clock (AudioContext from lib/metronome).
 * - Audial metronome: schedules clicks at ctx.currentTime.
 * - Session start: getMetronomeFirstBeatTime() = time of first click.
 * - 1234 display: RAF with getAudioContextTime() vs sessionStartTimeRef / exerciseStartTimeRef.
 * - Beat visualizer (SlidingNoteLane): getAudioContextTime() for "now", expectedTimes in same seconds.
 * - Taps: getAudioContextTime() in useTapCapture.
 * - Scoring: tap times and expected times are both AudioContext seconds.
 * Do not introduce Date.now(), performance.now(), or another context.
 */
export type PracticePhase = "idle" | "exercising" | "summary";

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
  const [lastFeedbackAccuracy, setLastFeedbackAccuracy] = useState<"perfect" | "good" | "miss" | null>(null);
  const [summaryResults, setSummaryResults] = useState<HitResult[] | null>(null);
  const missShownForIndicesRef = useRef<Set<number>>(new Set());
  const lastFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownTapCountRef = useRef(0);
  /** AudioContext time when we last showed Perfect/Great; don't show Miss for a short period after. */
  const lastHitFeedbackTimeRef = useRef(0);

  const onBeatRef = useRef<((beat: number) => void) | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const exerciseStartTimeRef = useRef<number>(0);
  const cycleDurationRef = useRef<number>(0);
  const notesPerCycleRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const currentCycleIndexRef = useRef(0);
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
      const sessionStart = sessionStartTimeRef.current;
      const start = exerciseStartTimeRef.current;
      const cycleDur = cycleDurationRef.current;
      const bpm = bpmRef.current;
      const beatDuration = 60 / bpm;
      if (cycleDur <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Same clock as audio: count-in and exercise beat from AudioContext time
      if (now < start) {
        const countInBeat = Math.floor((now - sessionStart) / beatDuration) % 4;
        setCurrentBeatInCycle(countInBeat >= 0 ? countInBeat : 0);
      } else {
        const cycleIndex = Math.floor((now - start) / cycleDur);
        setCurrentCycleIndex((prev) => (cycleIndex > prev ? cycleIndex : prev));
        const cycleStart = start + cycleIndex * cycleDur;
        const elapsedInCycle = now - cycleStart;
        const beatInCycle = Math.floor(elapsedInCycle / beatDuration) % 4;
        setCurrentBeatInCycle(beatInCycle);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // Reset per-cycle "miss shown" when cycle advances
  useEffect(() => {
    if (phase !== "exercising") return;
    missShownForIndicesRef.current = new Set();
  }, [phase, currentCycleIndex]);

  // Real-time scoring for the current cycle only (ratio-based: error_ratio <= 0.02 Perfect, <= 0.05 Great)
  useEffect(() => {
    if (phase !== "exercising" && phase !== "summary") return;
    if (expectedTimes.length === 0 || !rudiment) return;
    const start = exerciseStartTimeRef.current;
    const cycleDur = cycleDurationRef.current;
    const notesPerCycle = notesPerCycleRef.current;
    if (cycleDur <= 0 || notesPerCycle <= 0) return;

    const cycleStart = start + currentCycleIndex * cycleDur;
    const cycleEnd = cycleStart + cycleDur;
    const assignmentWindowSec = ASSIGNMENT_WINDOW_MS / 1000;
    // Include taps slightly after cycleEnd so late hits on the last note still get feedback
    const tapsInCycle = tapCapture.taps
      .filter(
        (t) =>
          t.time >= cycleStart - assignmentWindowSec &&
          t.time < cycleEnd + assignmentWindowSec
      )
      .sort((a, b) => a.time - b.time)
      .map((t) => t.time);
    const expectedTimesThisCycle = getExpectedHitTimesForRudiment(
      cycleStart,
      bpmRef.current,
      rudiment
    );
    const thresholds = getThresholdsForBpm(bpmRef.current);
    const results = scoreSession(tapsInCycle, expectedTimesThisCycle, thresholds);
    results.forEach((r, i) => {
      if (r.offsetMs != null) {
        const sign = r.offsetMs >= 0 ? "+" : "";
        console.log(`Note ${i}: ${sign}${Math.round(r.offsetMs)} ms (${r.accuracy})`);
      } else {
        console.log(`Note ${i}: miss`);
      }
    });
    setLiveResults(results);
    // Show feedback for the tap that just happened (newest tap in this cycle), not just "max tapTime" result
    const currentTapCount = tapCapture.taps.length;
    if (currentTapCount === 0) lastShownTapCountRef.current = 0;
    const hasNewTap = currentTapCount > lastShownTapCountRef.current;
    if (hasNewTap && currentTapCount > 0) {
      lastShownTapCountRef.current = currentTapCount;
      const newestTapTime = tapCapture.taps[currentTapCount - 1].time;
      // Only consider if this tap is in the current cycle
      const isInCycle =
        newestTapTime >= cycleStart - assignmentWindowSec &&
        newestTapTime < cycleEnd + assignmentWindowSec;
      if (isInCycle) {
        let hitToShow: HitResult | null = null;
        for (const r of results) {
          if (r.tapTime != null && Math.abs(r.tapTime - newestTapTime) < 1e-9) {
            hitToShow = r;
            break;
          }
        }
        // Fallback: tap wasn't assigned (e.g. boundary), classify vs closest expected
        if (hitToShow == null && expectedTimesThisCycle.length > 0) {
          let bestOffsetMs = Infinity;
          for (const expectedTime of expectedTimesThisCycle) {
            const offsetMs = (newestTapTime - expectedTime) * 1000;
            if (Math.abs(offsetMs) < Math.abs(bestOffsetMs)) bestOffsetMs = offsetMs;
          }
          if (Math.abs(bestOffsetMs) <= thresholds.goodThresholdMs) {
            const abs = Math.abs(bestOffsetMs);
            hitToShow = {
              index: 0,
              expectedTime: 0,
              tapTime: newestTapTime,
              offsetMs: bestOffsetMs,
              accuracy: abs <= thresholds.perfectThresholdMs ? "perfect" : "good",
            };
          }
        }
        if (hitToShow) {
          if (lastFeedbackTimeoutRef.current) clearTimeout(lastFeedbackTimeoutRef.current);
          lastHitFeedbackTimeRef.current = getAudioContextTime();
          setLastFeedbackAccuracy(hitToShow.accuracy);
          lastFeedbackTimeoutRef.current = setTimeout(() => {
            setLastFeedbackAccuracy(null);
            lastFeedbackTimeoutRef.current = null;
          }, 400);
        }
      }
    }
  }, [phase, expectedTimes.length, currentCycleIndex, tapCapture.taps, rudiment]);

  currentCycleIndexRef.current = currentCycleIndex;

  // Display Miss when current_time > beat_time + miss_window (poll). Don't show Miss for a while after any hit so Perfect/Great always get seen.
  const MISS_WINDOW_RATIO = 0.05; // 5% of a beat after expected time
  const MISS_COOLDOWN_AFTER_HIT_BEATS = 0.5; // don't show Miss for 0.5 beats after showing Perfect/Great
  useEffect(() => {
    if (phase !== "exercising" || !rudiment) return;
    const interval = setInterval(() => {
      const now = getAudioContextTime();
      const start = exerciseStartTimeRef.current;
      const cycleDur = cycleDurationRef.current;
      const notesPerCycle = notesPerCycleRef.current;
      const bpm = bpmRef.current;
      if (cycleDur <= 0 || notesPerCycle <= 0) return;
      const cycleIdx = currentCycleIndexRef.current;
      const cycleStart = start + cycleIdx * cycleDur;
      const beatMs = 60000 / bpm;
      const beatSec = 60 / bpm;
      const missWindowSec = (MISS_WINDOW_RATIO * beatMs) / 1000;
      const missCooldownSec = MISS_COOLDOWN_AFTER_HIT_BEATS * beatSec;
      const expectedTimesThisCycle = getExpectedHitTimesForRudiment(
        cycleStart,
        bpm,
        rudiment
      );
      const assignmentWindowSec = ASSIGNMENT_WINDOW_MS / 1000;
      const cycleEnd = cycleStart + cycleDur;
      const tapsInCycle = tapCapture.taps
        .filter(
          (t) =>
            t.time >= cycleStart - assignmentWindowSec &&
            t.time < cycleEnd + assignmentWindowSec
        )
        .sort((a, b) => a.time - b.time)
        .map((t) => t.time);
      const thresholds = getThresholdsForBpm(bpm);
      const results = scoreSession(tapsInCycle, expectedTimesThisCycle, thresholds);
      setLiveResults(results);
      const recentlyShowedHit = now - lastHitFeedbackTimeRef.current < missCooldownSec;
      for (let i = 0; i < expectedTimesThisCycle.length; i++) {
        const beatTime = expectedTimesThisCycle[i];
        if (
          now > beatTime + missWindowSec &&
          results[i].accuracy === "miss" &&
          !missShownForIndicesRef.current.has(i) &&
          lastFeedbackTimeoutRef.current == null &&
          !recentlyShowedHit
        ) {
          missShownForIndicesRef.current.add(i);
          setLastFeedbackAccuracy("miss");
          lastFeedbackTimeoutRef.current = setTimeout(() => {
            setLastFeedbackAccuracy(null);
            lastFeedbackTimeoutRef.current = null;
          }, 400);
          break;
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [phase, rudiment, tapCapture.taps]);

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
          tapCapture.clearTaps();
          onBeatRef.current = null;
        }
        return next;
      });
    };

    await metronome.start();
    const firstBeat = getMetronomeFirstBeatTime();
    sessionStartTimeRef.current = firstBeat > 0 ? firstBeat : getAudioContextTime();
    setSessionStartTime(sessionStartTimeRef.current);

    const start = sessionStartTimeRef.current;
    const exerciseStartTime = start + COUNT_IN_BEATS * (60 / clamped);
    exerciseStartTimeRef.current = exerciseStartTime;
    const cycleDuration = getCycleDurationSeconds(
      clamped,
      rudiment.subdivision,
      rudiment.pattern.length
    );
    cycleDurationRef.current = cycleDuration;
    const timesForCycle = getExpectedHitTimesForRudiment(
      exerciseStartTime,
      clamped,
      rudiment
    );
    notesPerCycleRef.current = timesForCycle.length;
    setExpectedTimes(timesForCycle);
    setExpectedTimesExtended(
      getExpectedHitTimesForRudimentCycles(
        exerciseStartTime,
        clamped,
        rudiment,
        30
      )
    );

    setPhase("exercising");
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
      const thresholds = getThresholdsForBpm(metronome.bpm);
      results = scoreSession(tapTimes, expectedAll, thresholds);
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
    lastFeedbackAccuracy,
    summaryResults,
    counts,
  };
}
