## Context

Greenfield project — no existing codebase. A solo developer on a tight deadline needs to build a mobile fitness AI coaching platform end-to-end: React Native app (iOS + Android), a Node.js/Express REST API, PostgreSQL database, on-device MediaPipe pose estimation, and a Claude API form analysis pipeline. The PRD defines 6 MVP capabilities that must all work together as a continuous loop before the product can be validated.

## Goals / Non-Goals

**Goals:**
- Define the full system architecture that all 6 capability specs build on
- Establish the data model, API surface, auth strategy, and integration patterns before coding begins
- Make enough decisions upfront that implementation is linear and unambiguous
- Keep the architecture simple enough for a solo dev to ship quickly

**Non-Goals:**
- Web dashboard (mobile only)
- Video storage or server-side video processing
- Real-time live coaching during a set
- Payment, subscriptions, or multi-gym/multi-trainer management
- Phase 2 features: analytics, workout program builder

## Decisions

### 1. Monorepo with shared types package
**Decision**: Single repository with three packages — `apps/mobile` (React Native), `apps/api` (Node.js/Express), `packages/shared` (TypeScript types + constants).

**Why**: Shared types eliminate the #1 source of bugs in this architecture — the mobile and API going out of sync on request/response shapes. A shared `packages/shared` gives both apps access to the same `FormScore`, `SessionSet`, `ExerciseName`, and API response types. Minimal setup cost for a solo dev, maximum benefit.

**Alternative considered**: Separate repos. Rejected — no shared types, more coordination overhead for one person.

---

### 2. Database schema
**Decision**: PostgreSQL with the following tables:

```
users
  id UUID PK
  email TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  role ENUM('trainer', 'trainee') NOT NULL
  created_at TIMESTAMPTZ DEFAULT now()

trainer_trainee
  id UUID PK
  trainer_id UUID FK → users.id
  trainee_id UUID FK → users.id (nullable until invite accepted)
  invite_email TEXT NOT NULL
  status ENUM('pending', 'active') NOT NULL DEFAULT 'pending'
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(trainer_id, trainee_id)

invites
  id UUID PK
  trainer_id UUID FK → users.id
  email TEXT NOT NULL
  token TEXT UNIQUE NOT NULL
  expires_at TIMESTAMPTZ NOT NULL
  used_at TIMESTAMPTZ (nullable)
  trainer_trainee_id UUID FK → trainer_trainee.id

sessions
  id UUID PK
  trainee_id UUID FK → users.id
  started_at TIMESTAMPTZ NOT NULL
  ended_at TIMESTAMPTZ (nullable — null while session is active)

sets
  id UUID PK
  session_id UUID FK → sessions.id
  exercise_name TEXT NOT NULL
  weight_kg DECIMAL(6,2) (nullable — bodyweight exercises)
  reps INT NOT NULL
  set_number INT NOT NULL
  logged_at TIMESTAMPTZ DEFAULT now()

form_scores
  id UUID PK
  set_id UUID FK → sets.id UNIQUE
  score_tier ENUM('green', 'yellow', 'red') NOT NULL
  coaching_text TEXT NOT NULL
  angle_data JSONB NOT NULL
  confidence_level DECIMAL(3,2)
  created_at TIMESTAMPTZ DEFAULT now()
```

**Why**: The trainer → trainee → session → set → form_score hierarchy is strictly relational. JSONB for angle_data avoids per-joint schema migrations as new exercises are added (PRD explicitly calls this out as a flexibility requirement).

---

### 3. Authentication: JWT access + refresh token pair
**Decision**: Issue a short-lived access token (15 minutes) and a long-lived refresh token (30 days) stored in the mobile app's secure keychain.

**Why**: PRD specifies JWT with refresh tokens. 24-hour access tokens are too long for a security-sensitive app where a trainer can access all trainee data. 15-minute access + 30-day refresh is the industry standard and gives better security with no UX cost on mobile (refresh is silent).

**Token storage on mobile**: `react-native-keychain` for secure storage on both iOS (Keychain) and Android (Keystore). Never AsyncStorage (plaintext).

**Refresh token storage on API**: Redis. Hashed refresh tokens stored in Redis with TTL set to 30 days — Redis handles expiry automatically, no cleanup job needed. On logout or password reset, delete the key to revoke immediately.

---

### 3b. ORM: Prisma
**Decision**: Use Prisma as the ORM for all database access in `apps/api`. Schema defined in `prisma/schema.prisma`. Migrations managed via `prisma migrate dev` (development) and `prisma migrate deploy` (production).

**Why**: Best TypeScript DX available — auto-generated types from the schema eliminate an entire class of runtime errors. Nested relation queries (session → sets → form_scores) are one-liner `include` calls. Migration tooling is declarative and catches breaking changes. The Prisma query engine binary adds ~30MB to the build but is a non-issue for this deployment scale.

**Alternative considered**: Drizzle (lighter, SQL-first) and raw `node-postgres`. Both rejected — Prisma's type safety and migration tooling save more time than the abstractions cost for a solo dev.

---

### 4. MediaPipe integration strategy: spike-first
**Decision**: The first implementation task is a 1-day technical spike validating `@mediapipe/tasks-vision` in React Native via `react-native-vision-camera` frame processors. The rest of mobile work begins only after the spike result determines the path forward.

**Why**: MediaPipe + React Native is the highest technical risk item in the entire project. If it doesn't work with the standard package, the fallback is a custom native module or a different library. Building session recording on an assumption before validating it would waste days of work.

**Fallback path**: If `@mediapipe/tasks-vision` is incompatible, evaluate: (a) native iOS/Android wrappers, (b) `react-native-pose-detection` (TensorFlow.js port), (c) frame-by-frame JPEG extraction + server-side pose inference (would require rethinking the "no video leaves device" constraint — only angle data, not video frames, would leave the device).

