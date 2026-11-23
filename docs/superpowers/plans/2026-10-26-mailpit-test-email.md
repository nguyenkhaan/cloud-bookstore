# Mailpit Test Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a real HTML test email through the configured Mailpit SMTP endpoint via `POST /health/email` while removing obsolete email interfaces and health-check classes.

**Architecture:** A concrete `EmailService` owns template rendering and SMTP delivery. Authentication and health flows inject it directly; HTML files are copied from `src/Templates` into build output.

**Tech Stack:** .NET 10, ASP.NET Core, MailKit, xUnit

**Spec:** `docs/superpowers/specs/2026-10-26-mailpit-test-email-design.md`

## Global Constraints

- Add no package dependency.
- Preserve registration and password-reset email behavior.
- Unit tests must not contact SMTP.
- Delete obsolete interface, health-check, and hard-coded template files.

## Review Focus

- HTML placeholder values must be encoded before insertion.
- Template files must exist in backend and test output directories.
- Invalid recipient input must be rejected by ASP.NET model validation.
- SMTP failures from the test endpoint must return 503 without exposing credentials.
- Existing authentication email tests must remain isolated from SMTP.

---

### Task 1: Make EmailService concrete and file-template based

**Files:**
- Modify: `app/backend/src/Infrastructure/EmailService.cs`
- Modify: `app/backend/src/Services/AuthService.cs`
- Modify: `app/backend/Program.cs`
- Modify: `app/backend/backend.csproj`
- Create: `app/backend/src/Templates/AccountVerification.html`
- Create: `app/backend/src/Templates/PasswordReset.html`
- Create: `app/backend/src/Templates/TestEmail.html`
- Modify: `app/backend.Tests/Services/AuthServiceTests.cs`
- Modify: `app/backend.Tests/Services/EmailTemplatesTests.cs`
- Delete: `app/backend/src/Services/IEmailService.cs`
- Delete: `app/backend/src/Infrastructure/EmailTemplates.cs`

**Interfaces:**
- Produces: concrete virtual `SendAccountVerificationEmailAsync`, `SendPasswordResetEmailAsync`, and `SendTestEmailAsync` methods on `EmailService`.

- [ ] Update tests to consume/override concrete `EmailService`; add template rendering assertions.
- [ ] Run targeted tests and verify compile/test failure before production changes.
- [ ] Implement file template loading, safe placeholder replacement, and concrete DI.
- [ ] Run targeted tests and verify they pass.

### Task 2: Send a test message from POST /health/email

**Files:**
- Modify: `app/backend/src/Controllers/HealthController.cs`
- Modify: `app/backend.Tests/Controllers/HealthControllerTests.cs`
- Modify: `app/backend/Program.cs`
- Delete: `app/backend/src/Services/IEmailHealthCheck.cs`
- Delete: `app/backend/src/Infrastructure/EmailHealthCheck.cs`

**Interfaces:**
- Consumes: `EmailService.SendTestEmailAsync(string, CancellationToken)`.
- Produces: `POST /health/email`, request `{ recipientEmail }`, response status `Sent` or `Unavailable`.

- [ ] Rewrite controller tests for successful delivery, SMTP failure, route, verb, and recipient forwarding.
- [ ] Run controller tests and verify failure before production changes.
- [ ] Inject `EmailService`, implement POST action, map SMTP failure to 503, and remove obsolete health-check DI/files.
- [ ] Run all backend tests and backend build; expect zero failures, warnings, and errors.
