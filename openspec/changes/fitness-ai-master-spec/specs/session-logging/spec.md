## ADDED Requirements

### Requirement: Trainee can start a workout session
The system SHALL allow an authenticated Trainee to start a new session. Starting a session SHALL create a session record with the current timestamp and persist it locally (MMKV) immediately, with background sync to the backend.

#### Scenario: Session starts successfully
- **WHEN** a Trainee taps "Start Session"
- **THEN** a session record is created locally with a client-generated UUID and current timestamp, the backend sync is queued, and the app navigates to the exercise selection screen

#### Scenario: Session starts while offline
- **WHEN** a Trainee taps "Start Session" with no network connection
- **THEN** the session is created locally and the backend sync is queued for when connectivity returns — the user sees no error and can proceed to log sets

---

### Requirement: Trainee selects an exercise from a supported list
The system SHALL provide a list of supported exercises for the trainee to select before recording or logging a set. The supported exercises for MVP are: Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Pull-up, Lunge.

#### Scenario: Trainee sees supported exercise list
- **WHEN** the trainee navigates to the exercise selection screen during an active session
- **THEN** the app displays all 7 supported exercises and allows the trainee to select one to begin logging sets

---

### Requirement: Trainee logs a set with weight, reps, and set number
After selecting an exercise (and optionally recording it), the system SHALL allow the trainee to enter weight, reps, and set number. The set SHALL be saved locally immediately and synced to the backend asynchronously.

#### Scenario: Set logged with all fields
- **WHEN** a Trainee enters weight (optional for bodyweight exercises), reps, and set number and taps "Save Set"
- **THEN** the set is persisted locally with a client-generated UUID and linked to the active session, sync is queued, and the app returns to the exercise screen ready for the next set

#### Scenario: Set logged with zero weight (bodyweight exercise)
- **WHEN** a Trainee logs a set for an exercise like Pull-up without entering weight
- **THEN** the set is saved with weight_kg as null — no validation error is shown

#### Scenario: Set logging never blocked by AI failure
- **WHEN** AI form analysis is unavailable (timeout or error)
- **THEN** the set can still be saved with all fields; the form_score is null for this set

---

### Requirement: Partial session is auto-saved on crash
The system SHALL persist all session and set data locally (MMKV) as each action occurs. On app restart after a crash during an active session, the system SHALL detect the unfinished session and offer to resume or discard it.

#### Scenario: App crashes mid-session
- **WHEN** the app crashes while a session is active
- **THEN** all sets logged before the crash are preserved in MMKV local storage

#### Scenario: App restarts after crash
- **WHEN** the app restarts and detects a locally-stored session that was never ended
- **THEN** the app shows a prompt: "You have an unfinished session from [time]. Resume or discard?" — if the trainee taps Resume, the session is restored and logging continues; if Discard, the local data is cleared

---

### Requirement: Trainee can end a session
The system SHALL allow the trainee to end the active session at any time. Ending a session SHALL mark it as complete (set ended_at timestamp) and trigger a final sync of all unsynced data.

#### Scenario: Session ended with sets logged
- **WHEN** a Trainee taps "End Session" after logging at least one set
- **THEN** the session's ended_at is set, all unsynced sets are flushed to the backend, and the app navigates to the session summary screen

#### Scenario: Session ended with no sets (empty session)
- **WHEN** a Trainee taps "End Session" without logging any sets
- **THEN** the session is saved as an empty session — no error is shown; empty sessions are valid

---

### Requirement: Session data syncs to backend with retry on failure
The system SHALL maintain a sync queue for session and set data. Failed sync attempts SHALL be retried automatically on next network availability. Each set SHALL be created with the client-generated UUID as the idempotency key to prevent duplicates on retry.

#### Scenario: Sync succeeds on retry after network failure
- **WHEN** a set sync fails due to a network error
- **THEN** the set remains in the sync queue and is retried on the next network event — the user sees no error during logging

#### Scenario: Duplicate set not created on retry
- **WHEN** a set sync is retried and the backend has already received the set (e.g., timeout on the first attempt)
- **THEN** the backend upserts on the set UUID and returns 200 — no duplicate set is created

---

### Requirement: Trainee can view their own session history
The system SHALL display a list of the trainee's completed sessions ordered by most recent. Each session SHALL show the date, total exercises, and a summary of form scores if available.

#### Scenario: Trainee views session history
- **WHEN** a Trainee navigates to the History tab
- **THEN** the app displays all completed sessions in reverse chronological order with date and exercise count

#### Scenario: Session with form scores shows score summary
- **WHEN** a session contains at least one set with a form score
- **THEN** the session list item shows the distribution of Green/Yellow/Red scores for that session
