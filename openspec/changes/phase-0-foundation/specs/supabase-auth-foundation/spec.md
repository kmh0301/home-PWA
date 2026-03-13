## ADDED Requirements

### Requirement: Supabase integration SHALL provide typed server and client access patterns
The system SHALL define shared Supabase helper modules for server-rendered code, middleware, and browser-rendered code, all aligned to a single generated database type contract.

#### Scenario: Server code needs session-aware database access
- **WHEN** a server component, route handler, or server action needs Supabase access
- **THEN** it SHALL use a shared server helper that is configured from application environment variables and typed against the generated database schema

#### Scenario: Browser code needs authenticated Supabase access
- **WHEN** a client component performs a Supabase interaction
- **THEN** it SHALL use a dedicated browser helper instead of duplicating client construction inline

### Requirement: Authentication foundation SHALL protect protected routes and handle auth callbacks
The system SHALL provide middleware-based route protection and an auth callback endpoint that can exchange the provider response into an application session.

#### Scenario: Unauthenticated user requests a protected route
- **WHEN** a request targets an application route that requires authentication
- **THEN** middleware SHALL redirect the user to the public auth entrypoint

#### Scenario: Auth provider redirects back to the application
- **WHEN** the auth callback route receives a valid authorization response
- **THEN** the system SHALL exchange the response for a session and redirect the user to the configured post-auth destination

### Requirement: Database workflow SHALL define schema application and type generation entrypoints
The system SHALL define where the planned SQL schema is applied from and where generated TypeScript database types are stored so later phases can safely consume the schema.

#### Scenario: Developer prepares local database integration
- **WHEN** the developer follows repository setup instructions
- **THEN** the repository SHALL identify the migration entrypoint for the planned SQL schema and the command/path for generating database types

#### Scenario: Feature code imports database types
- **WHEN** application code needs typed table or RPC definitions
- **THEN** it SHALL import from the shared generated types location rather than duplicating schema types inline
