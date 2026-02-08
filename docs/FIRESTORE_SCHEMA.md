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

### `courses` (curriculum – one doc per course)

- **Path:** `courses/{courseId}` (auto-ID)
- **Fields:** `title` (string), `description` (string), `order` (number), `updatedAt` (ISO string).
- Written by the curriculum-builder app; read by the rhythm app Learn tab.

### `courses/{courseId}/rudiments` (rudiments defined per course)

- **Path:** `courses/{courseId}/rudiments/{rudimentId}` (auto-ID)
- **Fields:** `name` (string), `pattern` (array of 32 strings: `"L"` | `"R"` | `""` for rest, each cell = one 16th note), `order` (number), `updatedAt` (ISO string).
- Admins add/edit these in the curriculum builder (32-box editor: left click = L, right click = R, click again = rest). Lessons can reference them via id `course:{courseId}:{rudimentId}`.

### `lessons` (one doc per lesson in a course)

- **Path:** `lessons/{lessonId}` (auto-ID)
- **Fields:** `courseId` (string), `title` (string), `body` (string, markdown or plain), `order` (number), `rudimentIds` (array of strings — rudiment IDs for the student to learn, e.g. `["paradiddle-1"]`), `suggestedBpm` (optional number), `updatedAt` (ISO string).
- Written by the curriculum-builder app; read by the rhythm app Learn tab. Legacy: if `rudimentIds` is missing, readers fall back to single `rudimentId` when present.

### `admins` (optional – for curriculum write access)

- **Path:** `admins/{userId}` (Firebase Auth UID)
- **Fields:** `role` (string), e.g. `"admin"`. Create this doc in Console for users who may use the curriculum-builder app.
- Security rules allow curriculum write only when `get(admins/request.auth.uid).data.role == 'admin'`.

## Example queries (curriculum)

- **List courses by order:** `collection('courses').orderBy('order').get()` → implemented in lib/curriculum.ts `getCourses()`.
- **List lessons for a course:** `collection('lessons').where('courseId', '==', courseId).orderBy('order').get()` → `getLessonsByCourseId(courseId)`.

**Note:** A composite index on `lessons` (courseId, order) is required for listing lessons by course. Either:
- **Console:** When the query first runs, Firestore logs a link to create the index; open it and click Create.
- **CLI:** From `rhythm-app`, run `firebase deploy --only firestore:indexes` (index is defined in `firestore.indexes.json`).

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

### "Missing or insufficient permissions"

1. **Redeploy rules** – The Console may still have old (e.g. deny-all) rules. From `rhythm-app`:  
   `firebase use crash-course-19cb4` then `firebase deploy --only firestore:rules`.  
   Or paste the contents of `firestore.rules` into Console → Firestore → Rules and click **Publish**.  
2. **Same project** – Rhythm app `.env` and curriculum-builder `.env` must use the same Firebase project as the Console (e.g. `crash-course-19cb4`).  
3. **Rhythm app – Learn tab** – Courses/lessons/rudiments are readable by anyone (`allow read: if true`). If you still see permission denied there, rules are not deployed or the app is using a different project.  
4. **Rhythm app – Home / Progress** – Reading `users` or `sessions` requires the user to be **signed in**. Sign in (or sign up) and try again.  
5. **Curriculum builder** – You must be **signed in**; the app reads `admins/{yourUid}` to check admin. Add your UID to `admins` with `role: "admin"` in the Console if you need write access.
