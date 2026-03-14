## ADDED Requirements

### Requirement: User SHALL be able to complete initial payment-account setup during onboarding
The system SHALL present default payment-account presets, allow optional custom accounts, capture starting balances, and create only the enabled accounts.

#### Scenario: User keeps default preset accounts
- **WHEN** the user leaves the default preset accounts enabled and submits the setup form
- **THEN** the system SHALL create the enabled accounts and preserve the configured starting values

#### Scenario: User adds a custom account
- **WHEN** the user adds a custom account during onboarding
- **THEN** the system SHALL include that account in the final setup submission with the selected type and starting values

### Requirement: Initial account balances SHALL be initialized through the documented account mutation boundaries
The system SHALL use the documented adjustment and credit-balance RPC paths for non-zero starting balances or credit-card used amounts rather than mutating balances inline.

#### Scenario: User enters a non-zero starting balance
- **WHEN** the user submits an enabled non-credit account with a non-zero starting balance
- **THEN** the system SHALL create the account and initialize the balance through the documented manual-adjustment path

#### Scenario: User configures a credit card with existing used balance
- **WHEN** the user submits a credit-card account with limit and used amount
- **THEN** the system SHALL validate the values and initialize the card through the documented credit-used adjustment path

### Requirement: User SHALL be allowed to defer account setup
The system SHALL allow the user to skip the initial account setup step and continue into the app.

#### Scenario: User skips initial account setup
- **WHEN** the user selects the skip action
- **THEN** the system SHALL persist the onboarding-complete state and route the user into the protected app without creating accounts
