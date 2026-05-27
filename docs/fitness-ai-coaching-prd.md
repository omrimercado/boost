# Product Requirements Document: Fitness AI Coaching App

**Version**: 1.0

**Date**: 2026-05-27

---

## Executive Summary

Personal fitness coaching has a fundamental problem: trainers cannot be everywhere at once, and most trainees work out alone without feedback on whether their form is safe or effective. Poor form leads to injury, slow progress, and trainer churn. This app bridges that gap by putting an AI coaching layer between every solo workout and the trainer's review dashboard.

The platform connects Trainers and Trainees through a mobile-first experience built on React Native, Node.js, and SQL. Trainees record their own sets during workouts; on-device MediaPipe pose estimation captures joint angles in real time and sends that structured data to an AI model, which returns a qualitative form score (Green / Yellow / Red) and actionable coaching advice — all within 3 seconds. Trainers log in to see a dashboard of all their trainees, review session histories, and catch red-flagged form issues.

This is an MVP designed to validate the end-to-end value proposition: AI-powered form coaching that keeps trainers informed about trainees they aren't physically with. Phase 2 will layer on analytics and structured program building once the core loop is proven.

---

## Problem Statement

**Current Situation**: Trainees working without a trainer physically present receive no real-time form feedback. Even trainees who do have personal trainers only see them a few hours a week. Between sessions, there is no safety net — bad habits compound, injuries happen, and trainers have no visibility.

**Proposed Solution**: A mobile app where trainees self-record each set using their phone camera. On-device pose estimation (MediaPipe) calculates joint angles. This data, combined with exercise context, is sent to an AI agent that evaluates form quality and returns a score + coaching feedback. Trainers see all their trainees' session data and form scores on a centralized dashboard, with flagged alerts for dangerously poor form.

**Business Impact**: Validates whether AI-powered asynchronous coaching creates enough value for trainers to adopt the platform and for trainees to stay engaged. A successful MVP proves the core loop and unlocks the path to a structured SaaS product for fitness professionals.

---

## Success Metrics

**Primary KPIs:**
- **End-to-end flow completion**: A trainee can register, complete a recorded session, receive AI feedback, and a trainer can view the results without technical failure.
- **AI feedback latency**: Form analysis returns within 3 seconds of set completion on a standard 4G connection.
- **Graceful degradation rate**: 100% of sessions can be logged manually even when AI/camera is unavailable — zero blocking failures.

**Validation**: After the first internal test session (trainer + trainee on the same account setup), the full loop must complete successfully for MVP to be considered functional.

---

## User Personas

### Primary: Alex — The Personal Trainer
- **Role**: Personal trainer managing 5–15 active clients
- **Goals**: Monitor client progress remotely, catch form errors before they cause injury, reduce the admin burden of tracking client sessions
- **Pain Points**: Clients train between sessions with no oversight; relies on client self-reporting for progress (unreliable); no scalable way to review form quality without being physically present
- **Technical Level**: Intermediate — comfortable with fitness apps, not a developer
- **Usage Pattern**: Logs in 1–2x per day to review overnight/morning sessions and check for red alerts

### Secondary: Jordan — The Trainee
- **Role**: Amateur lifter working with a personal trainer
- **Goals**: Improve form, track progress, get coaching feedback even when training alone
- **Pain Points**: Unsure if their form is correct during solo sessions; wants trainer-level feedback without waiting for the next in-person session
- **Technical Level**: Novice-to-intermediate — uses fitness apps regularly
- **Usage Pattern**: Opens the app at the gym for every session, records 3–6 sets per exercise across a 45–75 minute workout

---

## User Stories & Acceptance Criteria

### Story 1: Trainer Invites a Trainee

**As a** Trainer
**I want to** invite a trainee by entering their email address
**So that** they can register and their data automatically links to my account

