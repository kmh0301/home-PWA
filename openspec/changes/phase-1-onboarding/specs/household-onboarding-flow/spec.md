## ADDED Requirements

### Requirement: User SHALL be able to create a household during onboarding
The system SHALL allow an authenticated user without a household to create one by providing a household name, creating the membership record, and generating a shareable invite code.

#### Scenario: User creates a household successfully
- **WHEN** the user submits a valid household name
- **THEN** the system SHALL create the household, create the creator membership, create an invite code, and present the invite code modal before moving to account setup

### Requirement: User SHALL be able to join a household with a valid invite code
The system SHALL allow an authenticated user without a household to validate and claim a six-character invite code through the documented RPC boundary.

#### Scenario: Invite code is valid
- **WHEN** the user enters a valid invite code
- **THEN** the system SHALL show the household preview returned by invite validation before the user confirms the join

#### Scenario: Invite claim fails
- **WHEN** invite validation or claim fails because the code is invalid, expired, duplicate, or the household is full
- **THEN** the system SHALL map the failure to a user-facing error state and keep the user on the join flow

### Requirement: Household onboarding SHALL preserve the v1 two-member limit
The system SHALL respect the two-member household constraint documented for v1 onboarding.

#### Scenario: User attempts to join a full household
- **WHEN** the claim invite operation fails because the household already has two members
- **THEN** the system SHALL block the join and show a household-full error state
