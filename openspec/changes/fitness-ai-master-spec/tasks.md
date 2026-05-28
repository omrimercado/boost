## 1. Repository & Project Setup

- [x] 1.1 Initialize monorepo with npm workspaces: `apps/mobile`, `apps/api`, `packages/shared`
- [x] 1.2 Configure root TypeScript `tsconfig.json` with path aliases for `@shared/*`
- [x] 1.3 Create `packages/shared` with shared types: `User`, `Session`, `SessionSet`, `FormScore`, `ExerciseName`, API request/response shapes
- [x] 1.4 Set up `apps/api` — Node.js + Express + TypeScript, `ts-node-dev` for dev, `jest` for tests
- [x] 1.5 Set up `apps/mobile` — Expo (managed workflow + custom dev client), TypeScript, configure Metro bundler for monorepo path aliases; install `react-native-vision-camera` Expo plugin
- [x] 1.6 Set up PostgreSQL + Redis locally via Docker Compose
- [x] 1.7 Install and configure Prisma in `apps/api`: `prisma init`, define full schema (`users`, `trainer_trainee`, `invites`, `sessions`, `sets`, `form_scores`) with enums and relations, run `prisma migrate dev`
- [x] 1.8 Install and configure Redis client (`ioredis`) in `apps/api`; create `RedisService` with get/set/del and TTL helpers
- [x] 1.9 Configure environment variable management: `.env` files per package, `dotenv` on API, no secrets committed; document required env vars in a root `.env.example`
- [x] 1.10 Add `typecheck`, `lint`, and `test` scripts to each package's `package.json` so CI can call them uniformly
- [x] 1.11 Configure ESLint at the root with shared rules for TypeScript across all packages

---

## 2. CI/CD Pipeline

- [x] 2.1 Create `.github/workflows/ci.yml` — triggers on every push and on PRs to `dev` and `master`; runs typecheck + lint + test for `apps/api`, `apps/mobile`, and `packages/shared` in parallel jobs
- [x] 2.2 Create `.github/workflows/cd.yml` — triggers on push to `master` only; placeholder deploy step until deployment target is confirmed
- [ ] 2.3 Enable branch protection on `dev`: require CI to pass, require PR (no direct push)
- [ ] 2.4 Enable branch protection on `master`: require CI to pass, require PR from `dev` only (no direct push)

---

## 3. MediaPipe Technical Spike (MUST complete before Task 6)

- [x] 2.1 Install `react-native-vision-camera` v3+ and configure iOS/Android permissions for camera
- [x] 2.2 Attempt to install and import `@mediapipe/tasks-vision` in the RN context; document compatibility result
- [x] 2.3 Write a minimal frame processor plugin that receives camera frames and logs a pose landmark count to the console on a real Android device (iOS simulator has no camera — Android is the validation target for MVP)
- [x] 2.4 If 2.2 fails: evaluate `react-native-tensorflow-lite` or TensorFlow.js RN pose detection as fallback; update pose-estimation spec with chosen approach
- [x] 2.5 Document spike result and chosen MediaPipe integration path in `docs/mediapipe-spike.md`

---

## 3. Backend: Auth API

- [ ] 3.1 Implement `POST /api/v1/auth/register` — validate email/password, hash password (bcrypt), create user via Prisma, issue JWT access token (15min) + store hashed refresh token in Redis with 30-day TTL
- [ ] 3.2 Implement `POST /api/v1/auth/login` — validate credentials, issue tokens; store hashed refresh token in Redis (key: `refresh:<userId>:<tokenId>`)
- [ ] 3.3 Implement `POST /api/v1/auth/refresh` — look up hashed token in Redis, validate, issue new access token; rotate refresh token (delete old key, store new one)
- [ ] 3.4 Implement `POST /api/v1/auth/logout` — delete refresh token key from Redis
- [ ] 3.5 Implement JWT middleware: verify access token on protected routes, attach `req.user` with id and role
- [ ] 3.6 Implement role-check middleware: `requireRole('trainer')` and `requireRole('trainee')` guards
- [ ] 3.7 Implement `POST /api/v1/auth/forgot-password` — generate 1-hour reset token, store in Redis, send email via Resend
- [ ] 3.8 Implement `POST /api/v1/auth/reset-password` — validate reset token in Redis, update password hash via Prisma, delete all `refresh:<userId>:*` keys from Redis

