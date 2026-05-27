## ADDED Requirements

### Requirement: AI form analysis is triggered automatically after recording stops
When a trainee stops recording a set and pose data has been collected, the system SHALL automatically call the Claude API with the compiled angle data. The call SHALL happen in the background — the trainee sees a "Analyzing your form..." loading state while waiting.

#### Scenario: Analysis triggered after recording
- **WHEN** a Trainee taps "Stop Recording" and angle data is available
- **THEN** the app immediately shows a "Analyzing your form..." loading indicator and initiates the Claude API request in the background

#### Scenario: No analysis when no pose data available
- **WHEN** a Trainee stops recording but MediaPipe detected no pose (zero frames with valid landmarks)
- **THEN** no AI API call is made; the set proceeds directly to the manual logging fields with no feedback display

---

### Requirement: AI request payload includes exercise context and angle summary
The Claude API request SHALL include the following fields in a structured prompt: exercise name, rep count, per-joint angle summary (min/max/avg/deviation_count per joint), MediaPipe confidence level, and a note on confidence quality. No image data or video is included.

#### Scenario: Request payload is correctly structured
- **WHEN** the AI analysis request is sent for a Squat set
- **THEN** the request includes: `exercise: "Squat"`, `rep_count: N`, `joints: { knee_angle: { min, max, avg, deviation_count }, hip_angle: {...}, back_angle: {...} }`, `confidence: 0.87`, `confidence_note: "High confidence detection"`

---

### Requirement: Claude API returns structured form score response
The system SHALL use Claude's tool use feature (or structured output mode) to guarantee a typed response. The response schema SHALL be: `{ score_tier: "green" | "yellow" | "red", coaching_text: string }`. The `coaching_text` SHALL be 2–3 sentences of actionable coaching advice.

#### Scenario: Successful structured response
- **WHEN** the Claude API returns a valid response
- **THEN** the app receives `score_tier` and `coaching_text` with no parsing errors, displays the score badge (color-coded) and coaching text on screen

#### Scenario: Green score returned
- **WHEN** the AI determines form is within acceptable range
- **THEN** `score_tier` is "green" and `coaching_text` reinforces what the trainee did well

#### Scenario: Yellow score returned
- **WHEN** the AI detects minor form issues
- **THEN** `score_tier` is "yellow" and `coaching_text` identifies the specific joint/deviation and gives a corrective cue

#### Scenario: Red score returned
- **WHEN** the AI detects significant form breakdown with injury risk
- **THEN** `score_tier` is "red" and `coaching_text` clearly identifies the dangerous pattern and how to correct it

---

### Requirement: AI feedback displays within 3 seconds on 4G
The system SHALL display the AI form feedback result within 3 seconds of set completion for users on a standard 4G connection. The system SHALL impose a 5-second hard timeout on the Claude API call.

#### Scenario: Feedback received within 3 seconds
- **WHEN** the Claude API responds within 3 seconds
- **THEN** the loading indicator disappears and the score badge + coaching text appear on screen

#### Scenario: API timeout at 5 seconds
- **WHEN** the Claude API does not respond within 5 seconds
- **THEN** the loading indicator is replaced with "Analysis unavailable for this set" — the set logging form appears so the trainee can continue; no score is stored for this set

---

### Requirement: AI failure never blocks session logging
The system SHALL ensure that a failed, timed-out, or malformed AI response never prevents the trainee from saving the set. The set is always saved; the form_score field is simply null when AI is unavailable.

#### Scenario: API error during analysis
- **WHEN** the Claude API returns a 5xx error or the response cannot be parsed into the expected schema
- **THEN** the app shows "Couldn't analyze this set" and immediately presents the manual set logging fields — the set is saved without a form score

#### Scenario: Network offline during AI call
- **WHEN** the device has no network connection when the AI call is attempted
- **THEN** the AI call is skipped silently, the app shows "No connection — form analysis skipped" and proceeds to set logging

---

### Requirement: AI uses exercise-specific prompts with angle thresholds
The system SHALL maintain a per-exercise prompt configuration that includes the ideal angle ranges for each joint. The Claude system prompt SHALL include these thresholds so the model can make informed, exercise-specific judgments rather than generic form feedback.

#### Scenario: Squat prompt includes knee angle thresholds
- **WHEN** the AI analysis request is for a Squat
- **THEN** the system prompt includes the ideal knee angle range for a squat (e.g., 90°–120° at depth), the acceptable forward lean range, and the hip angle target — the model evaluates the trainee's data against these thresholds

---

### Requirement: Form score and coaching text are stored per set
The system SHALL persist the AI response (score_tier, coaching_text, and the angle_data JSON used for the call) to the `form_scores` table, linked to the specific set. This record is immutable after creation.

#### Scenario: Form score stored after analysis
- **WHEN** the Claude API returns a valid response
- **THEN** a `form_scores` record is created with the set_id, score_tier, coaching_text, angle_data, and confidence_level — this record is never updated or deleted
