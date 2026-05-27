## ADDED Requirements

### Requirement: Trainer can register with email and password
The system SHALL allow a new user to register as a Trainer by providing a unique email address and a password. Upon successful registration, the system SHALL issue a JWT access token and refresh token pair and navigate the user to the Trainer dashboard.

#### Scenario: Successful trainer registration
- **WHEN** a user submits a valid email and password with role "trainer"
- **THEN** the system creates a new user record with role "trainer", returns a JWT access token (15-minute expiry) and refresh token (30-day expiry), and the mobile app navigates to the Trainer dashboard

#### Scenario: Duplicate email on registration
- **WHEN** a user submits an email that already exists in the system
- **THEN** the system returns a 409 error with the message "An account with this email already exists" and no user record is created

#### Scenario: Invalid email format
- **WHEN** a user submits a malformed email address
- **THEN** the system returns a 400 validation error before attempting to create any record

---

### Requirement: Trainee can register via invite link
The system SHALL allow a new user to register as a Trainee by following a trainer's invite link. The invite link SHALL pre-populate the trainee's email and SHALL automatically link the trainee to the inviting trainer upon successful registration. The role is fixed as "trainee" — no role selection is shown.

#### Scenario: Successful invite-link registration
- **WHEN** a trainee follows a valid (non-expired, unused) invite link and submits a password
- **THEN** the system creates a new user with role "trainee", marks the invite as used, links the trainee to the inviting trainer with status "active", issues tokens, and navigates to the Trainee session screen

#### Scenario: Expired invite link
- **WHEN** a trainee follows an invite link that is older than 7 days
- **THEN** the system returns a 410 error and the app shows "This invite link has expired. Ask your trainer to send a new one." with an option to register independently

#### Scenario: Already-used invite link
- **WHEN** a trainee follows an invite link that has already been accepted
- **THEN** the system returns a 410 error and the app shows "This invite has already been used. Log in if you already have an account."

---

### Requirement: User can log in with email and password
The system SHALL authenticate users by verifying email and password. On success, SHALL issue a new JWT access token and refresh token pair. Role is determined from the stored user record.

#### Scenario: Successful login as Trainer
- **WHEN** a Trainer submits correct email and password
- **THEN** the system returns a new access token and refresh token, and the app navigates to the Trainer dashboard

#### Scenario: Successful login as Trainee
- **WHEN** a Trainee submits correct email and password
- **THEN** the system returns a new access token and refresh token, and the app navigates to the Trainee session screen

#### Scenario: Incorrect password
- **WHEN** a user submits a correct email but wrong password
- **THEN** the system returns a 401 error with the message "Invalid email or password" (no indication of which field is wrong)

#### Scenario: Non-existent email
- **WHEN** a user submits an email not found in the system
- **THEN** the system returns a 401 error with the same message "Invalid email or password"

---

### Requirement: Access token is refreshed silently
The system SHALL issue a new access token when the mobile app presents a valid, non-expired refresh token. The refresh SHALL be transparent to the user.

#### Scenario: Silent token refresh
- **WHEN** the app detects the access token is expired and presents a valid refresh token
- **THEN** the system returns a new access token and the original API request is retried without user interaction

#### Scenario: Expired refresh token
- **WHEN** the app presents a refresh token that has expired or been revoked
- **THEN** the system returns a 401 and the app clears stored tokens and navigates to the Login screen

---

### Requirement: Role-gated navigation enforced on mobile
The system SHALL render role-appropriate navigation structures. A Trainer SHALL never see the Trainee session recording flow, and a Trainee SHALL never see the Trainer dashboard.

#### Scenario: Trainer sees Trainer navigation
- **WHEN** a user with role "trainer" is authenticated
- **THEN** the app renders the Trainer tab navigator (Dashboard, Profile) and no Trainee-specific screens are reachable

#### Scenario: Trainee sees Trainee navigation
- **WHEN** a user with role "trainee" is authenticated
- **THEN** the app renders the Trainee tab navigator (Workout, History, Profile) and no Trainer-specific screens are reachable

---

### Requirement: User can request a password reset
The system SHALL allow a user to request a password reset email by submitting their registered email address. The reset link SHALL expire after 1 hour.

#### Scenario: Password reset email sent
- **WHEN** a user submits a registered email on the "Forgot Password" screen
- **THEN** the system sends a reset email and displays "If an account exists for that email, a reset link has been sent"

#### Scenario: Reset link used within expiry
- **WHEN** a user follows a valid reset link and submits a new password
- **THEN** the system updates the password hash, invalidates all existing refresh tokens for the user, and navigates to the Login screen

#### Scenario: Expired reset link
- **WHEN** a user follows a reset link older than 1 hour
- **THEN** the system returns an error and the app shows "This reset link has expired. Request a new one."
