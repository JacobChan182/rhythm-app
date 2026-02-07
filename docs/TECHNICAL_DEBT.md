# Technical debt & next steps

## 1. Simplifications (low risk)

| Item | Where | Note |
|------|--------|------|
| **Single rudiment** | `usePractice`, `getAllRudiments()[0]` | No rudiment picker; paradiddle only. Add selection or list when adding more rudiments. |
| **BPM in two places** | `bpmInput` (string) + `metronome.bpm` (number) | Kept for controlled input; could derive one from the other to avoid drift. |
| **Module-level metronome state** | `lib/metronome.ts` | Single global instance. Fine for one Practice screen; awkward if multiple metronomes or tests. |
| **Progress aggregation in client** | `getAggregateStats()` | Fetches up to 500 sessions and sums in JS. Scale: add Firestore aggregation (e.g. Cloud Functions) or a per-user summary doc updated on each write. |
| **No Firestore index documented** | `lib/sessions.ts` | Query `userId` + `orderBy('createdAt')` may require a composite index; doc mentions it but not in code. |
| **Scoring: order-based only** | `lib/scoring.ts` | Tap i ↔ expected i. No handling of skipped notes or double-taps; extra taps ignored. |

---

## 2. Timing risks

| Risk | Where | Mitigation |
|------|--------|------------|
| **sessionStartTime set after start()** | `usePractice`: `sessionStartTimeRef.current = getAudioContextTime()` after `await metronome.start()` | First beat is at `ctx.currentTime` when `startMetronome` ran; we sample slightly later. Small positive bias (exercise start a few ms late). Fix: have `startMetronome` return the scheduled start time or pass it to a callback. |
| **exerciseStartTime from arithmetic** | `exerciseStartTime = start + 4 * (60/bpm)` | Correct if `start` is exact first-beat time. Coupled to the sessionStartTime skew above. |
| **Visual beat vs audio** | `visualLoop()` reads `beatIndex` and reports `(beatIndex - 1) % 4` | Same scheduler state as audio; ~1 frame latency. Acceptable for UI; not used for scoring. |
| **Tab backgrounded** | `scheduleBeats()` advances `nextBeatTime` when `now - nextBeatTime` is large | Prevents backlog; exercise may “jump” if tab was in background long. No explicit resume handling. |
| **Tap timestamp on main thread** | `registerTap()` → `getAudioContextTime()` in click handler | Event can be delayed; timestamp is still on audio clock. For strict accuracy, consider sampling time as close to the audio thread as possible (no change in Web API). |

---

## 3. Known limitations of Web Audio (web)

| Limitation | Impact |
|------------|--------|
| **Context can be suspended** | Must call `context.resume()` from a user gesture. We do this in `startMetronome`; first Start tap resumes. |
| **Single global AudioContext** | One context in `lib/metronome.ts`. Multiple tabs share nothing; each tab has its own clock. |
| **currentTime is not wall-clock** | Pauses when context is suspended (e.g. tab in background). Our “catch-up” in `scheduleBeats` keeps beats moving but wall time and audio time diverge. |
| **No high-priority audio thread** | Scheduling is precise; execution can be delayed under load. Lookahead (0.2 s) helps. |
| **iOS Safari quirks** | `AudioContext` may require user gesture and has different suspend/resume behavior; test on device. |

---

## 4. What must be rewritten for native mobile

| Component | Why | Direction |
|-----------|-----|-----------|
| **Metronome** | No `AudioContext` on React Native. Need sample-accurate playback and a stable time base. | Use native audio (e.g. `expo-av` with precise scheduling, or a native module / `react-native-audio-api` if available). Implement same model: schedule N ms ahead, refill from a single clock. |
| **Tap timestamps** | `getAudioContextTime()` is 0 or undefined off-web. Taps and expected times must share one clock. | On native, use the same clock that drives the metronome (e.g. time at start of exercise + elapsed from native timer or from the same API that schedules clicks). |
| **getAudioContextTime()** | Web-only. Used for session start, exercise start, tap times, duration. | Abstract “app time base” behind an interface (e.g. `getTimeBaseSeconds()`), implement with `AudioContext.currentTime` on web and with the native metronome clock on mobile. |
| **isWeb() checks** | Practice/tap UI is gated on web for metronome. | Once native metronome exists, remove or replace with a capability check (e.g. “hasTimingEngine”). |

Scoring, note scheduler, Firestore, and app/navigation logic can stay; only the **audio + time source** need a native path.

---

## 5. Concise technical debt list

1. **Single rudiment** – no picker; add when expanding content.
2. **sessionStartTime** – sampled after `start()`; small timing bias; return or callback start time from metronome.
3. **Module-level metronome** – global state; consider injectable or instance if multiple consumers.
4. **Progress** – client-side aggregation over 500 docs; plan for aggregation or summary doc at scale.
5. **Scoring** – order-based only; no skip/double-tap handling.
6. **Web Audio only** – metronome and `getAudioContextTime` are web-only; abstract time base and replace implementation on native.
7. **Tab background** – catch-up logic only; no explicit “paused” or “resumed” UX.
8. **Firestore** – document composite index for `sessions` (userId, createdAt) in setup/docs.

---

## 6. Clear next steps

| Priority | Step |
|----------|------|
| **P0** | **Native timing**: Introduce a small abstraction for “current time in seconds” (e.g. `lib/timeBase.ts`: `getTimeBaseSeconds()`, web implementation uses `getAudioContextTime()`). Use it everywhere we need a shared clock. |
| **P0** | **Native metronome**: Implement metronome (and time base) on iOS/Android (expo-av or native module); same contract: start/stop, BPM, optional onBeat. |
| **P1** | **sessionStartTime accuracy**: Have `startMetronome` return or invoke callback with the scheduled first-beat time; use that in usePractice instead of sampling after await. |
| **P1** | **Rudiment selection**: Replace “first rudiment” with a chosen rudiment (state or route param) so BPM/subdivision/pattern come from selection. |
| **P2** | **Progress at scale**: Add Firestore composite index; later, aggregation (e.g. Cloud Function on session write updating a `users/{uid}/stats` doc) or cap + pagination. |
| **P2** | **Scoring robustness**: Optionally detect skips (gap in tap times) or extra taps and mark/score accordingly. |
| **P3** | **Background UX**: When context is suspended/resumed, show a brief “Paused” or “Resumed” so the user knows why time jumped. |
