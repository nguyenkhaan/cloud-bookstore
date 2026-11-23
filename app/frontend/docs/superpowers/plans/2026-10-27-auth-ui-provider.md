# Auth UI and Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current auth layouts while standardizing their controls, removing `auth.css`, and delivering a localStorage-backed provider wired through TanStack Query hooks for manual testing.

**Architecture:** Shared primitives own generic control styling and compose overrides with `cn()`, while auth components retain only domain-specific composition. `AuthProvider.ts` defines the context contract, `auth-provider.tsx` owns session lifecycle, and focused auth utility modules replace deleted `src/tmp` dependencies. The API client remains unchanged; the auth service owns the temporary Bearer token bridge.

**Tech Stack:** React 19, TypeScript 6, React Router 7, TanStack Query 5, Tailwind CSS 4, Axios, Node test runner

**Spec:** `docs/superpowers/specs/2026-10-27-auth-ui-provider-design.md`

## Global Constraints

- Keep the existing split login layout, centered activation flow, bookstore identity, copy, and responsive behavior.
- Keep changes minimal; add no dependency and do not modify `src/api/client.ts`.
- Use shared `Button`, `Card`, `Badge`, and `TextField` where their semantics fit.
- Use `cn()` for conditional/override classes and delete `src/features/auth/auth.css` only after all `cb-*` usage is removed.
- Store `{ accessToken, refreshToken }` temporarily under `cloud-bookstore.auth.session`; localStorage is testing-only and will later be replaced by cookies.
- Hydrate from a structurally valid, unexpired access token without calling admin-only `/auth/session`.
- Clear local state/storage at expiry or logout and preserve the current destination when redirecting to login.

## Review Focus

- Malformed localStorage JSON or missing token fields must be removed without crashing startup; covered in Task 1 storage tests.
- Expired tokens at startup and while open must clear the session and preserve the destination; covered in Task 1 utility tests and Task 2 provider lifecycle verification.
- Failed logout must never restore local credentials; covered in Task 2 service/provider tests.
- Repeated submit/resend actions must remain disabled while their mutation is pending; covered by Task 4 manual interaction checks.
- Mobile widths must not overflow and keyboard focus must remain visible after the CSS migration; covered by Task 4 rendered review.

---

### Task 1: Restore auth utilities and add session storage boundary

**Files:**
- Create: `src/features/auth/activation.ts`
- Create: `src/features/auth/password.ts`
- Create: `src/features/auth/session.ts`
- Create: `src/features/auth/auth.storage.ts`
- Modify: `tests/activation.test.mjs`
- Modify: `tests/password.test.mjs`
- Modify: `tests/auth-session.test.mjs`
- Create: `tests/auth-storage.test.mjs`

**Interfaces:**
- Produces: `extractActivationToken(value?: string): string | null`
- Produces: `PASSWORD_MAX_LENGTH`, `getPasswordChecks(password: unknown)`, `isPasswordAcceptable(password: unknown): boolean`
- Produces: `getAccessTokenExpiration(token?: string): number | null`, `isAccessTokenUsable(token?: string): boolean`, `getSafeNextPath(value: string | null): string`
- Produces: `AUTH_STORAGE_KEY`, `readStoredSession(storage: StorageLike): AuthSession | null`, `writeStoredSession(storage, session): void`, `clearStoredSession(storage): void`

- [ ] **Step 1: Point existing utility tests at the new feature paths and add storage tests**

Add tests for valid JSON hydration, malformed JSON cleanup, missing token cleanup, atomic write of both tokens, and explicit removal.

- [ ] **Step 2: Run utility tests to verify they fail**

Run: `node --test tests/activation.test.mjs tests/password.test.mjs tests/auth-session.test.mjs tests/auth-storage.test.mjs`
Expected: FAIL because the feature utility/storage modules do not exist.

- [ ] **Step 3: Implement the four focused modules**

Use the existing tested behavior for activation, password, and JWT helpers. Keep storage parsing defensive and browser-independent through a minimal `StorageLike` interface.

- [ ] **Step 4: Run utility tests to verify they pass**

Run: `node --test tests/activation.test.mjs tests/password.test.mjs tests/auth-session.test.mjs tests/auth-storage.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/activation.ts src/features/auth/password.ts src/features/auth/session.ts src/features/auth/auth.storage.ts tests/activation.test.mjs tests/password.test.mjs tests/auth-session.test.mjs tests/auth-storage.test.mjs
git commit -m "refactor(auth): restore feature auth utilities"
```

### Task 2: Build the localStorage-backed auth provider

**Files:**
- Create: `src/context/AuthProvider.ts`
- Create: `src/context/auth-provider.tsx`
- Modify: `src/features/auth/auth.service.ts`
- Modify: `src/features/auth/auth.hook.ts`
- Modify: `src/App.tsx`
- Modify: `src/routes/AppRoutes.tsx`
- Modify: `src/features/auth/pages/LoginPage.tsx`
- Modify: `src/features/auth/pages/ActivateAccountPage.tsx`
- Modify: `src/features/auth/pages/StepDone.tsx`
- Modify: `tests/auth-api.test.mjs`
- Modify: `tests/feature-structure.test.mjs`

