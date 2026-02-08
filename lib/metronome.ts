/**
 * Metronome using Web Audio API. Timing is driven only by the AudioContext clock.
 * Uses WAV files from assets/metronomes; buffers are loaded on demand and cached.
 *
 * TIMING MODEL (no setInterval/setTimeout for when clicks fire):
 * - Beats are scheduled at exact AudioContext.currentTime values.
 * - Refill loop runs every SCHEDULER_INTERVAL_MS and calls scheduleBeats().
 *
 * Web-only; native would need a different implementation.
 */

import { Asset } from "expo-asset";
import {
  METRONOME_SOUND_PRESETS,
  DEFAULT_METRONOME_SOUND,
  type MetronomeSoundId,
  type MetronomeSoundPreset,
} from "@/lib/metronomePresets";

export type { MetronomeSoundId, MetronomeSoundPreset };
export { METRONOME_SOUND_PRESETS, DEFAULT_METRONOME_SOUND };

/** How far ahead we schedule beats (seconds). */
const LOOKAHEAD_SEC = 0.2;
/** How often we run the scheduler to refill the queue. */
const SCHEDULER_INTERVAL_MS = 50;

let audioContext: AudioContext | null = null;
let nextBeatTime = 0;
let beatIndex = 0;
/** Time of beat 0 (when the metronome started). Used so the visual loop is driven by audio time, not scheduler. */
let beatZeroTime = 0;
let bpm = 120;
let soundId: MetronomeSoundId = DEFAULT_METRONOME_SOUND;
let onBeat: ((index: number) => void) | null = null;
let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;
let visualLoopId: number | null = null;
let lastReportedBeat = -1;
let isRunning = false;

type BufferPair = { accent: AudioBuffer; normal: AudioBuffer };
const bufferCache = new Map<MetronomeSoundId, BufferPair>();

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function getPreset(id: MetronomeSoundId): MetronomeSoundPreset | undefined {
  return METRONOME_SOUND_PRESETS.find((p) => p.id === id);
}

/**
 * Load a single WAV module (from require()) into an AudioBuffer.
 */
async function loadBuffer(ctx: AudioContext, moduleId: number): Promise<AudioBuffer> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.uri ?? (asset as { localUri?: string }).localUri;
  if (!uri) throw new Error("Metronome asset has no URI");
  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Load accent and normal buffers for a preset. Caches result.
 */
export async function loadMetronomeBuffers(presetId: MetronomeSoundId): Promise<BufferPair | null> {
  const cached = bufferCache.get(presetId);
  if (cached) return cached;

  const preset = getPreset(presetId);
  if (!preset) return null;

  const ctx = getContext();
  if (!ctx) return null;

  try {
    const [accent, normal] = await Promise.all([
      loadBuffer(ctx, preset.hi),
      loadBuffer(ctx, preset.lo),
    ]);
    const pair = { accent, normal };
    bufferCache.set(presetId, pair);
    return pair;
  } catch {
    return null;
  }
}

/**
 * Current time on the same AudioContext clock the metronome uses.
 */
export function getAudioContextTime(): number {
  const ctx = getContext();
  return ctx ? ctx.currentTime : 0;
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
 * Schedule beats in the lookahead window.
 */
function scheduleBeats(): void {
  const ctx = getContext();
  if (!ctx || !isRunning) return;

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

/**
 * Visual sync: report current beat (0–3) from the audio clock so the UI stays in
 * sync with when clicks actually play. Previously we used beatIndex from the
 * scheduler, which could be off by up to SCHEDULER_INTERVAL_MS (e.g. 50ms) and
 * caused noticeable drift at low BPM (e.g. 60).
 */
function visualLoop(): void {
  if (!isRunning || !onBeat) {
    visualLoopId = null;
    return;
  }
  const ctx = getContext();
  if (!ctx) {
    visualLoopId = requestAnimationFrame(visualLoop);
    return;
  }
  const now = ctx.currentTime;
  const beatDuration = 60 / bpm;
  const elapsed = now - beatZeroTime;
  if (elapsed >= 0) {
    const beatIndexFromTime = Math.floor(elapsed / beatDuration);
    const currentBeatInBar = beatIndexFromTime % 4;
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
 * Ensures buffers for the current sound are loaded before starting.
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
  beatZeroTime = ctx.currentTime;
  nextBeatTime = ctx.currentTime;
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
  // Preload buffers when user changes sound so next start is instant
  loadMetronomeBuffers(id).catch(() => {});
}
