# Rhythm — MVP rhythm-learning app for drummers

Expo React Native (TypeScript), Firebase Auth + Firestore, web-first. Simple metronome with **deterministic timing** via the Web Audio API.

## Setup

1. **Install dependencies**
   ```bash
   cd rhythm-app && npm install
   ```

2. **Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com).
   - Enable **Authentication** → **Anonymous** sign-in.
   - Create a **Firestore** database (test mode is fine for MVP).
   - Project settings → General → Your apps → Add web app → copy the config.

3. **Environment (no secrets in code)**
   - Copy `.env.example` to `.env` in the project root.
   - Fill in each `EXPO_PUBLIC_FIREBASE_*` in `.env` with values from Firebase Console → Project settings → Your apps → Web app config.
   - Do not commit `.env`.

4. **Run (web)**
   ```bash
   npm run web
   ```
   Open the URL in the browser. Use **Start** on the Practice tab (first tap resumes the audio context).

## Project layout

- `app/` — Expo Router screens: `index`, `(tabs)/home`, `(tabs)/practice`.
- `contexts/AuthContext.tsx` — `useAuth()` (user, loading); signs in anonymously on app load.
- `lib/firebase.ts` — Firebase init (Auth + Firestore). Config from env; see file comment for where to add values.
- `lib/metronome.ts` — **Timing logic**: Web Audio scheduling and visual beat callbacks (see comments in file).
- `lib/userProgress.ts` — Firestore read/write for last BPM (one doc per user).

## Timing (tradeoffs)

- **Audio**: Beats are scheduled at exact `AudioContext.currentTime` values in a small lookahead window; no `setInterval`/`setTimeout` for playback, so no drift.
- **Visual**: A `requestAnimationFrame` loop reads the same scheduler state and updates the beat indicator; one-frame latency is acceptable for MVP.
- **Platform**: Metronome is web-only in this MVP (Web Audio API). Native would need expo-av or a native module and a different timing approach.

## Constraints applied

- Simple, readable code; no heavy abstractions.
- Deterministic timing where possible (audio clock on web).
- No premature optimization.
- No class-heavy design; hooks and plain functions.
- Timing logic commented in `lib/metronome.ts`.
