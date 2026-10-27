# Frontend Agent Instructions

These instructions apply to all work under `app/frontend`.

## Start Here

- Read `README.md`, `package.json`, and the files directly connected to the task before editing.
- Check `git status --short`. Preserve unrelated and user-owned changes.
- Search every caller, import, test, fixture, config, and document affected by a move or rename.
- Keep changes scoped. Do not combine a structural refactor with a visual redesign unless explicitly requested.
- Prefer deleting unnecessary indirection over adding wrappers, abstractions, dependencies, or future-facing structure.

## Architecture and File Ownership

- `src/api`: shared HTTP client configuration only. Feature endpoints belong in feature services.
- `src/assets`: fonts, icons, and images.
- `src/components/common`: reusable, feature-agnostic UI primitives.
- `src/components/layout`: application shell components.
- `src/context`: app-owned, cross-feature React context contracts and providers.
- `src/contract`: generated OpenAPI types. Never edit generated files manually.
- `src/features/<feature>`: feature pages, components, hooks, services, types, and feature-only helpers.
- `src/hooks`: hooks genuinely reused by multiple features.
- `src/lib`: small framework-independent utilities and shared constants.
- `src/pages`: app-level pages that do not belong to one feature.
- `src/routes`: route declarations, guards, redirects, and route-level boundaries.
- `src/store`: global client state only. Remote/server state belongs in TanStack Query.
- `src/main.tsx`: browser entrypoint and simple third-party root providers.

Follow these placement rules:

- Keep feature-specific code inside its feature. Do not promote code to a shared folder before it has real cross-feature use.
- Use the `@/` alias for imports from `src`.
- Do not create or import `src/tmp`. Move code directly to its final owner.
- Do not recreate `context/QueryProvider.tsx` or `lib/query-client.ts`. TanStack Query is configured directly in `main.tsx` with one module-scoped `QueryClient`.
- Use React Context for app-owned cross-feature state, not as a thin wrapper around a third-party provider.
- Preserve provider ordering requirements. For example, a provider using router hooks must render below `BrowserRouter`.
- Reuse existing shared components before creating another button, field, card, badge, icon, or layout primitive.

## API Contract and Data Access

- `src/contract/api-contract.ts` is generated from the backend OpenAPI document. Never hand-edit it or duplicate its DTOs without a frontend-specific reason.
- Keep `VITE_BASE_URL` as the frontend backend-origin variable. The current client does not read `VITE_API_BASE_URL`.
- To regenerate the contract, start the backend on port `4000`, confirm `http://localhost:4000/openapi/v1.json` is available, then run from `app/frontend`:

```bash
bun run generate:api
```

- After regeneration, review the generated diff and update affected feature services and types.
- API calls live in `*.service.ts`; TanStack Query hooks and mutation/query keys live in `*.hook.ts`.
- Do not call feature services directly from pages when an existing query or mutation hook owns that operation.
- Preserve backend error status and messages at the service boundary; map them to user-facing copy in the feature.

## UI and UX Guardrails

Preserve the existing bookstore identity, information hierarchy, and working behavior unless the task explicitly requests a redesign.

### Components and styling

- Use the existing Tailwind theme and shared primitives. Do not introduce a parallel design system or scattered raw colors.
- Use `cn()` for conditional classes and consumer `className` composition.
- Keep shared component APIs stable unless the task requires a small, justified addition.
- Keep distinctive feature composition inside the feature; do not flatten `PasswordField`, `Stepper`, `HeroArt`, or similar domain UI into generic primitives.
- Use the shared SVG icon set where semantics match. Do not use emoji as interface icons.
- Avoid decorative gradients, excessive shadows, nested cards, and animation that does not communicate state.
- Respect `prefers-reduced-motion`; never make motion the only indication of a state change.

### Accessibility and interaction

- Use semantic HTML: buttons for actions, links for navigation, headings in order, and real form controls.
- Every input needs a visible associated label. Placeholder text is not a label.
- Keep visible keyboard focus on every interactive control. Never remove an outline without an accessible replacement.
- All behavior must work by keyboard with a logical tab order and no keyboard trap.
- Icon-only controls require an accessible name. Decorative icons must be hidden from assistive technology.
- Connect help and errors with `aria-describedby`; expose invalid state with `aria-invalid`.
- Announce asynchronous errors and important status changes with the appropriate `role` or live region.
- Maintain at least 4.5:1 contrast for normal text. Do not communicate status by color alone.
- Make primary and mobile touch targets at least 44×44 CSS pixels and leave adequate spacing between adjacent targets.

### Forms and async states

- Show explicit pending, success, and error feedback for submissions.
- Disable duplicate submission while a mutation is pending and keep the control label meaningful.
- Put validation feedback next to the affected field; use a focusable error summary for multi-field failures when appropriate.
- Do not clear valid user input after a failed request. Follow the feature's established recovery behavior.
- Implement and review loading, empty, zero, error, disabled, hover, focus, and success states—not only the populated happy path.
- Render real zero values as zero; use a dash only for missing or not-applicable data.

### Responsive behavior

- Build mobile-first and inspect UI at approximately `390px`, `768px`, and `1440px` widths.
- The page must not scroll horizontally. Long identifiers must wrap, and flex/grid text children must be allowed to shrink.
- Tables must become readable mobile rows or scroll inside their own bounded container; never make the whole page scroll sideways.
- Navigation must fold on small screens. Do not leave a desktop sidebar occupying the phone viewport.
- Keep content, actions, and focus visible without clipping. Do not hide overflow as a substitute for fixing layout.
- Preserve the primary task and at least the beginning of required content above the desktop fold.

## Refactor Safety

When moving, renaming, or deleting code:

1. Search all references first with `rg`.
2. Update implementation, imports, tests, fixtures, and structure checks in the same change.
3. Delete the old path only after no runtime importer depends on it.
4. Search the old path/name again and inspect every remaining match.
5. Run focused tests, the full suite, lint, and build.

Never repeat these refactor failures:

- Do not delete a directory while source files or tests still import it.
- Do not leave structure tests requiring a directory that the refactor intentionally removed.
- Do not add a one-call-site provider wrapper when direct root configuration is clearer.
- Do not change generated contracts manually.
- Do not report success from a focused test while the full suite or build is failing. Record baseline failures before editing and report them explicitly afterward.

## Required Verification

For code changes, run from `app/frontend`:

```bash
bun run test
bun run lint
bun run build
```

Also run the smallest relevant test during development. For UI changes, verify keyboard navigation, focus, loading/error states, and responsive layouts in a browser at phone, tablet, and desktop widths.

Before handing off:

- Run `git diff --check`.
- Inspect the final diff and `git status --short`.
- Confirm no stale imports or old paths remain.
- Report every failing command and warning; distinguish pre-existing failures from regressions.
- Do not claim the work is complete unless the requested behavior and the relevant verification both pass.
