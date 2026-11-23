# ADR-004: Configurable session timeout and temporary login lockout

## Status

Accepted

## Date

2026-10-25

## Context

ADR-003 defines the password-reset token but did not define the login-attempt threshold, the temporary-lock period, or how the browser reacts when an access token expires. Leaving ASP.NET Core's default JWT clock skew in place also permitted an expired access token for up to five additional minutes.

## Decision

- Keep the existing password-reset APIs from ADR-003: `POST /api/auth/password-reset-requests` always returns `204`, and `POST /api/auth/password-resets` accepts a single-use reset token and a 12-128-character password.
- Configure authentication policy in the `AuthSecurity` section. Defaults are five failed attempts, a 15-minute temporary lock, a 15-minute access-token lifetime, a 7-day refresh-token lifetime, a 1,024-minute verification-token lifetime, and a 15-minute reset-token lifetime.
- Persist `FailedLoginAttempts` and nullable `LockoutEndUtc` on each employee. A failed credential increments the counter; the attempt that reaches the threshold starts the temporary lock. A successful login, or the first attempt after the lock has expired, clears the counter and lock timestamp. This does not overwrite the administrator-managed `EmployeeStatus`.
- Validate bearer token lifetime with `ClockSkew = TimeSpan.Zero`. In addition to JWT signature and JTI validation, bearer authentication rejects missing, non-active, or temporarily locked employees.
- The frontend treats an access-token `exp` claim as a UX guard only. `/` and `/catalog` are public. `/dashboard`, inventory create/edit routes, and `/checkout` require an unexpired token. On expiry the frontend clears its in-memory session and redirects to `/login?next=...`; the login form validates the fresh access token and returns to a safe internal `next` destination.

## Alternatives considered

### Permanent employee status lock

Rejected because a password-guessing lock must clear without an administrator action. The existing `LOCKED` status remains available for an administrator-controlled permanent block.

### Rely on frontend token parsing for authorization

Rejected because browser code can be bypassed. The backend remains the authority through JWT lifetime, JTI, and employee-state validation; frontend checks only avoid presenting protected screens briefly.

### Preserve ASP.NET Core's default five-minute clock skew

Rejected because it contradicts a 15-minute session timeout and makes expiry behavior ambiguous to users and tests.

## Consequences

- Apply migration `20261025000000_AddEmployeeLoginLockout` after the earlier password-reset migration.
- Deployments may tune policy without code changes using `AuthSecurity__*` environment variables. Secrets remain in the secret manager, not this configuration section.
- The frontend session is intentionally in memory rather than persistent browser storage. A browser refresh requires login again until the backend provides an HTTP-only-cookie session/refresh flow.

## Affected artifacts

- `app/backend/src/Services/{AuthService,AuthSecuritySettings,TokenService}.cs`
- `app/backend/src/Data/Migrations/20261025000000_AddEmployeeLoginLockout.cs`
- `app/backend/Program.cs`
- `app/frontend/src/{App.tsx,auth/session.js}`