**Interfaces:**
- Consumes: Task 1 session and storage helpers.
- Produces: `AuthSession`, `AuthContextValue`, and `AuthContext` from `AuthProvider.ts`.
- Produces: `AuthProvider({ children }: PropsWithChildren)` from `auth-provider.tsx`.
- Produces: `setAccessToken(token: string | null): void` from `auth.service.ts`.
- Keeps: `useAuth`, `useLoginMutation`, `useRegisterMutation`, `useVerifyMutation`, and `useLogoutMutation` in `auth.hook.ts`.

- [ ] **Step 1: Extend service/structure tests**

Add assertions that a restored access token is sent on the next private request, clearing removes the header, and the two requested provider files exist outside `src/tmp`.

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `node --test tests/auth-api.test.mjs tests/feature-structure.test.mjs`
Expected: FAIL because `setAccessToken` and the provider files are missing.

- [ ] **Step 3: Implement context, provider, service bridge, and routing ownership**

Use storage key `cloud-bookstore.auth.session`. Login calls `useLoginMutation().mutateAsync`, persists both tokens, and updates context. Logout clears state/storage/service token immediately, navigates to login, then calls `useLogoutMutation` best-effort. Move `BrowserRouter` above `AuthProvider`; remove router ownership from `AppRoutes`.

- [ ] **Step 4: Replace deleted tmp imports and direct service calls**

Point hooks/pages/routes at Task 1 utilities and the new context. Use React Router navigation. Convert registration and verification calls to their mutation hooks while preserving current notices and step transitions.

- [ ] **Step 5: Run targeted tests and TypeScript build**

Run: `node --test tests/auth-api.test.mjs tests/feature-structure.test.mjs && npm run build`
Expected: PASS with no `src/tmp` module resolution errors.

- [ ] **Step 6: Commit**

```bash
git add src/context src/features/auth src/App.tsx src/routes/AppRoutes.tsx tests/auth-api.test.mjs tests/feature-structure.test.mjs
git commit -m "feat(auth): add persistent auth provider"
```

### Task 3: Standardize shared auth primitives with `cn()`

**Files:**
- Modify: `src/components/common/Button/Button.tsx`
- Modify: `src/components/common/Card/Card.tsx`
- Modify: `src/components/common/Badge/Badge.tsx`
- Modify: `src/components/common/TextField/TextField.tsx`

**Interfaces:**
- Consumes: `cn(...inputs: ClassValue[]): string` from `src/lib/cn.ts`.
- Produces: the same public component APIs, with `className` merged predictably after variant/base classes.

- [ ] **Step 1: Add a focused `cn` regression test for conflicting Tailwind classes**

Verify a consumer class such as `px-6` replaces a primitive default such as `px-3.5`, while conditional false values are removed.

- [ ] **Step 2: Run the regression test to verify its intended boundary**

Run: `node --test tests/cn.test.mjs`
Expected: PASS for `cn`; this characterizes the merge behavior the component refactor relies on.

- [ ] **Step 3: Replace string concatenation with `cn()` in the four shared primitives**

Keep variants, sizes, refs, ARIA behavior, loading behavior, and existing exports unchanged.

- [ ] **Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/common tests/cn.test.mjs
git commit -m "refactor(ui): merge shared component classes with cn"
```

### Task 4: Migrate auth UI to shared primitives and Tailwind utilities

**Files:**
- Modify: `src/features/auth/pages/*.tsx`
- Modify: `src/features/auth/components/*.tsx`
- Modify: `src/App.tsx`
- Delete: `src/features/auth/auth.css`
- Modify: `tests/feature-structure.test.mjs`

**Interfaces:**
- Consumes: Tasks 2 and 3 provider/hooks/shared primitives.
- Produces: the same `/login`, `/activate`, `/verify-email`, and `/dashboard` user flows without an auth-specific stylesheet.

- [ ] **Step 1: Add the structural removal check**

Assert `auth.css` is absent and the application no longer imports it. Keep behavioral UI verification in rendered/manual checks rather than asserting utility-class source text.

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/feature-structure.test.mjs`
Expected: FAIL while `auth.css` exists.

- [ ] **Step 3: Convert auth composition with minimal visual change**

Use shared `Card`, `Button`, `Badge`, and `TextField`; retain auth-only layout/feedback/password/stepper/hero components. Translate every `cb-*` rule to Tailwind utilities through static classes or `cn()`, retaining the indigo/cream palette, desktop split, mobile single column, focus-visible rings, reduced motion, loading labels, and alert/status roles.

- [ ] **Step 4: Remove `auth.css` and its import**

Delete only after `rg -n "cb-" src/features/auth src/App.tsx` returns no matches.

- [ ] **Step 5: Run automated verification**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass, lint is clean, and the production bundle builds.

- [ ] **Step 6: Run the manual-test smoke flow**

At desktop and mobile widths verify: login success/error, reload persistence, protected-route redirect, logout cleanup, registration steps, resend pending state, verification link/manual paste, keyboard focus, and no horizontal overflow.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth src/components src/App.tsx tests
git commit -m "refactor(auth): unify auth UI with shared components"
```
