# ADR-003: Email authentication links and Mailpit for development

## Status

Accepted

## Date

2026-10-23

## Context

Staff registration already creates a signed verification token, but previously returned that token in the API response. The project also needs password-reset email without sending development mail to real recipients.

## Decision

- Deliver account-verification, password-reset, and test messages through `EmailService`.
- Run Mailpit as a local-only Docker Compose service. The web inbox is on port 8025 and SMTP is on port 1025.
- Build frontend links from `Email:FrontendBaseUrl`, `Email:VerifyEmailPath`, and `Email:ResetPasswordPath`; never hard-code the frontend host in application code.
- Use a dedicated `Jwt:ResetPasswordSecret:Key` for reset tokens. Reset tokens expire after 15 minutes and their SHA-256 hash is stored against the employee record; the hash is cleared after a successful reset, making each link single-use.
- Return `204 No Content` for every password-reset request, whether or not an active account exists, to prevent email enumeration.

## Alternatives considered

### Return tokens in API responses

Rejected because browser/API logs can expose the token and it defeats the purpose of an email-confirmation flow.

### Use the registration-token secret for password reset

Rejected because separate token purposes require separate trust boundaries. A registration token must never be usable as a password-reset token.

### Send development mail via a real SMTP provider

Rejected for local development because it can accidentally email real people. Mailpit captures messages locally while preserving the intended recipient in the message's `To` field.

## Consequences

- Deployments must provide the existing JWT secrets plus `Jwt:ResetPasswordSecret:Key`; no secret is committed in this repository.
- Existing registration clients must stop reading the removed `activation` response field and instead follow the email link.
- Applying migration `20261023000000_AddPasswordResetTokenHash` is required before password reset is available against PostgreSQL.

## Affected artifacts

- `app/backend/src/Controllers/AuthController.cs`
- `app/backend/src/Services/{AuthService,EmailService,TokenService}.cs`
- `app/backend/src/Data/Migrations/20261023000000_AddPasswordResetTokenHash.cs`
- `docker-compose.yaml`
