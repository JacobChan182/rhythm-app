# Firestore schema

## Collections

### `users` (document per user)

- **Path:** `users/{userId}`
- **Fields:** `lastBpm`, `updatedAt`, `username` (optional), `email` (optional). See lib/userProgress.ts.
- `username` and `email` are set on sign-up (attached to the account); used for display on Home.

### `usernames` (one doc per claimed username, for uniqueness)

- **Path:** `usernames/{normalizedUsername}` (lowercase, so "CoolUser" and "cooluser" share one doc)
- **Fields:** `userId` (string) — the user who claimed this username.
- Used in a **transaction** on sign-up: if the doc exists, username is taken; else we create it and the user profile together so two sign-ups can't claim the same name.

### `sessions` (one document per practice session)

- **Path:** `sessions/{sessionId}` (auto-ID)
- **Fields:**

| Field           | Type   | Description                          |
|----------------|--------|--------------------------------------|
| `userId`       | string | Owner; required for security & query  |
| `createdAt`    | string | ISO timestamp when session was saved |
| `rudimentName` | string | e.g. "Paradiddle"                     |
| `bpm`          | number | Tempo for the session                |
| `perfect`      | number | Hit count (perfect)                  |
| `good`         | number | Hit count (good)                      |
| `miss`         | number | Hit count (miss)                      |
| `durationSeconds` | number | Time from exercise start to stop   |

- **Example document:**

```json
{
  "userId": "anon_abc123",
  "createdAt": "2025-02-07T14:30:00.000Z",
  "rudimentName": "Paradiddle",
  "bpm": 80,
  "perfect": 6,
  "good": 1,
  "miss": 1,
  "durationSeconds": 12.4
}
```

## Example queries

- **All sessions for the current user (for aggregate stats):**
  `collection('sessions').where('userId', '==', uid).get()`

- **Recent sessions (for a list / aggregation):**
  `collection('sessions').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(500).get()`
  → Implemented in `getSessionsForUser()` and `getAggregateStats()` in lib/sessions.ts.

- **Aggregate stats:** Use `getAggregateStats(user)`: it runs the query above and sums `perfect`, `good`, `miss`, and `durationSeconds` in the client; returns `sessionsCount`, `totalMinutes`, `totalPerfect`, `totalGood`, `totalMiss`.

**Note:** A composite index on `sessions` (userId, createdAt) may be required. Firestore will log a link to create it when the query first runs.

## Security rules (required for collections to work)

The app needs Firestore rules that allow the sign-up and session flows. **If rules are missing or deny all, no collections will be created** (writes fail and you may see permission errors or "Username taken" on sign-up).

Use the rules in the project root: **`firestore.rules`**.

### Deploy rules

**Option A – Firebase Console (quick)**  
1. [Firebase Console](https://console.firebase.google.com) → your project → **Build** → **Firestore Database** → **Rules**.  
2. If you see "Create database", create it first (Production or Test mode).  
3. Replace the rules with the contents of `firestore.rules` and click **Publish**.

**Option B – Firebase CLI**  
1. Install CLI: `npm install -g firebase-tools` (or use npx).  
2. Log in and select project: `firebase login` then `firebase use <your-project-id>` (same as `EXPO_PUBLIC_FIREBASE_PROJECT_ID` in `.env`).  
3. From the `rhythm-app` folder: `firebase deploy --only firestore:rules`.

### Checklist when you see no collections

1. **Firestore created** – In Console → Firestore, you must have clicked "Create database" and chosen a mode.  
2. **Rules deployed** – Rules tab shows the `match /users/...` (etc.) rules from `firestore.rules`, not the default "allow read, write: if false;" for everything.  
3. **Correct project** – `.env` has `EXPO_PUBLIC_FIREBASE_PROJECT_ID` equal to the project you’re viewing in the console.  
4. **Sign up again** – After fixing rules, sign up with a new account; that creates `users` and `usernames`. Doing a practice and tapping Stop creates `sessions`.
