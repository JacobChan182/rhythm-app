# Firestore schema

## Collections

### `users` (document per user)

- **Path:** `users/{userId}`
- **Fields:** `lastBpm`, `updatedAt` (see lib/userProgress.ts)
- Used for last BPM and optional profile; aggregate stats are computed from `sessions`.

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

## Security rules (suggested)

- `sessions`: user can read/write only where `request.auth.uid == resource.data.userId` (write) or `request.auth.uid == resource.data.userId` (read).
- On create, require `request.resource.data.userId == request.auth.uid`.
