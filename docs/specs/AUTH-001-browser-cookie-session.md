# Spec: AUTH-001 — Phiên trình duyệt bằng cookie HttpOnly

## Status

Accepted

## Objective

Nhân viên đăng nhập trên frontend ở domain khác backend mà không để access hoặc refresh token lộ cho JavaScript. Người dùng giữ phiên liên tục khi access token hết hạn; phiên hết hạn hoặc refresh không hợp lệ phải quay về đăng nhập an toàn.

## References

- `ADR-003` — Xác thực trình duyệt bằng JWT trong cookie HttpOnly
- `OQ-002` — Resolved by `ADR-003`
- `AUTH-001`
- [`ADR-008`](../decisions/ADR-008-recoverable-session-outage-503.md) - Retryable infrastructure failures during session validation and refresh

## Tech Stack and Commands

- Backend: ASP.NET Core 10, JWT bearer, Redis JTI store, OpenAPI.
- Frontend: React 19, Axios, TanStack Query, Bun.
- Backend: `dotnet restore backend.sln`, `dotnet build backend.sln --no-restore`, `dotnet test backend.sln --no-build`.
- Frontend: `cd app/frontend && bun run test`, `bun run lint`, `bun run build`.
- Contract: run the backend with its HTTPS launch profile on port 7073, then `cd app/frontend && bun run generate:api`.

## Project Structure and Code Style

- Backend auth boundary stays in `src/Controllers`, `src/Services`, `src/Configurations`, and `src/Infrastructure`; request/response contracts stay in `src/Dto/AuthDto`.
- Frontend HTTP policy stays in `src/api`; auth session state, hooks and service stay under `src/features/auth`; cross-feature auth context stays in `src/context`.
- Generated `app/frontend/src/contract/api-contract.ts` is never manually edited.
- C# uses async controller/service methods and typed DTOs. TypeScript uses `@/` imports, typed service boundaries, and no auth token persistence.

## Actors and Permissions

- Anonymous staff member: login, register, verify account, password recovery.
- Authenticated staff member: access protected APIs according to existing role authorization.
- Browser frontend: sends credentials and CSRF header; never reads auth cookies or JWT values.
- Bearer-only non-browser caller: may use a valid `Authorization` header while the temporary fallback remains enabled.

## Preconditions

- Production frontend origins are supplied in configuration and served via HTTPS.
- JWT signing keys and Redis are configured; token JTI allowlisting remains available.
- Browser requests use the configured backend origin and have `withCredentials` enabled.

## Main Flows

### Login and bootstrap

1. FE posts credentials to `POST /api/auth/login` with credentials enabled.
2. BE validates credentials and account state, creates access/refresh JWTs, records JTI state, sets HttpOnly cookies, creates a CSRF session token, and returns only `{ csrfToken }`.
3. FE retains `csrfToken` in memory and marks the session authenticated; no token is written to localStorage/sessionStorage.
4. After page reload, FE calls `GET /api/auth/session`; BE authenticates from access cookie and returns a valid CSRF token for the active session.

### Protected request and refresh

1. FE sends cookies automatically and adds `X-CSRF-Token` on unsafe methods.
2. BE authenticates from access cookie first; if absent, it validates a bearer header.
3. A cookie-authenticated unsafe request must have a valid CSRF header bound to its session.
4. On one `401`, FE calls `POST /api/auth/refresh`, sends the current CSRF header and cookies, receives rotated cookies plus a replacement CSRF token, then retries the original request once.
5. If session validation or refresh returns a retryable `503`, FE keeps its in-memory session and CSRF token and does not redirect to login.
   Once the dependency recovers, the browser can use the original cookies and CSRF token to recover the session.
6. A second `401`, a terminal refresh failure (including `401` for an invalid session), or an invalid session clears in-memory auth state and redirects to login with a safe `next` path.

### Logout

1. FE posts `POST /api/auth/logout` with credentials and CSRF header; no refresh token is sent in JSON.
2. BE validates the access JWT, allowed `Origin`, and CSRF token.
   BE revokes the authenticated device session, expires both auth cookies, and returns `204` when revocation completes.
3. If token-state validation is unavailable, only explicit cookie-authenticated logout can continue after JWT signature and expiry checks, allowed `Origin`, and CSRF validation.
   If Redis cannot validate CSRF, BE verifies the token's HMAC against the authenticated access JTI instead.
   If PostgreSQL is reachable, BE revokes the session there before attempting Redis cleanup.
4. If revocation cannot be confirmed, BE still expires both auth cookies and returns `503` with `{ code: "LOGOUT_REVOCATION_INCOMPLETE", cookiesCleared: true, revocationCompleted: false, message }`.
   This exception does not apply to protected APIs or refresh, which fail closed during token-state outages without expiring cookies.
5. FE clears its session and CSRF state for every logout outcome.
   FE redirects to `/login` on success, `/login?logout=partial` when the cookies are cleared but revocation is unconfirmed, and `/login?logout=incomplete` when cookie removal cannot be confirmed.

## Contract and Data/State Changes

- `POST /api/auth/login`: request stays `{ email, password }`; response becomes `{ csrfToken }` and two `Set-Cookie` headers. It must never expose JWTs in JSON.
- `POST /api/auth/refresh`: new endpoint; response is `{ csrfToken }` plus rotated auth cookies.
- `GET /api/auth/session`: changes from `204` to `{ csrfToken }` when authenticated.
- `POST /api/auth/logout`: removes `LogoutRequest`; refresh token comes only from cookie.
  The degraded `503` response uses `LogoutIncompleteResponse` and expires both auth cookies.