**Acceptance Criteria:**
- [ ] Trainer can enter any email address in the "Add Trainee" screen
- [ ] System sends an email invitation with a registration link
- [ ] When trainee registers via that link, they are automatically associated with the inviting trainer
- [ ] Trainer's dashboard shows the new trainee as pending until they complete registration
- [ ] Trainee cannot be double-linked to multiple trainers in MVP

---

### Story 2: Trainee Logs a Recorded Set with AI Feedback

**As a** Trainee
**I want to** record myself doing a set and immediately see AI form feedback
**So that** I know whether my technique is safe and correct before my next set

**Acceptance Criteria:**
- [ ] Trainee can select an exercise from the supported list (Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Pull-up, Lunge)
- [ ] Tapping "Start Recording" activates the camera; MediaPipe pose estimation begins immediately on-device
- [ ] Tapping "Stop" ends recording and triggers AI analysis
- [ ] AI feedback (Green / Yellow / Red score + coaching text) appears within 3 seconds on a standard 4G connection
- [ ] After viewing feedback, trainee can enter weight, reps, and sets for that set — logging is never blocked by AI status
- [ ] If AI is unavailable, feedback is skipped silently; session log continues normally
- [ ] Trainee can repeat this flow for additional sets and exercises within the same session

---

### Story 3: Trainer Reviews a Trainee's Session

**As a** Trainer
**I want to** see a full breakdown of any trainee's recent session including their form scores
**So that** I can identify issues and provide informed guidance at our next interaction

**Acceptance Criteria:**
- [ ] Trainer's dashboard lists all linked trainees with their most recent session date
- [ ] Trainer can tap any trainee to see their full session history (date, exercises logged, sets/reps/weight)
- [ ] For each recorded set, the form score (Green / Yellow / Red) and AI coaching feedback text are visible
- [ ] Sessions with at least one Red-scored set are visually highlighted in the trainee list (e.g., red badge or indicator)
- [ ] The highlight persists until the trainer opens that session (read-on-view acknowledgment)

---

### Story 4: Trainer Spots a Red-Flag Alert on Dashboard

**As a** Trainer
**I want to** see flagged alerts when a trainee has poor form
**So that** I don't miss dangerous technique issues between sessions

**Acceptance Criteria:**
- [ ] Any session containing one or more Red form scores appears with a visual alert on the trainer's dashboard
- [ ] Alert is visible on the trainer's home screen without navigating deeper
- [ ] Trainer can tap the alert to go directly to the flagged session
- [ ] Alert clears once the trainer has viewed the session details

---

## Functional Requirements

### Core Features

**Feature 1: Role-Based Authentication**
- Description: Two account types — Trainer and Trainee — with distinct dashboards and permissions. Registration supports both email/password creation and invitation-link flow (for trainees).
- User flow: Open app → Register (select role) or accept invite → Log in → Role-appropriate home screen
- Edge cases: Invalid/expired invite links show a clear error with option to register independently. Password reset via email.
- Error handling: Auth errors show user-friendly messages; sessions are secured via JWT with refresh token support.

**Feature 2: Trainer–Trainee Linking via Email Invite**
- Description: Trainer enters a trainee's email from their dashboard. System sends an invitation email. Trainee registers via the link and is automatically associated.
- User flow: Trainer taps "Add Trainee" → enters email → confirmation shown → trainee receives email → trainee registers via link → trainer's dashboard updates
- Edge cases: Email already registered (show "already has account, send a link request instead"). Invite expires after 7 days.
- Error handling: Failed email delivery shows trainer a retry option. Invalid email format validated before submission.

**Feature 3: Workout Session Logging**
- Description: Trainees start a session, then log each exercise set with weight, reps, and set number. Session data persists to the backend for trainer review.
- User flow: Start Session → Select exercise → Record set (or skip recording) → Log weight/reps → Add next set/exercise → End Session
- Edge cases: App crash during session — partial session data is auto-saved locally and synced on next open. Session can have 0 recorded sets (manual log only).
- Error handling: Backend sync failures queue locally and retry on next network availability.

