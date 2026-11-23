# Cookie Authentication Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend authentication use HTTP-only cookies plus a session-scoped CSRF token without changing the interface.

**Architecture:** `api/client.ts` owns persisted CSRF state and decides whether a 401 can be refreshed. `auth.service.ts` validates and consumes only the CSRF response field and coalesces concurrent session checks. `AuthProvider` continues to hydrate the session; `StrictMode` is removed at the app root.

**Tech Stack:** React 19, Axios, Vite, Node test runner, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-31-cookie-auth-frontend-design.md`

## Global Constraints

- Do not store or use access/refresh JWT response fields.
- Keep the UI and activation/reset flows unchanged.
- Keep existing user changes to `package.json` and generated API contract intact.
- No new dependency.

## Review Focus

- Reload with an expired access cookie must refresh only if a valid session-scoped CSRF token is available.
- A visitor without cookies or CSRF state must not issue `/auth/refresh` from the login route.
- Failed refresh clears persisted CSRF and leaves the user unauthenticated.
- Simultaneous session hydration must not issue competing CSRF tokens.
- Successful login retains the safe default route `/dashboard`.

---

### Task 1: Cookie-session API behavior

**Files:**
- Modify: `app/frontend/src/api/client.ts`
- Modify: `app/frontend/src/features/auth/auth.service.ts`
- Test: `app/frontend/tests/auth-api.test.mjs`

**Interfaces:**
- Produces: CSRF persistence APIs and one in-flight `getSession()` request shared by concurrent callers.
- Consumes: `BrowserSessionResponse.csrfToken` from the generated contract.

**Acceptance Criteria:**
- JWT response fields are ignored.
- 401 requests refresh once only when a CSRF token exists.
- Concurrent session reads share one request.

- [x] **Step 1: Add failing tests** for skipping refresh without CSRF and coalescing concurrent session checks.
- [x] **Step 2: Run** `bun run test -- tests/auth-api.test.mjs` and confirm the new assertions fail.
- [x] **Step 3: Implement** session-scoped CSRF persistence, guarded refresh, and single-flight session reads.
- [x] **Step 4: Run** `bun run test -- tests/auth-api.test.mjs` and confirm it passes.

### Task 2: Root authentication lifecycle

**Files:**
- Modify: `app/frontend/src/main.tsx`
- Test: `app/frontend/tests/auth-session.test.mjs`

**Interfaces:**
- Consumes: existing AuthProvider hydration and LoginPage safe redirect behavior.

**Acceptance Criteria:**
- Root render does not wrap the application in `StrictMode`.
- Successful login retains `/dashboard` as its fallback destination.

- [x] **Step 1: Add a failing test** asserting no StrictMode root wrapper while preserving the `/dashboard` fallback helper.
- [x] **Step 2: Run** `bun run test -- tests/auth-session.test.mjs` and confirm it fails.
- [x] **Step 3: Remove** the `StrictMode` wrapper only.
- [x] **Step 4: Run** `bun run test -- tests/auth-session.test.mjs` and confirm it passes.
