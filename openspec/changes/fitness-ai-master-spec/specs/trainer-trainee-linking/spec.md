## ADDED Requirements

### Requirement: Trainer can invite a trainee by email
The system SHALL allow an authenticated Trainer to initiate an invitation by entering a trainee's email address. The system SHALL create a pending trainer_trainee record and send an invite email via Resend containing a unique, time-limited invite link (expires 7 days).

#### Scenario: Successful invite sent to new email
- **WHEN** a Trainer submits a valid email address that has no existing account
- **THEN** the system creates a pending trainer_trainee record, generates a unique invite token, sends an invite email via Resend, and the Trainer's "Add Trainee" screen shows "Invitation sent to [email]"

#### Scenario: Invite sent to email already registered as Trainee
- **WHEN** a Trainer submits an email that belongs to an existing Trainee account not linked to any trainer
- **THEN** the system shows a message: "This user already has an account. A linking request has been sent." and sends a different email notifying the trainee of the link request (no new account creation)

#### Scenario: Trainee already linked to another trainer
- **WHEN** a Trainer submits an email belonging to a Trainee who is already linked (status "active") to another trainer
- **THEN** the system returns an error: "This trainee is already connected to another trainer. In this version, trainees can only connect to one trainer." and no invite is sent

#### Scenario: Trainer invites same email twice
- **WHEN** a Trainer submits an email for which a pending invite already exists
- **THEN** the system resends the invite email with a new token (previous token is invalidated) and shows "Invite resent to [email]"

#### Scenario: Invalid email format
- **WHEN** a Trainer submits a malformed email address
- **THEN** the system returns a 400 validation error before sending any email

---

### Requirement: Trainer dashboard shows pending trainees
The system SHALL display pending (invited but not yet registered) trainees separately from active trainees on the Trainer dashboard. Pending trainees SHALL be visually distinct (e.g., grayed out with a "Pending" badge).

#### Scenario: Pending trainee visible on dashboard
- **WHEN** a Trainer has sent an invite but the trainee has not yet registered
- **THEN** the Trainer's trainee list shows the invited email with status "Pending" and no session data

#### Scenario: Trainee activates and appears on dashboard
- **WHEN** the invited trainee completes registration via the invite link
- **THEN** the trainer_trainee record status updates to "active" and the Trainer's dashboard shows the trainee's full name with an empty session history

---

### Requirement: Invite link is validated before registration
The system SHALL verify the invite token is valid (exists, not expired, not used) before allowing the registration form to render. Invalid tokens SHALL display an informative error.

#### Scenario: Valid invite link opens registration form
- **WHEN** a user opens a valid invite link
- **THEN** the app opens the registration screen with the email field pre-filled and read-only, role fixed as "trainee", and the trainer's name displayed ("You've been invited by [trainer name]")

#### Scenario: Invalid token (not found)
- **WHEN** a user opens an invite link with a token not found in the system
- **THEN** the app shows "This invite link is invalid. Ask your trainer for a new one." with a button to go to the standard Login/Register screen

---

### Requirement: Trainee is auto-linked on invite registration
Upon completing registration through a valid invite link, the system SHALL atomically create the user record and update the trainer_trainee record to status "active" with the new trainee's user ID. This SHALL be a single database transaction.

#### Scenario: Registration and linking happen atomically
- **WHEN** a trainee submits their registration via an invite link
- **THEN** the user is created AND the trainer_trainee.status is set to "active" AND the invite.used_at is set in a single transaction — if any step fails, all steps roll back and the user sees a generic error

---

### Requirement: Invite expires after 7 days
The system SHALL reject invite tokens that were created more than 7 days ago and have not been used.

#### Scenario: Invite accessed after 7 days
- **WHEN** a trainee attempts to use an invite token created more than 7 days ago
- **THEN** the system returns a 410 and the app shows "This invite has expired. Ask your trainer to send a new one."