**Feature 4: On-Device Pose Estimation (MediaPipe)**
- Description: When recording a set, MediaPipe runs on the device to detect body keypoints and calculate joint angles frame-by-frame. No video data leaves the device.
- User flow: Camera activates → MediaPipe detects pose → angles calculated per frame → on "Stop", aggregate angle data (min, max, average per joint over the set) is compiled for AI submission
- Supported joints by exercise:
  - Squat: knee angle, hip angle, back angle (forward lean)
  - Deadlift: hip angle, spine neutrality, knee angle
  - Bench Press: elbow angle, wrist alignment, bar path
  - Overhead Press: elbow angle, wrist position, core alignment
  - Barbell Row: back angle, elbow angle
  - Pull-up: elbow angle, shoulder engagement, chin-to-bar clearance
  - Lunge: front knee angle, back knee angle, torso upright
- Edge cases: Poor lighting or camera occlusion — MediaPipe returns low-confidence scores. These are flagged in the AI prompt context so feedback accounts for data quality.
- Error handling: If MediaPipe fails to detect a pose after 5 seconds, prompt user to reposition. Set can still be manually logged.

**Feature 5: AI Form Quality Analysis**
- Description: After a set is completed, the compiled angle data + exercise name + rep count is sent to an AI model API. The model returns a structured response: a quality tier (Green/Yellow/Red) and a 2–3 sentence coaching note.
- User flow: Recording stops → angle data compiled → API call made → response displayed on screen (score badge + coaching text)
- Data sent to AI (no video): exercise name, rep count, joint angle summary (per joint: min, max, average, key deviations), MediaPipe confidence level
- Score definitions:
  - **Green**: Form is within acceptable range — no significant deviations detected
  - **Yellow**: Minor form issues present — improvement recommended but not unsafe
  - **Red**: Significant form breakdown — risk of injury if not corrected
- Edge cases: AI API timeout after 5 seconds — display "Analysis unavailable" and continue. API response malformed — fallback to generic "Unable to analyze this set" message.
- Error handling: Graceful degradation — session log is never blocked by AI failure.

---

### Out of Scope (MVP)
- Real-time overlay or live form guidance during the set (feedback is post-set only)
- Video storage or playback on any server
- Nutrition tracking or calorie logging
- In-app messaging between trainer and trainee
- Workout program creation or assignment
- Multi-trainer or multi-gym account management
- Payment or subscription handling
- Web dashboard (mobile app only)

---

## Technical Constraints

### Performance
- AI form feedback: < 3 seconds end-to-end from set completion to feedback display on 4G
- App launch to ready-to-record: < 2 seconds cold start
- Backend API responses (non-AI): < 500ms for session logging and dashboard data

### Security & Privacy
- **Video data**: Never transmitted to or stored on any server. All MediaPipe processing happens on-device. Only angle metrics and AI-generated text are stored.
- **Authentication**: JWT-based auth with refresh tokens. Tokens expire after 24 hours; refresh tokens after 30 days.
- **Data storage**: Trainee workout data is only visible to the trainee themselves and their linked trainer. No cross-account data access.
- **Transport**: All API communication over HTTPS/TLS.
- **Compliance**: No HIPAA or GDPR special-category data collected (no health conditions, biometrics stored as raw data). Standard data protection practices apply.

### Integration
- **MediaPipe**: `@mediapipe/tasks-vision` or React Native equivalent for on-device pose landmark detection
- **AI API**: LLM API (model TBD — Claude or GPT-4 class) for form analysis. Prompt includes angle data + exercise context. Responses must be structured (score tier + feedback text).
- **Email**: Transactional email service (e.g., SendGrid or Resend) for invitation emails

### Technology Stack
- **Mobile**: React Native (iOS + Android)
- **Backend**: Node.js + Express (or Fastify)
- **Database**: SQL (PostgreSQL recommended) — relational model fits trainer→trainee→session→set hierarchy
- **Auth**: JWT (access + refresh token pair)
- **Deployment**: Backend on cloud (Railway, Render, or AWS — TBD)

---

## MVP Scope & Phasing

### Phase 1: MVP (All required for initial validation)

