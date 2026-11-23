# Auth UI and Provider Design

## Intent

Polish the existing authentication experience without changing its visual identity or core page structure. Standardize controls through the shared component library, remove the legacy `cb-*` stylesheet, and connect the auth screens to the TanStack Query hooks through a real provider. Persist backend tokens in `localStorage` only as a temporary testing mechanism.

## Goals

- Preserve the current split login layout, centered activation flow, bookstore identity, copy, and responsive behavior.
- Replace matching auth controls with shared `Button`, `Card`, `Badge`, and `TextField` components.
- Use `cn()` for conditional classes and consumer overrides in shared and auth-specific components.
- Express all auth styling with Tailwind utilities, then remove `src/features/auth/auth.css` and its import.
- Add `src/context/AuthProvider.ts` for the context contract and `src/context/auth-provider.tsx` for the provider component.
- Route login, registration, verification, and logout through functions exposed by `auth.hook.ts`.
- Restore a valid session from `localStorage`, persist both tokens after login, and clear both on logout or invalid/expired session.
- Keep authenticated API requests sending the temporary access token as a Bearer header.

## Non-goals

- Do not migrate authentication to cookies in this change.
- Do not add refresh-token rotation or automatic refresh because the backend exposes no refresh endpoint.
- Do not add new forgot/reset-password pages or redesign the dashboard.
- Do not change `src/api/client.ts` or add dependencies.
- Do not replace distinctive auth-only pieces such as `PasswordField`, `Stepper`, or `HeroArt` with generic primitives.

## Selected Approach

Use a hybrid component approach with Tailwind-only styling:

- Shared primitives provide the common interaction and visual language.
- Auth-specific composition remains in the auth module.
- Existing layouts and visual hierarchy stay recognizable.
- `auth.css` is removed only after every `cb-*` class has been migrated.

This was selected over a full visual redesign because the current information architecture is already sound. A CSS-only touch-up was rejected because it would retain duplicated controls and prevent removing `auth.css`.

## UI Design

### Shared primitives

- Update shared `Button`, `Card`, `Badge`, and `TextField` to compose their variants and consumer `className` through `cn()`.
- Preserve their current public APIs unless a small additive prop is required for auth accessibility or layout.
- Use shared `Button` for all primary, secondary, link-like, resend, and back actions.
- Use shared `Card` as the login and activation content surface.
- Use shared `Badge` for the welcome label and server status.
- Continue using shared `TextField` for normal inputs; keep `PasswordField` for visibility and Caps Lock behavior.

### Auth-specific components

- Keep `SplitLayout`, `CenterLayout`, `Brand`, `Banner`, `PasswordField`, `PasswordRules`, `Stepper`, `HeroArt`, and the server-status adapter where they encode auth-specific composition or behavior.
- Reuse shared icons where an equivalent exists; retain auth icons only where no shared semantic equivalent is available.
- Replace template-string class assembly with `cn()`.
- Maintain visible labels, `aria-invalid`, status/alert roles, keyboard focus rings, 44px primary targets, loading states, disabled states, and reduced-motion behavior.

### Responsive behavior

- Mobile remains the default single-column experience.
- The illustrated bookstore panel appears at desktop width.
- Auth cards stay within the viewport with compact padding on small screens.
- Step labels may compress but must not overflow horizontally.

## Auth State and API Flow

### Context files

- `AuthProvider.ts` exports `AuthContext`, `AuthSession`, and `AuthContextValue`.
- `auth-provider.tsx` exports the `AuthProvider` component.
- `useAuth()` remains in `auth.hook.ts` and reads the new context.

### Storage

- Store one JSON object containing `accessToken` and `refreshToken` under a namespaced localStorage key so the pair is updated atomically.
- Parse stored data defensively and validate both token fields.
- Reject expired or malformed access tokens during hydration and remove the stored value.
- Treat localStorage as a temporary testing shortcut with known XSS exposure; cookie migration remains future work.
- Hydration trusts a structurally valid, unexpired access token without calling `/auth/session`; that endpoint is admin-only and must not invalidate a cashier session.
- While the app is open, schedule cleanup at access-token expiry, remove local session data, and redirect to login while preserving the current destination.

### Login

1. `AuthProvider.login(email, password)` calls `useLoginMutation().mutateAsync`.
2. On success, validate the access token, store both tokens, update context state, and make the service aware of the restored access token.
3. Login pages keep their current navigation and error messaging behavior.

### Logout

1. Clear React state, localStorage, and the in-memory Bearer token immediately.
2. Navigate away from the protected screen.
3. Use `useLogoutMutation` to revoke the refresh token as a best-effort request.

### Registration and verification

- `ActivateAccountPage` uses `useRegisterMutation` and `useVerifyMutation` instead of importing service functions directly.
- Existing resend countdown, activation-link parsing, step transitions, inline notices, and optional automatic login remain unchanged.

### Routing

- Place `BrowserRouter` above `AuthProvider` so the provider can use React Router navigation safely.
- Keep protected-route behavior and preservation of the requested destination.
- Move the pure password, activation-token, and session helpers out of the deleted `src/tmp` area into the auth feature.

## Error and Loading Behavior

- Preserve the current `ApiError` mappings for login, registration, and verification.
- Mutation pending state disables the relevant action and shows a clear loading label/spinner.
- Failed login clears only the password field.
- Failed registration returns to the information step only for the existing 400/409 cases.
- A failed logout never restores local session data.

## Verification

- Add failing tests first for session hydration, invalid/expired storage cleanup, login persistence, logout cleanup, and provider/module structure.
- Keep the auth service boundary tests.
- Run scoped tests, lint, TypeScript build, and the full frontend suite; report unrelated baseline failures explicitly.
- Render and inspect login and activation flows at desktop and mobile widths, checking focus, overflow, loading/error states, and visual consistency.

## Builder Decisions

- Exact Tailwind utility grouping and whether small repeated class sets stay inline or become local constants.
- Which existing shared icon is close enough to replace an auth-only icon without changing meaning.
- Minor spacing adjustments needed after rendered desktop/mobile review.
