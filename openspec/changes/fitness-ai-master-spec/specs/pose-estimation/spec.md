## ADDED Requirements

### Requirement: Camera activates when recording starts
The system SHALL activate the device camera when the trainee taps "Start Recording" on an exercise set. Camera access SHALL be requested with a clear permission prompt on first use. If camera permission is denied, the set falls back to manual logging with no error blocking.

#### Scenario: Camera activates on first tap
- **WHEN** a Trainee taps "Start Recording" and camera permission has been granted
- **THEN** the camera feed appears on screen within 2 seconds and MediaPipe pose estimation begins immediately

#### Scenario: Camera permission denied
- **WHEN** camera permission has been denied by the user
- **THEN** tapping "Start Recording" shows an inline message: "Camera access is needed for form analysis. You can still log this set manually." — the manual logging flow continues without camera

---

### Requirement: MediaPipe detects body pose landmarks on-device in real time
The system SHALL run MediaPipe pose landmark detection on each camera frame during recording. All processing SHALL occur on the device — no camera frames or raw image data SHALL be transmitted to any server. The system SHALL use `react-native-vision-camera` frame processors as the integration layer.

#### Scenario: Pose detected during recording
- **WHEN** a trainee is visible in frame and adequately lit
- **THEN** MediaPipe detects 33 body landmarks per frame, and joint angle calculations begin for the selected exercise's relevant joints

#### Scenario: Pose not detected after 5 seconds
- **WHEN** MediaPipe fails to detect a valid pose for 5 consecutive seconds from recording start
- **THEN** the app shows an overlay prompt: "Can't detect your position. Adjust the camera angle or lighting." — the trainee may reposition; detection continues; if still no pose, the trainee can tap "Skip Recording" to fall back to manual logging

#### Scenario: No video data transmitted
- **WHEN** a recording session completes
- **THEN** only angle metrics (not any image data or video frames) are sent to the AI analysis API

---

### Requirement: Joint angles are computed per frame for the selected exercise
The system SHALL calculate the relevant joint angles on each frame using the detected pose landmarks. The joints tracked SHALL be determined by the selected exercise.

Supported joints per exercise:
- **Squat**: knee angle (both), hip angle, back angle (forward lean)
- **Deadlift**: hip angle, spine neutrality (back angle), knee angle
- **Bench Press**: elbow angle (both), wrist alignment (relative to elbow/shoulder line)
- **Overhead Press**: elbow angle (both), wrist position (overhead alignment), core alignment (lateral lean)
- **Barbell Row**: back angle (horizontal), elbow angle
- **Pull-up**: elbow angle, shoulder engagement (shoulder–elbow–wrist angle), chin-to-bar clearance (head y-position vs. wrist y-position)
- **Lunge**: front knee angle, back knee angle, torso upright angle

#### Scenario: Correct joints tracked for Squat
- **WHEN** the selected exercise is "Squat" and pose is detected
- **THEN** the system computes knee angle (both left and right), hip angle, and back angle on each frame — other joint data is not computed

#### Scenario: Correct joints tracked for Pull-up
- **WHEN** the selected exercise is "Pull-up" and pose is detected
- **THEN** the system computes elbow angle, shoulder engagement angle, and chin-to-bar clearance on each frame

---

### Requirement: Aggregate angle data is compiled on recording stop
When the trainee taps "Stop Recording", the system SHALL compile the per-frame angle data into a per-joint summary: minimum, maximum, and average angle over the set, plus a count of frames where each joint was in a "critical deviation" range (more than 2 standard deviations from the mean). This summary is what is sent to the AI.

#### Scenario: Angle summary compiled on stop
- **WHEN** a Trainee taps "Stop Recording"
- **THEN** for each tracked joint, the system computes: min angle, max angle, average angle, and deviation count — and packages this as a JSON object ready for the AI API call

---

### Requirement: MediaPipe confidence level is tracked and included in AI context
The system SHALL compute an overall confidence level for the pose detection during the set (average landmark visibility score across all frames). This confidence level SHALL be included in the AI analysis request so the model can weight its feedback accordingly.

#### Scenario: High-confidence detection
- **WHEN** MediaPipe detects landmarks with high visibility (≥ 0.8) throughout the set
- **THEN** the confidence level sent to AI is high (≥ 0.8) and the AI prompt includes "High confidence detection"

#### Scenario: Low-confidence detection
- **WHEN** average landmark visibility is below 0.5 (e.g., poor lighting, partial occlusion)
- **THEN** the confidence level is flagged as "low" in the AI request payload and the AI prompt notes "Low confidence — form feedback may be less accurate due to limited pose detection quality"

---

### Requirement: Pose estimation spike must be validated before mobile recording is built
The team SHALL execute a 1-day technical spike to validate that `@mediapipe/tasks-vision` (or an equivalent library) works within `react-native-vision-camera` frame processors on both iOS and Android. Implementation of all pose estimation and recording features SHALL NOT begin until the spike result is confirmed.

#### Scenario: Spike validates MediaPipe in RN
- **WHEN** the spike produces a working frame processor that logs joint angle values on a real device
- **THEN** implementation proceeds using that library and integration approach

#### Scenario: Spike finds MediaPipe incompatible
- **WHEN** the spike cannot produce working pose detection in RN within 1 day
- **THEN** the team evaluates fallback paths (TensorFlow.js React Native, native wrappers) before implementation begins — the spec is updated with the chosen fallback
