# Email authentication in development

## Start Mailpit

From the repository root:

```powershell
docker compose up -d mailpit
```

Open `http://localhost:8025` to view the local inbox. The backend development configuration sends SMTP to `localhost:1025`.

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
```

Do not commit SMTP credentials or JWT secrets. A backend running in a Docker network with Mailpit should use `Email__SmtpHost=mailpit` instead of `localhost`.

## API contract

| Endpoint | Request | Success | Notes |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `email`, `fullName`, `password`, `phone` | `201` with `email`, `fullName` | Sends verification email. It no longer returns a token. |
| `POST /api/auth/verify` | `token` | `204` | Activates a pending account. |
| `POST /api/auth/password-reset-requests` | `email` | `204` | Always returns `204`; sends a reset email only for an active account. |
| `POST /api/auth/password-resets` | `token`, `newPassword` | `204` | `newPassword` must contain 12–128 characters. A reset link expires after 15 minutes and can only be used once. |

The frontend routes are intentionally not part of this change. It must read `token` from the link query string and call the matching API endpoint.
