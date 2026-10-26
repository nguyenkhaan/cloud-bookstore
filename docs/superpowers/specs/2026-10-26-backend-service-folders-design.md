# Backend Service Folders Design

## Intent

Reduce unrelated files directly under `app/backend/src/Services` without changing backend behavior.

## Design

- Add `src/Configurations` for option/configuration models: `AuthSecuritySettings` and `EmailSettings`.
- Add `src/Infrastructure` for SMTP, Redis, token persistence, templates, and readiness checks.
- Keep application services and their abstractions in `src/Services`.
- Align namespaces with physical folders and update every production/test import.

## Constraints

- Add at most two folders directly under `src`.
- Preserve public types, method signatures, DI lifetimes, and runtime behavior.
- Add no dependency and perform no unrelated cleanup.

## Alternatives considered

- `Interfaces` + `Configurations`: smaller move, but leaves most infrastructure mixed into `Services`.
- `Email` + `Redis`: groups by technology but gives application services direct technology-oriented structure.
- Selected: `Configurations` + `Infrastructure`, because it separates configuration and external-system code while keeping the change small.
