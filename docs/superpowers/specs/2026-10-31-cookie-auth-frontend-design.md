# Cookie Authentication Frontend Design

## Intent

Align frontend session handling with the backend's HTTP-only access and refresh cookies while keeping the current login UI unchanged.

## Goals

- Treat `accessToken` and `refreshToken` returned by the temporary backend test response as untrusted, ignored fields.
- Keep only `csrfToken` in frontend state and browser `sessionStorage`.
- Restore a browser session through `/auth/session`; retry through `/auth/refresh` only when a stored CSRF token is available.
- Preserve the existing post-login navigation to `/dashboard` when no safe `next` path is supplied.
- Remove React `StrictMode` so development does not deliberately repeat authentication effects.

## Non-goals

- Do not change backend endpoints, cookie attributes, response DTOs, or UI markup/copy.
- Do not change activation, registration, or password-reset flows.
- Do not persist access or refresh JWTs in JavaScript storage.

## Approach

Use `sessionStorage` only for the CSRF token. The API client sends it on unsafe methods, restores it at browser startup, and clears it after logout or a failed refresh. The private-client interceptor skips refresh when no CSRF token exists; this leaves unauthenticated visitors on the login page without a needless refresh request. A single-flight session check prevents concurrent `/auth/session` calls from issuing competing CSRF tokens.

The existing login page already routes successful authentication to `getSafeNextPath(...)`, whose default is `/dashboard`; retain that behavior without UI edits.

