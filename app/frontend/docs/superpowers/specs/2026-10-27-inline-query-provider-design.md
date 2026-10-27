# Inline Query Provider Design

## Intent

Remove the application-specific `QueryProvider` wrapper and keep TanStack Query setup at the application entrypoint, where the root dependency is installed.

## Goals

- Keep `useQuery` and `useMutation` working under one stable `QueryClient`.
- Remove `src/context/QueryProvider.tsx` and `src/lib/query-client.ts`.
- Make `src/main.tsx` own the root `QueryClientProvider` setup directly.
- Update the structural test to assert the new arrangement.

## Non-goals

- Do not remove TanStack Query or rewrite existing query and mutation hooks.
- Do not change query defaults, caching behavior, routing, or authentication behavior.
- Do not reorganize other context providers.

## Approaches

- Selected: create one module-scoped `QueryClient` in `main.tsx` and render `QueryClientProvider` there. This removes both single-purpose files while preserving behavior.
- Rejected: keep `query-client.ts` and only inline the provider. The exported singleton has no other consumer, so the extra file adds no current value.
- Rejected: move the wrapper to `src/app/providers`. That retains an abstraction with only one call site and introduces more structure than the application needs.

## Verification

- The structural test must require `QueryClient` and `QueryClientProvider` in `main.tsx` and reject both removed files.
- Run the focused structural test, full frontend tests, lint, and production build.
