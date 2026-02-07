# Tap timing and synchronization

## How timing is synchronized

All timing uses a **single clock**: the Web Audio API `AudioContext.currentTime`.

- **Metronome:** Beats are scheduled at exact `currentTime` values (e.g. `t`, `t + 60/bpm`, …). Playback is driven by the audio engine, not JS timers.
- **Taps:** When the user taps, we read `getAudioContextTime()` (which returns the same `AudioContext.currentTime`) and store that value. So each tap’s `time` is in the **same time base** as every metronome beat.

Because taps and beats share one clock:

- You can compare a tap time to the nearest beat time to compute drift or score later (e.g. `nearestBeatTime = round((tapTime - startTime) / beatDuration) * beatDuration`).
- There is no mismatch between “JS time” (Date.now) and “audio time”; we never mix the two for timing.

## Implementation

- **`getAudioContextTime()`** in `lib/metronome.ts` returns the current time of the same `AudioContext` the metronome uses. Tap capture calls this on every tap.
- **`useTapCapture()`** stores an array of `{ time: number }` in memory. `time` is in seconds on the AudioContext clock. No scoring yet; the array is ready for future analysis.
- Taps are cleared when the user starts a new run (Start button), so each run has its own tap list for the current exercise.
