# Frontend Feature Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish auth and dashboard feature modules, extract shared TextField, and adopt a React Router route table.

**Architecture:** Domain-owned UI lives beneath its feature; shared UI remains in `src/components`. Unmigrated screens stay in `src/tmp` and are not registered in the new route table until their feature is refactored.

**Tech Stack:** React 19, React Router, TypeScript 6, Vite 8, Bun

**Spec:** `app/frontend/docs/superpowers/specs/2026-10-27-feature-modules-design.md`

## Global Constraints

- Preserve existing runtime behavior.
- Keep legacy and unrelated pages in `src/tmp` and out of `AppRoutes.tsx`.
- Use Bun for dependency and verification commands.

## Review Focus

- Every moved import resolves from its new location.
- BrowserRouter contains migrated and legacy route coverage.
- Auth redirects preserve the requested destination.
- No feature-specific dependency remains in shared TextField.
- User-owned untracked/deleted files are not silently overwritten.

---

### Task 1: Establish feature module boundaries

- [x] Add and run a failing filesystem contract test.
- [x] Move auth/dashboard pages and auth components to their modules.
- [x] Extract shared TextField and update imports.
- [x] Add module hook, service, and type files without speculative behavior.

### Task 2: Adopt React Router route table

- [x] Add `react-router-dom` with Bun.
- [x] Implement `src/routes/AppRoutes.tsx` using `BrowserRouter`, `Routes`, and `Route`.
- [x] Update app and navigation integrations.
- [x] Run tests, lint, and production build.
