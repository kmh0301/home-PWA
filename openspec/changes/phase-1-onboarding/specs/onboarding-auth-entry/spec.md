## ADDED Requirements

### Requirement: User SHALL be able to authenticate from the public onboarding entry
The system SHALL provide a public login/register page that supports email/password sign-in, email/password sign-up with display name and password confirmation, password reset initiation, and Google/Apple OAuth entrypoints.

#### Scenario: User switches from login to register mode
- **WHEN** the user toggles from login to register on the public auth page
- **THEN** the system SHALL reveal the display name and password confirmation fields required for registration

#### Scenario: Authentication fails
- **WHEN** Supabase returns an authentication or registration error
- **THEN** the system SHALL present a user-facing error message without losing the current form state

#### Scenario: User chooses OAuth sign-in
- **WHEN** the user taps Google or Apple sign-in
- **THEN** the system SHALL start the corresponding Supabase OAuth flow with the configured callback route

### Requirement: Password reset SHALL be accessible from the onboarding auth entry
The system SHALL expose a forgot-password action from the public auth page.

#### Scenario: User requests password reset
- **WHEN** the user submits the reset action with a valid email
- **THEN** the system SHALL trigger the Supabase password-reset flow and confirm that the reset email action was sent
