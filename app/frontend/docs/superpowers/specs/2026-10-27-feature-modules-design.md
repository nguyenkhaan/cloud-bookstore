# Frontend Feature Modules Design

## Intent

Incrementally move domain-owned UI out of `src/tmp` into feature modules while keeping unrelated and legacy screens in place.

## Selected structure

- `features/auth`: login and activation pages, auth-only components, hooks, service, types, styles, and error mapping.
- `features/dashboard`: dashboard page plus initially empty component, hook, service, and type module boundaries.
- `components/TextField`: the first shared component because its API is domain-neutral.
- `routes/AppRoutes.tsx`: React Router route table containing only migrated pages; pages still in `tmp` remain unregistered until their feature is refactored.

## Constraints

- Preserve existing behavior and the user's unrelated working-tree changes.
- Keep `legacy` and unrelated pages under `tmp`.
- Do not invent dashboard API behavior before its backend contract exists.
