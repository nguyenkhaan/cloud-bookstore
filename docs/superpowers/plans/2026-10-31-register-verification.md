# Register Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a link-driven account-verification page and a privacy-preserving email-resend endpoint.

**Architecture:** The backend owns eligibility and email delivery for resend requests. The frontend consumes the generated endpoint through the auth service and renders a single stateful verification page, while a root Toastify wrapper exposes consistent notifications. The legacy activation wizard and its routes are deleted.

**Tech Stack:** ASP.NET Core 10, React 19, TanStack Query, Axios, Tailwind, lucide-react, react-toastify.

**Spec:** `docs/superpowers/specs/2026-10-31-register-verification-design.md`

## Global Constraints

- Reuse the existing auth theme, `CenterLayout`, shared components, and no custom SVG icons on the new page.
- Do not change cookie-authentication or password-reset behavior.
- Resend always returns 204 for account-state misses.
- Retain user-installed dependency and generated-contract changes.

## Review Focus

- A missing/malformed token must not trigger a verify request.
- A verification effect must run only once per token and not leave the token in the visible URL.
- The resend response must not disclose whether the email exists or is active.
- A link generated after resend must use `/verify-register`, not a double-wrapped URL.
- The legacy `/activate` and `/verify-email` routes must no longer expose the removed wizard.

---

### Task 1: Resend verification backend contract

**Files:**
- Create: `app/backend/src/Dto/AuthDto/ResendVerificationRequest.cs`
- Modify: `app/backend/src/Controllers/AuthController.cs`
- Modify: `app/backend/src/Services/AuthService.cs`
- Modify: `app/backend/src/Configurations/EmailSettings.cs`
- Modify: `app/backend/appsettings.Development.json`
- Modify: `app/backend/appsettings.example.json`

**Interfaces:**
- Produces: `POST /api/auth/verification-resends` accepting `{ email: string }` and returning 204.
- Consumes: `EmailService.SendAccountVerificationEmailAsync(email, fullName, token)` and `EmployeeStatus.PENDING_OTP`.

**Acceptance Criteria:**
- Only pending employees receive a replacement token/email.
- The endpoint returns 204 for unknown and already-active emails.
- Registration and resend links use `/verify-register?token=...` exactly once.

- [ ] **Step 1: Write a failing backend request/response test or minimal reproducible check** for the missing resend route and expected 204 contract.
- [ ] **Step 2: Run the focused check** and confirm the route is unavailable before implementation.
- [ ] **Step 3: Implement** `ResendVerificationRequest`, `AuthService.ResendVerificationAsync(string email)`, and the controller action; restore email-link creation to the centralized `EmailService` path configuration.
- [ ] **Step 4: Regenerate** `app/frontend/src/contract/api-contract.ts` from the running backend and inspect the new endpoint type.
- [ ] **Step 5: Run** `dotnet build app/backend/backend.csproj` and the focused HTTP check.

### Task 2: Shared toast and verification page

**Files:**
- Create: `app/frontend/src/components/common/AppToast.tsx`
- Create: `app/frontend/src/features/auth/pages/VerifyRegisterPage.tsx`
- Modify: `app/frontend/src/components/common/index.ts`
- Modify: `app/frontend/src/main.tsx`
- Modify: `app/frontend/src/features/auth/auth.type.ts`
- Modify: `app/frontend/src/features/auth/auth.service.ts`
- Modify: `app/frontend/src/features/auth/auth.hook.ts`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/src/features/auth/pages/LoginPage.tsx`
- Delete: legacy `ActivateAccountPage.tsx`, `StepInfo.tsx`, `StepPassword.tsx`, `StepActivate.tsx`, `StepDone.tsx`, and activation-token helper if no caller remains.
- Test: `app/frontend/tests/auth-api.test.mjs`, `app/frontend/tests/activation.test.mjs`, `app/frontend/tests/feature-structure.test.mjs`

**Interfaces:**
- Consumes: `resendVerification({ email })` from the auth service and the generated request DTO.
- Produces: `/verify-register` route with loading, success, and error/resend states.

**Acceptance Criteria:**
- Valid query token triggers one verify request and reports success or failure through the UI/toast helper.
- Failure state can request resend; success goes to `/login?activated=1`.
- Login does not link to the deleted activation wizard.

- [ ] **Step 1: Write failing frontend tests** for resend API shape, verify-route presence, legacy-route removal, and token extraction behavior.
- [ ] **Step 2: Run** `bun run test -- tests/auth-api.test.mjs tests/activation.test.mjs tests/feature-structure.test.mjs` and confirm the new assertions fail.
- [ ] **Step 3: Implement** the generated-contract service/hook, toast wrapper, Lucide-state page, and route replacement; delete only unreachable legacy activation modules.
- [ ] **Step 4: Run** the focused frontend tests and inspect desktop/mobile rendering for loading, success, error, focus, and disabled-button states.

### Task 3: Integrated verification

**Files:**
- Test: `app/frontend/tests/auth-session.test.mjs`

**Interfaces:**
- Consumes: backend-generated contract and new `/verify-register` page.

**Acceptance Criteria:**
- Full frontend suite, lint, and production build pass after the generated contract changes.

- [ ] **Step 1: Run** `bun run test`, `bun run lint`, and `bun run build` from `app/frontend`.
- [ ] **Step 2: Run** `git diff --check` and inspect only the task-related diff.
