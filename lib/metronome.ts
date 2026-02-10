/**
 * Metronome using Web Audio API and WAV assets. Timing is driven only by the AudioContext clock.
 *
 * TIMING MODEL (no setInterval/setTimeout for when clicks fire):
 * - Beats are scheduled at exact AudioContext.currentTime values. The audio engine
 *   plays each click at the scheduled time; JS timers are not used for beat timing.
 * - A refill loop runs every BEAT_INTERVAL_MS and calls scheduleBeats(). That loop
 *   only decides "what to schedule next"; it does NOT determine when sound plays.
 *
 * Web-only; native would need a different implementation.
 */

import { Asset } from "expo-asset";
import {
  METRONOME_SOUND_PRESETS,
  DEFAULT_METRONOME_SOUND,
  type MetronomeSoundId,
} from "./metronomePresets";

export type { MetronomeSoundId };
export { METRONOME_SOUND_PRESETS };

/** How far ahead we schedule beats (seconds). */
const LOOKAHEAD_SEC = 0.2;
/** How often we run the scheduler to refill the queue. */
const SCHEDULER_INTERVAL_MS = 50;

type BufferPair = { accent: AudioBuffer; normal: AudioBuffer };

let audioContext: AudioContext | null = null;
let nextBeatTime = 0;
let beatIndex = 0;
let bpm = 120;
let soundId: MetronomeSoundId = DEFAULT_METRONOME_SOUND;
let onBeat: ((index: number) => void) | null = null;
let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;
let visualLoopId: number | null = null;
let lastReportedBeat = -1;
let isRunning = false;
/** Time of the first beat (beat 0) when startMetronome was last called. For session sync. */
let firstBeatTime = 0;

const bufferCache = new Map<MetronomeSoundId, BufferPair>();

function getPreset(id: MetronomeSoundId) {
  return METRONOME_SOUND_PRESETS.find((p) => p.id === id) ?? METRONOME_SOUND_PRESETS[0];
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Load WAV assets for a preset into decoded AudioBuffers and cache them.
 */
export async function loadMetronomeBuffers(presetId: MetronomeSoundId): Promise<BufferPair | null> {
  const ctx = getContext();
  if (!ctx) return null;
  const preset = getPreset(presetId);
  if (!preset) return null;

  const cached = bufferCache.get(presetId);
  if (cached) return cached;

  try {
    const [hiAsset, loAsset] = await Promise.all([
      Asset.fromModule(preset.hi).downloadAsync(),
      Asset.fromModule(preset.lo).downloadAsync(),
    ]);
    const hiUri = hiAsset.localUri ?? hiAsset.uri;
    const loUri = loAsset.localUri ?? loAsset.uri;
    if (!hiUri || !loUri) return null;

    const [hiAb, loAb] = await Promise.all([
      fetch(hiUri).then((r) => r.arrayBuffer()),
      fetch(loUri).then((r) => r.arrayBuffer()),
    ]);
    const [accent, normal] = await Promise.all([
      new Promise<AudioBuffer>((res, rej) =>
        ctx.decodeAudioData(hiAb.slice(0), res, rej)
      ),
      new Promise<AudioBuffer>((res, rej) =>
        ctx.decodeAudioData(loAb.slice(0), res, rej)
      ),
    ]);
    const pair: BufferPair = { accent, normal };
    bufferCache.set(presetId, pair);
    return pair;
  } catch {
    return null;
  }
}

/**
 * Play one click at a precise time using a cached WAV buffer.
 */
function scheduleClick(ctx: AudioContext, when: number, isAccent: boolean): void {
  const pair = bufferCache.get(soundId);
  if (!pair) return;
  const buffer = isAccent ? pair.accent : pair.normal;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(when);
}

/**
 * TIMING: Beat times are computed from ctx.currentTime + beatDuration.
 * Refill: schedule every beat in [now, now + LOOKAHEAD_SEC].
 */
function scheduleBeats(): void {
  const ctx = getContext();
  if (!ctx || !isRunning) return;
  if (!bufferCache.has(soundId)) return;

  const now = ctx.currentTime;
  const beatDuration = 60 / bpm;

  while (nextBeatTime < now - beatDuration * 0.5) {
    nextBeatTime += beatDuration;
    beatIndex += 1;
  }

  while (nextBeatTime < now + LOOKAHEAD_SEC) {
    const isAccent = beatIndex % 4 === 0;
    scheduleClick(ctx, nextBeatTime, isAccent);
    nextBeatTime += beatDuration;
    beatIndex += 1;
  }
}

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
 * Current time on the same AudioContext clock the metronome uses.
 */
export function getAudioContextTime(): number {
  const ctx = getContext();
  return ctx ? ctx.currentTime : 0;
}

/**
 * Time of the first beat (beat 0) when startMetronome was last started.
 * Call right after startMetronome() to align session/expected times with the actual clicks.
 */
export function getMetronomeFirstBeatTime(): number {
  return firstBeatTime;
}

/**
 * Start the metronome. Loads buffers for current sound first, then starts scheduling.
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

  const loaded = await loadMetronomeBuffers(soundId);
  if (!loaded) return false;

  bpm = Math.max(20, Math.min(300, bpmArg));
  onBeat = onBeatCallback;
  isRunning = true;
  nextBeatTime = ctx.currentTime;
  firstBeatTime = nextBeatTime;
  beatIndex = 0;

  scheduleBeats();
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

export function getMetronomeSound(): MetronomeSoundId {
  return soundId;
}

export function setMetronomeSound(id: MetronomeSoundId): void {
  soundId = id;
  if (isWeb()) void loadMetronomeBuffers(id);
}