| Feature | Description |
|---|---|
| Role-based auth | Trainer + Trainee registration, login, JWT sessions |
| Email invite | Trainer invites trainee; auto-link on registration |
| Session logging | Log exercises, sets, reps, weight per trainee |
| MediaPipe recording | On-device pose estimation during set recording |
| AI form feedback | Post-set analysis: Green/Yellow/Red + coaching text |
| Trainer dashboard | View all trainees, sessions, scores, Red alerts |

**MVP Definition**: A trainee can complete a full workout session with AI form feedback, and a trainer can log in and see that session with scores. All 6 features must work together as a continuous loop.

### Phase 2: Enhancements (Post-MVP)

**Progress Charts & Analytics**
- Visualize weight lifted over time per exercise per trainee
- Form score trend line (is form improving session to session?)
- Session frequency heatmap
- Available to both trainer (for all trainees) and trainee (for themselves)

**Workout Program Builder**
- Trainer creates structured programs (e.g., "Week 1: Mon — Squat 3x5, Bench 3x5, Row 3x5")
- Assigns programs to specific trainees
- Trainee sees today's prescribed workout when they open the app
- Session logging pre-populates with the prescribed exercises

### Future Considerations
- In-app messaging / trainer feedback on specific sets
- Group training mode (one trainer, multiple trainees in the same session)
- Wearable integration (heart rate, rep counting from Apple Watch / Garmin)
- Live coaching mode (trainer watches trainee's camera feed in real time)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| MediaPipe accuracy varies by device/lighting | High | Medium | Show confidence indicator to user; prompt repositioning if confidence is low; AI prompt includes confidence context |
| AI API latency exceeds 3s on slow networks | Medium | Medium | Set 5s hard timeout; display "Analyzing..." with spinner; show result when ready without blocking logging |
| Trainee doesn't hold phone at correct angle for MediaPipe | High | Medium | Onboarding screen with setup guide per exercise (where to place the phone); in-app prompts if no pose detected |
| AI feedback is generic / not useful | Medium | High | Craft exercise-specific prompts with angle thresholds; include rep count and deviation magnitude for context-rich analysis |
| Low trainee adoption (too much friction to record) | Medium | High | Recording is optional per set — trainees can log manually. Reduce friction: one-tap to start recording from the exercise screen |
| SQL schema not flexible enough for future exercises | Low | Low | Design exercise table with JSON-compatible angle config field — easy to add new exercises without schema migrations |

---

## Dependencies & Blockers

**Dependencies:**
- **MediaPipe React Native compatibility**: Needs validation that `@mediapipe/tasks-vision` works in RN or that an equivalent RN library exists. This is the highest technical risk item and should be spiked first.
- **AI API selection**: Claude or GPT-4 class model must be selected; API key and rate limits confirmed before building the analysis pipeline.
- **Email service**: Transactional email provider (SendGrid / Resend) account and verified sender domain needed for invite flow.

**Known Blockers:**
- None at PRD stage — MediaPipe + RN compatibility is a known risk but not yet a confirmed blocker. Recommend a 1-day technical spike as the first dev task.

---

## Appendix

### Glossary
- **MediaPipe**: Google's open-source ML framework for on-device pose landmark detection
- **Joint angle**: The calculated angle at a body joint (e.g., knee angle = angle between thigh and shin vectors) derived from pose landmark coordinates
- **Form score**: Green / Yellow / Red quality rating generated by the AI based on angle deviations from ideal form for a given exercise
- **Set**: One continuous sequence of repetitions of an exercise before resting (e.g., "3 sets of 5 reps of squat")
- **Session**: A full workout consisting of multiple exercises and sets
- **Red alert**: A dashboard indicator shown to the trainer when a trainee's session contains at least one Red-scored set

### References
- MediaPipe Pose Landmarker: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
- React Native camera integration: consider `react-native-vision-camera` for camera access + frame processors
- PRD generated through interactive requirements gathering with Sarah (Product Owner AI)

---

