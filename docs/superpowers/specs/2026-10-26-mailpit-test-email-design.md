# Mailpit Test Email Design

## Intent

Replace the email interfaces and connection-only health check with one concrete `EmailService` that sends authentication and test messages through the configured SMTP server. Store email HTML outside C# under `src/Templates`.

## Selected approach

- Inject concrete `EmailService` into `AuthService` and `HealthController`.
- Expose `POST /health/email` with JSON body `{ "recipientEmail": "..." }`; sending mail remains a side effect and therefore is not a GET operation.
- Add `SendTestEmailAsync`, retain the existing verification/reset methods, and use MailKit for SMTP delivery.
- Load dependency-free `.html` templates from `src/Templates`, replace HTML-encoded placeholders, and copy the templates to build/publish output.
- Delete `IEmailHealthCheck`, `IEmailService`, `EmailHealthCheck`, and the hard-coded `EmailTemplates` class after all consumers move.

## Alternatives considered

- Keep GET and a configured recipient: rejected because health polling could generate email repeatedly.
- Add a Razor/template package: rejected because three fixed templates need only safe placeholder replacement.
- Keep the interfaces: rejected by the requested simplification; concrete methods will be virtual only where existing unit tests require a test seam.

## Constraints

- No new package dependency.
- Preserve registration and password-reset email behavior.
- Reject invalid recipient addresses through API model validation.
- Do not contact a real SMTP server from unit tests.
