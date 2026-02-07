import { useState, useCallback, useEffect, useRef } from "react";
import { getAudioContextTime } from "@/lib/metronome";

/**
 * A single tap: timestamp is on the AudioContext clock (same as metronome beats).
 */
export type Tap = {
  time: number;
};

const TAP_FLASH_MS = 150;

/**
 * Captures tap timestamps using AudioContext time so they stay in sync with the
 * metronome (one time base for future scoring). Taps are stored in memory for
 * the current exercise; call clearTaps() when starting a new run.
 */
export function useTapCapture() {
  const [taps, setTaps] = useState<Tap[]>([]);
  const [tapFlash, setTapFlash] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerTap = useCallback(() => {
    const time = getAudioContextTime();
    if (time <= 0) return; // No context (e.g. non-web)
    setTaps((prev) => [...prev, { time }]);
    setTapFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setTapFlash(false);
      flashTimeoutRef.current = null;
    }, TAP_FLASH_MS);
  }, []);

  const clearTaps = useCallback(() => {
    setTaps([]);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setTapFlash(false);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return {
    taps,
    tapCount: taps.length,
    registerTap,
    clearTaps,
    tapFlash,
  };
}
