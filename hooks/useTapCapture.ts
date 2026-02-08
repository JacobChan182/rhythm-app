import { useState, useCallback, useEffect, useRef } from "react";
import { getAudioContextTime } from "@/lib/metronome";

export type TapHand = "L" | "R";

/**
 * A single tap: timestamp is on the AudioContext clock (same as metronome beats).
 */
export type Tap = {
  time: number;
  hand: TapHand;
};

const TAP_FLASH_MS = 150;

/**
 * Captures tap timestamps using AudioContext time so they stay in sync with the
 * metronome (one time base for future scoring). Taps are stored in memory for
 * the current exercise; call clearTaps() when starting a new run.
 * Left/right hand is recorded for each tap (L = left click/tap, R = right click/tap).
 */
export function useTapCapture() {
  const [taps, setTaps] = useState<Tap[]>([]);
  const [tapFlashHand, setTapFlashHand] = useState<TapHand | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerTap = useCallback((hand: TapHand) => {
    const time = getAudioContextTime();
    if (time <= 0) return; // No context (e.g. non-web)
    setTaps((prev) => [...prev, { time, hand }]);
    setTapFlashHand(hand);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setTapFlashHand(null);
      flashTimeoutRef.current = null;
    }, TAP_FLASH_MS);
  }, []);

  const clearTaps = useCallback(() => {
    setTaps([]);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setTapFlashHand(null);
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
    tapFlashHand,
  };
}