---

### 5. AI form analysis: Claude API with structured output
**Decision**: Use `claude-haiku-4-5-20251001` (or latest Haiku) as the default model for form analysis. Use the API's tool use / structured output mode to guarantee the `score_tier` + `coaching_text` response shape.

**Why**: Haiku is the fastest and cheapest Claude model, which matters for the 3-second latency target. Structured output via tool use eliminates the risk of malformed responses and the need to parse freeform text. If Haiku is too weak for quality feedback, promote to Sonnet — the interface doesn't change.

**Prompt structure**: System prompt establishes the scoring rubric and exercise-specific angle thresholds. User message includes exercise name, rep count, per-joint angle summary (min/max/avg), and MediaPipe confidence level. Response schema: `{ score_tier: "green"|"yellow"|"red", coaching_text: string }`.

**Timeout**: 5 seconds. On timeout or API error, set `form_score` to null for that set and display "Analysis unavailable" — session logging continues.

---

### 6. Session logging: optimistic local-first with background sync
**Decision**: Session data (sets, reps, weight) is written to local storage (MMKV) immediately. A sync queue flushes to the backend in the background. On app restart after a crash, unsynced sessions are recovered from MMKV and synced.

**Why**: The PRD requires zero blocking failures — session logging must never fail due to network issues. Optimistic local writes guarantee this. MMKV is faster than AsyncStorage and has no I/O thread issues in React Native.

**Conflict resolution**: Last-write-wins with local as source of truth during an active session. Once a session is ended and synced, it becomes read-only.

---

### 7. API design: REST with versioned prefix
**Decision**: All API routes prefixed with `/api/v1/`. Key routes:

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

POST   /api/v1/invites              (trainer sends invite)
GET    /api/v1/invites/:token       (trainee validates invite link)
POST   /api/v1/invites/:token/accept (trainee accepts + registers)

POST   /api/v1/sessions             (start session)
PATCH  /api/v1/sessions/:id         (end session)
GET    /api/v1/sessions             (trainee: own sessions; trainer: all trainee sessions via query param)

POST   /api/v1/sessions/:id/sets    (log a set)
POST   /api/v1/sets/:id/form-score  (attach AI form score to set)

GET    /api/v1/trainer/trainees     (trainer: list all linked trainees with last session + alert status)
GET    /api/v1/trainer/trainees/:traineeId/sessions  (session history for one trainee)
GET    /api/v1/trainer/sessions/:sessionId           (session detail with all sets + scores)
PATCH  /api/v1/trainer/sessions/:sessionId/read      (mark session as read → clears red alert)
```

---

### 8. Email invite: Resend
**Decision**: Use Resend's Node.js SDK. Invite emails contain a deep link back to the app (universal link on iOS, app link on Android) with the invite token as a URL parameter.

**Why**: Resend's API is the simplest transactional email service available. The invite link flow requires deep linking — register a URL scheme and/or universal link domain in the app config.

---

### 9. Mobile navigation: React Navigation v7
**Decision**: React Navigation with a stack + tab structure. Unauthenticated: Auth stack (Login, Register, InviteRegister). Trainer: Tab navigator (Dashboard, Profile). Trainee: Tab navigator (Workout, History, Profile).

---

### 10. Styling: NativeWind (Tailwind for React Native)
**Decision**: Use NativeWind v4 for styling. No custom design system needed for MVP.

**Why**: Fastest path to a consistent UI for a solo dev. Tailwind class names are familiar and avoid the overhead of a component library.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| MediaPipe incompatible with React Native → blocks all recording features | Spike first (Task 0); fallback paths documented above |
| Claude API p95 latency exceeds 3s on real 4G | 5s hard timeout; Haiku is the fastest Claude model; user sees spinner, not a freeze |
| Local-first sync creates duplicate sets if sync retries incorrectly | Use idempotency keys (set UUID generated client-side, sent with create request; server upserts on conflict) |
| Solo dev capacity: 6 features is a full product | Strict MVP scope; no nice-to-haves; recording is optional per set (manual fallback always works) |
| Invite deep links don't work correctly on first install | Use Resend email with a fallback web URL that redirects to the app store if app not installed |
| PostgreSQL JSONB angle_data grows large at scale | Not a concern for MVP; add compression or archiving in Phase 2 |

## Open Questions

- **Monorepo tooling**: npm workspaces is sufficient for a solo dev — no Turborepo or nx needed at this scale.
- **App deep link domain**: Need a registered domain for universal links (iOS) and `assetlinks.json` for Android app links. Vercel free tier is sufficient for hosting these files.

## Resolved Decisions (for reference)

| Decision | Choice | Notes |
| CI/CD | GitHub Actions | CI on every push; CI required before merge to `dev` and `master`; CD on `master` push (deploy step TBD) |
|---|---|---|
| Mobile framework | Expo managed + dev client | Eject to bare only if MediaPipe spike requires it |
| ORM | Prisma | Schema-first, auto-generated types, declarative migrations |
| Refresh token storage | Redis | TTL-based expiry, instant revocation |
| AI API | Claude (Haiku) | Structured output via tool use |
| Email | Resend | Pending account setup |
| State management | Zustand | |
| Styling | NativeWind v4 | |
| Git branching | master / dev / task branches | PRs from task → dev → master |
| Deployment | TBD | Decided after MVP validation |

## Accounts Status

| Service | Status | Blocks |
|---|---|---|
| Claude API key | ✅ Ready | |
| EAS (Expo) account | ✅ Ready | |
| Resend account | ✅ Ready | |
| Apple Developer account | ⏭️ Deferred | Not needed for MVP — Android-first; iOS simulator used for non-camera features |
