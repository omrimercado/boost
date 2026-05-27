## Why

There is no codebase yet — this is a greenfield project. The PRD defines a validated product concept (AI-powered fitness form coaching) that requires a complete technical foundation: a React Native mobile app, a Node.js/Express API, a PostgreSQL database, and an AI analysis pipeline. The master spec establishes the full system architecture so every subsequent feature spec is built on a consistent, shared foundation.

## What Changes

- Stand up a TypeScript React Native mobile app (iOS + Android) with Expo or bare workflow
- Stand up a TypeScript Node.js/Express REST API with PostgreSQL
- Define the full data model: users, trainer–trainee relationships, sessions, sets, form scores
- Define JWT auth (access + refresh token) flows for Trainer and Trainee roles
- Define the Trainer–Trainee email invite flow using Resend
- Integrate on-device MediaPipe pose estimation for joint angle extraction (spike required first)
- Build the AI form analysis pipeline using the Claude API (structured output: score tier + coaching text)
- Build the Trainer dashboard: trainee list, session history, Red-alert indicators
- Build the Trainee session recording and logging flow

## Capabilities

### New Capabilities

- `role-based-auth`: Trainer and Trainee registration, login, JWT access + refresh token lifecycle, role-gated routing on mobile
- `trainer-trainee-linking`: Trainer invites trainee by email via Resend; trainee registers through invite link and is auto-linked; pending state on dashboard until registration complete
- `session-logging`: Trainee starts/ends sessions; logs exercises, sets, reps, and weight; local-first with backend sync; partial session persistence on crash
- `pose-estimation`: On-device MediaPipe pose landmark detection during set recording; per-joint angle computation (min/max/avg); confidence scoring; no video leaves device
- `ai-form-analysis`: Post-set Claude API call with angle data + exercise context; returns Green/Yellow/Red score + 2–3 sentence coaching note; graceful degradation on timeout or failure
- `trainer-dashboard`: Trainer home screen listing all linked trainees with last session date; Red-alert badges for sessions with ≥1 Red score; drill-down to session detail with per-set form scores; read-on-view alert clearing

### Modified Capabilities

## Impact

- New repo (no existing code affected)
- External dependencies: Claude API (Anthropic), Resend (email), MediaPipe tasks-vision (on-device ML), react-native-vision-camera (camera + frame processors)
- Database: PostgreSQL schema covering users, trainer_trainee, sessions, sets, form_scores
- All API routes are new; no breaking changes to existing systems
