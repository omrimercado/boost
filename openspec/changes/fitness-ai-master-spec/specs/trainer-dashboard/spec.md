## ADDED Requirements

### Requirement: Trainer sees a list of all linked trainees on the home screen
The Trainer home screen SHALL display all trainees linked to the authenticated trainer (status "active" and "pending"). Each list item SHALL show the trainee's name (or invite email if pending), most recent session date, and a Red alert badge if applicable.

#### Scenario: Trainer sees active trainees
- **WHEN** a Trainer opens the dashboard with linked trainees
- **THEN** each active trainee appears with their display name, the date of their most recent completed session (or "No sessions yet" if none), and any unread Red alert badge

#### Scenario: Trainer sees pending trainees
- **WHEN** a Trainer has sent an invite that has not been accepted yet
- **THEN** the pending entry appears with the invited email address and a "Pending" badge — no session data is shown

#### Scenario: Trainer with no trainees sees empty state
- **WHEN** a Trainer has no linked trainees
- **THEN** the dashboard shows an empty state with a prompt: "Add your first trainee to get started" and an "Add Trainee" button

---

### Requirement: Red alert badge is shown for unread sessions with critical form
The system SHALL display a visual Red alert badge on a trainee's list item when that trainee has at least one completed session containing one or more Red-scored sets that the Trainer has not yet viewed.

#### Scenario: Red badge appears on trainee with unread Red session
- **WHEN** a trainee has a session with ≥1 Red form score and the Trainer has not viewed that session
- **THEN** a red badge or indicator is visible on that trainee's row in the trainer's home screen without any additional navigation

#### Scenario: Multiple unread Red sessions aggregate into one badge
- **WHEN** a trainee has multiple sessions with Red scores, all unread
- **THEN** a single Red badge is shown — the badge count is not required for MVP (presence/absence is sufficient)

#### Scenario: No Red badge when all Red sessions have been viewed
- **WHEN** a Trainer has opened every session containing Red scores for a trainee
- **THEN** no Red badge is shown on that trainee's row

---

### Requirement: Trainer can tap a trainee to see their full session history
Tapping a trainee row SHALL navigate to a session history screen showing all completed sessions for that trainee in reverse chronological order. Each session item SHALL show the date, exercises included, and a summary of form score distribution.

#### Scenario: Trainer views trainee session list
- **WHEN** a Trainer taps a trainee's row
- **THEN** the app navigates to a screen showing all completed sessions for that trainee, ordered newest first, each showing: date, exercise names, and Green/Yellow/Red counts

#### Scenario: Session with Red scores is visually highlighted in the list
- **WHEN** a session contains at least one Red-scored set
- **THEN** that session row is highlighted with a red visual indicator in the session list

---

### Requirement: Trainer can view full session detail with per-set form scores
Tapping a session SHALL navigate to a detail screen showing all sets logged in that session. For each set that has a form score, the score tier badge and coaching text SHALL be visible. Sets without a form score SHALL show "No form data" for that set.

#### Scenario: Trainer views session detail with form scores
- **WHEN** a Trainer opens a session that includes AI-analyzed sets
- **THEN** each set row shows: exercise name, weight, reps, set number, and the form score badge (color-coded Green/Yellow/Red) with the coaching text visible (or expandable)

#### Scenario: Trainer views session detail with unscored sets
- **WHEN** a session contains sets where AI analysis was unavailable
- **THEN** those set rows show "No form data" — they are not hidden or treated as errors

---

### Requirement: Red alert clears when Trainer views the session
The system SHALL mark a session as "read" by the trainer when the trainer navigates to that session's detail screen. Viewing the session SHALL clear the Red alert for that session. The alert SHALL clear immediately (optimistic) and be confirmed by the backend.

#### Scenario: Alert clears on session view
- **WHEN** a Trainer opens a session detail screen for a session with unread Red scores
- **THEN** the Red badge on the trainee's row clears immediately (the PATCH /trainer/sessions/:id/read call is made), and on next app open the badge does not reappear for that session

#### Scenario: Trainer navigates directly to flagged session from home
- **WHEN** a Trainer taps the Red badge on a trainee's home screen row
- **THEN** the app navigates directly to the most recent unread Red session for that trainee (skipping the trainee session list)

---

### Requirement: Trainer dashboard data loads within 500ms
The API endpoint for the trainer's trainee list (including last session date and alert status) SHALL return within 500ms for up to 50 trainees.

#### Scenario: Dashboard loads within performance target
- **WHEN** a Trainer opens the app and the dashboard fetches trainee data
- **THEN** the list renders within 500ms of the authenticated app launch (non-AI backend response target)

#### Scenario: Dashboard shows loading skeleton during fetch
- **WHEN** the trainee list is loading
- **THEN** the app shows skeleton placeholder rows rather than a blank screen or spinner — once data arrives the skeletons are replaced with real content
