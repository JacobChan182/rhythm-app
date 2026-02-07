/**
 * Metronome using Web Audio API. Timing is driven only by the AudioContext clock.
 *
 * TIMING MODEL (no setInterval/setTimeout for when clicks fire):
 * - Beats are scheduled at exact AudioContext.currentTime values. The audio engine
 *   plays each click at the scheduled time; JS timers are not used for beat timing.
 * - A refill loop runs every BEAT_INTERVAL_MS and calls scheduleBeats(). That loop
 *   only decides "what to schedule next"; it does NOT determine when sound plays.
 *   When each click is heard is 100% determined by the schedule (context.currentTime).
 *
 * Web-only; native would need a different implementation.
 */

const CLICK_DURATION_SEC = 0.03;
const CLICK_FREQ = 1000;
/** How far ahead we schedule beats (seconds). Keeps a small queue so we never run out. */
const LOOKAHEAD_SEC = 0.2;
/** How often we run the scheduler to refill the queue. Not the beat period. */
const SCHEDULER_INTERVAL_MS = 50;

let audioContext: AudioContext | null = null;
let nextBeatTime = 0;
let beatIndex = 0;
let bpm = 120;
let onBeat: ((index: number) => void) | null = null;
let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;
let visualLoopId: number | null = null;
let lastReportedBeat = -1;
let isRunning = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Current time on the same AudioContext clock the metronome uses.
 * Use this for tap timestamps so taps and beats share one time base (no scoring yet).
 * Returns 0 if context is not available (e.g. non-web).
 */
export function getAudioContextTime(): number {
  const ctx = getContext();
  return ctx ? ctx.currentTime : 0;
}

/**
 * Play one click at a precise time using an oscillator.
 * Timing: when the click is heard is exactly `when` on the AudioContext clock.
 * We use OscillatorNode + GainNode; start/stop are scheduled on the same clock.
 */
function scheduleClick(ctx: AudioContext, when: number, isAccent: boolean): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = CLICK_FREQ;
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const level = isAccent ? 0.5 : 0.3;
  gainNode.gain.setValueAtTime(0, when);
  gainNode.gain.setValueAtTime(level, when + 0.001);
  gainNode.gain.setValueAtTime(0, when + CLICK_DURATION_SEC);

  osc.start(when);
  osc.stop(when + CLICK_DURATION_SEC);
}

/**
 * TIMING: This is the only place beat times are computed. We use ctx.currentTime
 * (the audio clock) and add beatDuration for each beat. No JS timer defines when
 * clicks occur; we only schedule AudioNodes at those times.
 * Refill: we schedule every beat whose time falls in [now, now + LOOKAHEAD_SEC].
 */
function scheduleBeats(): void {
  const ctx = getContext();
  if (!ctx || !isRunning) return;

  const now = ctx.currentTime;
  const beatDuration = 60 / bpm;

  // If we fell behind (e.g. tab backgrounded), advance to next logical beat
  while (nextBeatTime < now - beatDuration * 0.5) {
    nextBeatTime += beatDuration;
    beatIndex += 1;
  }

  // Schedule all beats in the lookahead window. Playback time = nextBeatTime (audio clock).
  while (nextBeatTime < now + LOOKAHEAD_SEC) {
    const isAccent = beatIndex % 4 === 0;
    scheduleClick(ctx, nextBeatTime, isAccent);
    nextBeatTime += beatDuration;
    beatIndex += 1;
  }
}

/**
 * Visual sync: we report the current beat in bar (0–3) so UI can highlight.
 * Derived from the same scheduler state (beatIndex), not from a separate timer.
 */
function visualLoop(): void {
  if (!isRunning || !onBeat) {
    visualLoopId = null;
    return;
  }
  if (beatIndex > 0) {
    const currentBeatInBar = (beatIndex - 1) % 4;
    if (currentBeatInBar !== lastReportedBeat) {
      lastReportedBeat = currentBeatInBar;
      onBeat(currentBeatInBar);
    }
  }
  visualLoopId = requestAnimationFrame(visualLoop);
}

export function isWeb(): boolean {
  return typeof window !== "undefined" && typeof window.AudioContext !== "undefined";
}

/**
 * Start the metronome. Call from a user gesture so the context can resume.
 * Beat timing is entirely from AudioContext; no setInterval for clicks.
 */
export async function startMetronome(
  bpmArg: number,
  onBeatCallback: (beatIndex: number) => void
): Promise<boolean> {
  if (!isWeb()) return false;
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") await ctx.resume();
  if (ctx.state !== "running") return false;

  bpm = Math.max(20, Math.min(300, bpmArg));
  onBeat = onBeatCallback;
  isRunning = true;
  nextBeatTime = ctx.currentTime;
  beatIndex = 0;

  scheduleBeats();
  // This interval only refills the schedule; it does NOT set when clicks play.
  schedulerIntervalId = setInterval(scheduleBeats, SCHEDULER_INTERVAL_MS);
  visualLoopId = requestAnimationFrame(visualLoop);

  return true;
}

export function stopMetronome(): void {
  isRunning = false;
  if (schedulerIntervalId !== null) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }
  if (visualLoopId !== null) {
    cancelAnimationFrame(visualLoopId);
    visualLoopId = null;
  }
  onBeat = null;
  lastReportedBeat = -1;
}

export function getMetronomeBpm(): number {
  return bpm;
}

export function setMetronomeBpm(value: number): void {
  bpm = Math.max(20, Math.min(300, value));
}
