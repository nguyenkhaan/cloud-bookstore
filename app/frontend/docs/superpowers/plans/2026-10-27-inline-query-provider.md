# Inline Query Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the custom query-provider wrapper while preserving TanStack Query at the React application root.

**Architecture:** `main.tsx` will create one module-scoped `QueryClient` and pass it directly to TanStack Query's `QueryClientProvider`. The two single-purpose indirection files will be deleted, and the existing structural test will enforce the simpler root setup.

**Tech Stack:** React 19, TypeScript, TanStack Query 5, Node test runner, Vite

**Spec:** `docs/superpowers/specs/2026-10-27-inline-query-provider-design.md`

## Global Constraints

- Preserve existing query, mutation, caching, routing, and authentication behavior.
- Do not add dependencies or introduce another provider wrapper.
- Keep the `QueryClient` at module scope so renders cannot recreate it.

## Review Focus

- Application boot: `App` remains inside `QueryClientProvider`.
- Client lifetime: exactly one `QueryClient` is created at module scope.
- Hook compatibility: existing `useQuery` and `useMutation` calls retain an ancestor provider.
- Removed imports: no source or test references either deleted file.
- Build integrity: TypeScript and Vite resolve the direct TanStack Query imports.

---

### Task 1: Inline the TanStack Query root setup

**Files:**
- Modify: `tests/feature-structure.test.mjs`
- Modify: `src/main.tsx`
- Delete: `src/context/QueryProvider.tsx`
- Delete: `src/lib/query-client.ts`

**Interfaces:**
- Consumes: `QueryClient` and `QueryClientProvider` from `@tanstack/react-query`.
- Produces: one module-scoped `queryClient` passed to the provider wrapping `<App />`.

- [ ] **Step 1: Change the structural test to describe the simplified setup**

Update `React Query is configured at the application root` to assert that both old files are absent, `main.tsx` imports/uses `QueryClient` and `QueryClientProvider`, creates `queryClient` outside the render call, and wraps `<App />` with the library provider.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/feature-structure.test.mjs`

Expected: FAIL because the wrapper files still exist and `main.tsx` still uses `QueryProvider`.

- [ ] **Step 3: Implement the root provider directly**

In `src/main.tsx`, replace the custom-provider import with the two TanStack Query imports, declare `const queryClient = new QueryClient()` at module scope, and render `<QueryClientProvider client={queryClient}>` around `<App />`.

- [ ] **Step 4: Delete the obsolete indirection files**

Delete `src/context/QueryProvider.tsx` and `src/lib/query-client.ts`, then confirm no references remain with `rg -n "QueryProvider|query-client" src tests`.

- [ ] **Step 5: Run verification**

Run: `node --test tests/feature-structure.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all frontend tests PASS.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx tests/feature-structure.test.mjs docs/superpowers/specs/2026-10-27-inline-query-provider-design.md docs/superpowers/plans/2026-10-27-inline-query-provider.md
git add -u src/context/QueryProvider.tsx src/lib/query-client.ts
git commit -m "refactor(frontend): inline query provider setup"
```