---

## 4. Backend: Invite & Trainer–Trainee Linking API

- [ ] 4.1 Set up Resend SDK in `apps/api`, configure sender domain, create email template for trainer invite
- [ ] 4.2 Implement `POST /api/v1/invites` — trainer sends invite: validate email, create `invites` + `trainer_trainee` (pending) records, send email via Resend
- [ ] 4.3 Handle edge cases in invite send: email already linked to active trainee, email already has account, duplicate pending invite (resend with new token)
- [ ] 4.4 Implement `GET /api/v1/invites/:token` — validate token (exists, not expired, not used), return trainer name and invite email
- [ ] 4.5 Implement `POST /api/v1/invites/:token/accept` — register trainee + link to trainer in a single DB transaction; return tokens
- [ ] 4.6 Configure Resend for password reset email template (reuse Resend setup from 4.1)

---

## 5. Backend: Session & Set Logging API

- [ ] 5.1 Implement `POST /api/v1/sessions` — create session with client-provided UUID (idempotent); trainee role required
- [ ] 5.2 Implement `PATCH /api/v1/sessions/:id` — end session (set `ended_at`); validate trainee owns session
- [ ] 5.3 Implement `POST /api/v1/sessions/:id/sets` — create set with client-provided UUID (idempotent upsert); validate session belongs to trainee
- [ ] 5.4 Implement `POST /api/v1/sets/:id/form-score` — attach form score to set; validate set belongs to trainee; reject if score already exists
- [ ] 5.5 Implement `GET /api/v1/sessions` — trainee gets own sessions list; trainer gets sessions for a specific traineeId query param
- [ ] 5.6 Implement `GET /api/v1/sessions/:id` — full session detail with sets and form scores; enforce ownership (trainee own, or trainer→linked trainee)

---

## 6. Backend: Trainer Dashboard API

- [ ] 6.1 Implement `GET /api/v1/trainer/trainees` — list all trainer's trainees with last session date, pending status, and unread Red alert count; optimize with a single JOIN query
- [ ] 6.2 Implement `GET /api/v1/trainer/trainees/:traineeId/sessions` — paginated session history for one trainee; trainer must be linked to that trainee
- [ ] 6.3 Implement `GET /api/v1/trainer/sessions/:sessionId` — session detail with all sets + form scores; trainer must be linked to trainee who owns session
- [ ] 6.4 Implement `PATCH /api/v1/trainer/sessions/:sessionId/read` — mark session as read; clear Red alert for that session for this trainer
- [ ] 6.5 Add a `session_reads` join table (trainer_id, session_id, read_at) to track read state per trainer per session; run migration

---

## 7. Mobile: Auth Screens & Navigation

- [ ] 7.1 Install and configure React Navigation v7 with stack + tab navigators
- [ ] 7.2 Install `react-native-keychain` for secure token storage; implement `AuthService` with store/retrieve/clear tokens
- [ ] 7.3 Build Login screen: email + password form, call login API, store tokens, navigate to role-appropriate home
- [ ] 7.4 Build Trainer Registration screen: email, password, role fixed to "trainer"
- [ ] 7.5 Build Invite Registration screen: token passed via deep link, email pre-filled and read-only, trainer name displayed, password input only
- [ ] 7.6 Configure universal links (iOS) and app links (Android) to handle `/invite/:token` deep link URLs
- [ ] 7.7 Build Forgot Password screen + Reset Password screen (web-based reset flow via email link)
- [ ] 7.8 Implement Zustand `useAuthStore` — state: `{ user, accessToken, isAuthenticated }`, actions: `login`, `logout`, `refreshToken`
- [ ] 7.9 Implement silent token refresh interceptor (Axios or Fetch wrapper): on 401, attempt refresh, retry original request, or navigate to Login on refresh failure

---

## 8. Mobile: Trainer Dashboard UI