- Auth cookies are `HttpOnly`; access cookie path is `/api`, refresh cookie path is `/api/auth`; expiry matches the JWT lifetime. Cookie names and production policy are configuration, not hard-coded deployment domains.
- `X-CSRF-Token` is returned only through CORS to allowed frontend origins and is stored server-side with bounded lifetime tied to the active session. It is not an authentication credential and must never be logged.
- CORS allows exact configured origins, `Content-Type`, `Accept`, `Authorization`, and `X-CSRF-Token`, and permits credentials. No wildcard origin is valid with credentials.
- OpenAPI documents cookie auth as the browser path and bearer auth as temporary fallback; generated FE contract follows regenerated OpenAPI.

## Alternate and Error Flows

- Invalid credentials, lockout, inactive account, expired/revoked JWT, and role changes retain existing status semantics.
- Missing or invalid CSRF token on a cookie-authenticated unsafe request returns `403` without changing state.
- If a cookie exists but is invalid, BE rejects it and does not fall back to an Authorization header; bearer fallback applies only when the access cookie is absent.
- A transient Redis or PostgreSQL failure during access-token validation returns `503` without clearing auth cookies, except for explicit logout meeting the requirements above.
- A transient Redis failure during refresh JTI or CSRF lookup or during session rotation writes returns `503` without clearing auth cookies.
  FE treats `503` as retryable without clearing session state, redirecting, or retrying refresh recursively.
- Refresh returns `401` and expires both auth cookies if the refresh cookie is missing, invalid, revoked, or expired, or the account is unavailable.
  Invalid refresh CSRF returns `403` without expiring auth cookies.
- Logout expires browser cookies after access JWT, Origin, and CSRF checks pass, even if the refresh token is invalid.
  The authenticated access JTI identifies the session when the refresh cookie cannot be used.
- Requests from origins outside the configured allowlist are not allowed CORS credentials and unsafe operations fail origin validation.

## Threat Model and Non-functional Requirements

- Assets: access JWT, refresh JWT, authenticated employee actions, role claims.
- Boundaries: browser-to-API cookies, CSRF header, bearer header, CORS origin, Redis token/session state.
- XSS: HttpOnly prevents direct JWT extraction; React escaping remains in effect.
- CSRF: synchronizer token plus strict Origin allowlist protect cookie-authenticated unsafe operations.
- Token theft/replay: secure HTTPS cookie transport, JTI allowlist, refresh rotation, and logout revocation limit reuse.
- Configuration: production requires `Secure` cookies and explicit origins; no secrets, JWTs, cookies, or CSRF values may appear in logs/tests.
- Availability: Redis/token-state failure fails closed for protected requests.

## Testing Strategy

- Backend unit/integration tests cover cookie issuance/expiry, cookie-before-bearer selection, bearer fallback only with no cookie, CSRF acceptance/rejection, refresh rotation, logout revocation, and CORS preflight/header policy.
- Frontend unit tests cover `withCredentials`, CSRF header attachment, one refresh/retry, refresh failure cleanup, and absence of localStorage auth persistence.
- Contract checks verify OpenAPI documents login/refresh/session/logout responses and cookie/bearer security behavior.
- Browser/manual check confirms `Set-Cookie` attributes, no auth values in localStorage, credentials requests, and no console/network errors across login, reload, refresh and logout.

## Boundaries

- Always: HTTPS in production, explicit CORS origins, HttpOnly auth cookies, CSRF validation, refresh rotation, tests before delivery, regenerated contract after API changes.
- Ask first: changing production origins, cookie domain/path/lifetime policy, JWT secrets, rate-limit policy, or retaining bearer fallback beyond the migration.
- Never: put auth tokens in browser storage or JSON responses, use CORS wildcard with credentials, log token/cookie/CSRF values, or hand-edit generated API contract.

## Acceptance Criteria

- Given a successful login, when FE receives the response, then browser receives two HttpOnly auth cookies and FE receives only a CSRF token.
- Given a page reload with valid cookies, when FE calls session, then protected routes remain available without any token in browser storage.
- Given an unsafe cookie-authenticated request without a valid CSRF header, when BE receives it, then it returns `403` and does not change data.
- Given a valid cookie session, when the access JWT expires, then FE performs at most one refresh and retries the failed request once with rotated cookies.
- Given a transient Redis or PostgreSQL outage during access-token validation, when a protected request cannot be authenticated, then BE returns `503` without expiring auth cookies.
- Given a transient Redis outage during refresh lookup or rotation, when refresh returns `503`, then BE does not expire either auth cookie and FE preserves the in-memory session and CSRF token without redirecting to login.
  The original cookies and CSRF token can be used to refresh after Redis recovers.
- Given a missing, invalid, expired, or revoked refresh cookie or an unavailable account, when refresh returns `401`, then BE expires both auth cookies and FE clears auth state and redirects to login.
- Given invalid CSRF on refresh, when BE rejects the request, then it returns `403` without expiring either auth cookie.
- Given no access cookie and a valid bearer header, when a protected endpoint is called, then BE authorizes it; given an access cookie, the cookie is used in preference to the header.
- Given logout, when BE completes or rejects token revocation, then browser auth cookies are expired and FE has no persisted credentials.
- Given a disallowed origin, when it attempts a credentialed request, then CORS does not grant it access.

## Open Questions

- P1: deployment must supply the exact production frontend origin list through configuration before release.
- P1: the date for removing bearer fallback is intentionally deferred; it must be decided before the fallback is removed.
