import { useState, useCallback, useRef } from "react";
import {
  startMetronome,
  stopMetronome,
  isWeb,
  setMetronomeBpm,
  getMetronomeBpm,
} from "@/lib/metronome";

const MIN_BPM = 20;
const MAX_BPM = 300;

export type UseMetronomeOptions = {
  /** Called on every metronome beat (0–3). Use for count-in etc. */
  onBeat?: (beatIndex: number) => void;
};

export type UseMetronomeResult = {
  /** Whether Web Audio API is available (web). */
  isWeb: boolean;
  /** Current BPM (clamped). */
  bpm: number;
  /** Set BPM; takes effect on next start or immediately if running. */
  setBpm: (value: number) => void;
  /** Whether the metronome is currently running. */
  running: boolean;
  /** Start the metronome. Call from a user gesture (e.g. button tap). */
  start: () => Promise<void>;
  /** Stop the metronome. */
  stop: () => void;
  /** Current beat in bar (0–3), or -1 when stopped. */
  currentBeat: number;
};

/**
 * Reusable metronome hook. Uses Web Audio API on web; timing is driven by
 * AudioContext clock (see lib/metronome.ts). No setInterval for beat timing.
 */
export function useMetronome(
  initialBpm: number = 120,
  options: UseMetronomeOptions = {}
): UseMetronomeResult {
  const [running, setRunning] = useState(false);
  const [bpm, setBpmState] = useState(() =>
    Math.max(MIN_BPM, Math.min(MAX_BPM, initialBpm))
  );
  const [currentBeat, setCurrentBeat] = useState(-1);
  const onBeatRef = useRef<(i: number) => void>(() => {});
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setBpm = useCallback((value: number) => {
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, value));
    setBpmState(clamped);
    setMetronomeBpm(clamped);
  }, []);

  const start = useCallback(async () => {
    if (!isWeb()) return;
    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
    setMetronomeBpm(clamped);
    onBeatRef.current = setCurrentBeat;
    const started = await startMetronome(clamped, (beatIndex) => {
      onBeatRef.current(beatIndex);
      optionsRef.current.onBeat?.(beatIndex);
    });
    setRunning(started);
    if (!started) setCurrentBeat(-1);
  }, [bpm]);

  const stop = useCallback(() => {
    stopMetronome();
    setRunning(false);
    setCurrentBeat(-1);
  }, []);

  return {
    isWeb: isWeb(),
    bpm,
    setBpm,
    running,
    start,
    stop,
    currentBeat,
  };
}
