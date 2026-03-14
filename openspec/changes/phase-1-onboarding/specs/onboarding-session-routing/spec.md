## ADDED Requirements

### Requirement: Entry routing SHALL send users to the correct onboarding or app destination
The system SHALL decide the next route based on session presence, household membership, and onboarding completion state.

#### Scenario: Visitor has no active session
- **WHEN** the visitor opens the root entry experience
- **THEN** the system SHALL route the visitor to the public login/register page

#### Scenario: Authenticated user has no household
- **WHEN** an authenticated user reaches the entrypoint and is not a member of any household
- **THEN** the system SHALL route the user to the household onboarding flow instead of the protected dashboard

#### Scenario: Authenticated user has a household but has not completed account setup
- **WHEN** an authenticated user already belongs to a household and lacks the required initial account setup marker
- **THEN** the system SHALL route the user to the initial payment-account setup step

#### Scenario: Authenticated user has completed onboarding
- **WHEN** an authenticated user already belongs to a household and has completed the initial setup
- **THEN** the system SHALL route the user to the protected dashboard
