# Register Verification Design

## Intent

Replace the legacy multi-step account-activation UI with a link-driven verification page that matches the existing auth theme and gives an unverified employee a real way to request a replacement email.

## Goals

- Serve `/verify-register?token=<JWT>` from the email link and call `POST /api/auth/verify` automatically once.
- Render loading, verified, and failed states with Lucide icons, accessible status text, and the existing `CenterLayout`, `Card`, and button styles.
- On verification success, show a green check, a toast, and a Login button.
- On verification failure, accept an email address and call `POST /api/auth/verification-resends` with `{ email }`; show feedback through a reusable React Toastify wrapper.
- Return `204 No Content` from resend for unknown, active, or non-pending accounts to avoid account enumeration.
- Remove the old frontend activation flow and its routes; do not change password-reset behavior.

## Non-goals

- Do not alter the visual design system or add a new registration workflow.
- Do not expose verify-token validity through the resend response.
- Do not modify cookie authentication.

## Backend contract

`POST /api/auth/verification-resends`

```json
{ "email": "employee@example.com" }
```

The service sends a replacement link only when the employee exists and is `PENDING_OTP`; all normal request outcomes return `204`. The email link is produced only by `EmailService` from `Email:FrontendBaseUrl` and `Email:VerifyEmailPath`, configured as `/verify-register`.

## Frontend flow

`VerifyRegisterPage` extracts the query token, invokes the existing verify mutation in an effect, and removes the token from the visible URL. It uses `LoaderCircle`, `CircleCheck`, and `CircleX` from `lucide-react`. A root `AppToast` component hosts Toastify while a small exported notifier provides consistent success/error calls. The failure state owns the email field and Resend action.

## Constraints

- `lucide-react` and `react-toastify` are already installed by the user.
- Use the generated OpenAPI contract after adding the backend operation.
- No custom SVG icon components in the new verification UI.
