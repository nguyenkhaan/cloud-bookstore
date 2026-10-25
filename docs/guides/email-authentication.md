# Email authentication in development

## Start Mailpit

From the repository root:

```powershell
docker compose up -d mailpit
```

Open `http://localhost:8025` to view the local inbox. The backend development configuration sends SMTP to `localhost:1025`.
Mailpit stores its local data in the named `mailpit-data` Docker volume.

Mailpit is a development-only SMTP sink. It displays messages addressed to the email entered by the user but does not deliver them to an external inbox.

## Required configuration

`appsettings.Development.json` provides safe local Mailpit defaults. Configure these values through environment variables outside development:

```text
Email__SmtpHost=smtp.example.com
Email__SmtpPort=587
Email__UseStartTls=true
Email__SmtpUsername=...
Email__SmtpPassword=...
Email__FrontendBaseUrl=https://app.example.com
Email__VerifyEmailPath=/verify-email
Email__ResetPasswordPath=/reset-password
Jwt__ResetPasswordSecret__Key=...
AuthSecurity__MaxFailedLoginAttempts=5
AuthSecurity__LockoutDurationMinutes=15
AuthSecurity__AccessTokenLifetimeMinutes=15
AuthSecurity__RefreshTokenLifetimeMinutes=10080
AuthSecurity__VerificationTokenLifetimeMinutes=1024
AuthSecurity__ResetPasswordTokenLifetimeMinutes=15
```

Do not commit SMTP credentials or JWT secrets. A backend running in a Docker network with Mailpit should use `Email__SmtpHost=mailpit` instead of `localhost`.

## API contract

| Endpoint | Request | Success | Notes |
| --- | --- | --- | --- |
| `GET /health/email` | None | `200` with `status: "Healthy"` | Opens an SMTP connection only; returns `503` with `status: "Unhealthy"` when the configured SMTP server cannot be reached. It does not send an email. |
| `POST /api/auth/register` | `email`, `fullName`, `password`, `phone` | `201` with `email`, `fullName` | Sends verification email. It no longer returns a token. |
| `POST /api/auth/verify` | `token` | `204` | Activates a pending account. |
| `POST /api/auth/password-reset-requests` | `email` | `204` | Always returns `204`; sends a reset email only for an active account. |
| `POST /api/auth/password-resets` | `token`, `newPassword` | `204` | `newPassword` must contain 12–128 characters. A reset link expires after 15 minutes and can only be used once. |

| `POST /api/auth/login` | `email`, `password` | `200` with access and refresh tokens | After 5 failed attempts by default, the account is temporarily locked for 15 minutes. Both values are configurable through `AuthSecurity`. |
| `GET /api/auth/session` | Bearer access token | `204` | Confirms that the access token is unexpired, unrevoked, and belongs to an active, non-locked account. |

The frontend reads `token` from the email-link query string. Public `/` and `/catalog` routes remain accessible without login; protected staff and action routes redirect to `/login?next=...` when the access token is absent or expired.
