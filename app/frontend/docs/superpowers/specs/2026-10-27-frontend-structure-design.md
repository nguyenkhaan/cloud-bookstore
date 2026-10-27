# Frontend Structure Refactor Design

## Intent

Reorganize `src` into the requested application structure without changing runtime behavior. Keep the current feature implementation available under `src/tmp` while the new architecture is populated incrementally.

## Scope

- Keep `App.css`, `App.tsx`, `index.css`, `main.tsx`, `vite-env.d.ts`, and assets at their requested locations.
- Move the current application modules into `src/tmp` and update entry imports.
- Create the requested empty architecture directories with tracked placeholders.
- Replace the referenced app/node TypeScript projects with one `tsconfig.json` covering `src` and `vite.config.ts`.

## Approaches

- Selected: move current modules wholesale into `src/tmp`. This preserves their internal layout and limits import changes to the app entry point because aliased imports inside `tmp` continue resolving through `@/tmp/...` after a mechanical rewrite.
- Rejected: redistribute current code immediately into the new directories. That would mix temporary organization with domain redesign and exceed this phase.
- Rejected: leave current modules in place and create only missing directories. That would not satisfy the temporary quarantine requirement.

## Constraints

- Preserve behavior and existing assets.
- Do not modify the user's existing dependency changes.
- Add no dependency or new application abstraction.