- [ ] 8.1 Build Trainer home screen: trainee list with skeleton loading; pull-to-refresh
- [ ] 8.2 Implement Red badge indicator on trainee row; tapping badge navigates directly to most recent unread Red session
- [ ] 8.3 Build "Add Trainee" bottom sheet: email input, submit button, call invite API, handle all edge cases (inline error messages)
- [ ] 8.4 Build Trainee session history screen: session list with date, exercise count, score distribution (Green/Yellow/Red counts)
- [ ] 8.5 Build session detail screen: per-set rows with exercise, weight, reps, form score badge + coaching text (expandable); unscored sets show "No form data"
- [ ] 8.6 Implement read-on-view: call PATCH /read when session detail screen mounts; optimistically clear Red badge in Zustand state

---

## 9. Mobile: Trainee Session Logging UI

- [ ] 9.1 Install MMKV (`react-native-mmkv`) for local-first storage; implement `SessionStore` service with MMKV persistence
- [ ] 9.2 Build "Start Session" flow: generate client UUID, write to MMKV, queue backend sync
- [ ] 9.3 Build exercise selection screen: show all 7 supported exercises
- [ ] 9.4 Build set logging form: weight input (optional), reps input, set number (auto-incremented), "Save Set" button
- [ ] 9.5 Implement sync queue in Zustand + MMKV: on network available, flush pending sessions/sets to backend using idempotency UUIDs
- [ ] 9.6 Implement crash recovery: on app start, check MMKV for unfinished sessions; prompt Resume or Discard
- [ ] 9.7 Build "End Session" button: set ended_at, flush sync queue, navigate to session summary screen
- [ ] 9.8 Build session summary screen: show completed session with all logged sets and any form scores received
- [ ] 9.9 Build Trainee History tab: list own completed sessions with date and score summary

---

## 10. Mobile: Camera & Pose Estimation

- [ ] 10.1 Build camera recording screen: camera preview full-screen, "Start Recording" / "Stop" button overlay, exercise name displayed
- [ ] 10.2 Integrate MediaPipe frame processor (from spike result in Task 2): run pose detection on each frame during recording
- [ ] 10.3 Implement per-frame angle calculation for each supported exercise using detected landmarks
- [ ] 10.4 Implement confidence scoring: track average landmark visibility across frames
- [ ] 10.5 On "Stop": compile angle summary (min/max/avg/deviation_count per joint) into JSON; pass to AI analysis flow
- [ ] 10.6 Implement 5-second no-pose-detected prompt: "Adjust camera angle or lighting" overlay; "Skip Recording" option falls back to manual logging
- [ ] 10.7 Handle camera permission denied gracefully: show inline message, proceed to manual logging

---

## 11. Mobile: AI Form Analysis Integration

- [ ] 11.1 Implement `FormAnalysisService` on the API: build exercise-specific system prompts with angle thresholds; call Claude API with structured output (tool use); parse and return `{ score_tier, coaching_text }`
- [ ] 11.2 Implement `POST /api/v1/sets/:id/form-score` to receive the analysis result and store it (already built in 5.4 — wire up the service call here)
- [ ] 11.3 On mobile: after angle summary is compiled, call API's form score endpoint; show "Analyzing your form..." spinner
- [ ] 11.4 Implement 5-second client-side timeout: on timeout, show "Analysis unavailable" and proceed to set logging
- [ ] 11.5 Build form score result card: Green/Yellow/Red badge (color-coded), coaching text, "Log This Set" button below
- [ ] 11.6 Handle all AI failure states on mobile: API error → "Couldn't analyze this set"; offline → "No connection — form analysis skipped"; always present set logging form regardless

---

## 12. End-to-End Validation

- [ ] 12.1 Run the full MVP loop: trainer registers → invites trainee → trainee registers via link → trainee records a set → AI returns form score → trainer logs in → sees session with form score and Red alert if applicable
- [ ] 12.2 Validate AI feedback latency: < 3 seconds on a real device with 4G (or hotspot throttled to 4G speeds)
- [ ] 12.3 Validate graceful degradation: disable AI API → trainee can still log a complete session; trainer can still see session history without scores
- [ ] 12.4 Validate local-first sync: kill app mid-session → restart → resume session → all data present; end session → verify data in backend
- [ ] 12.5 Test Red alert flow: trainee logs a Red-scored set → trainer opens app → Red badge visible without deep navigation → trainer taps into session → badge clears
