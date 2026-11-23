# Frontend Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the frontend source tree and consolidate TypeScript configuration while preserving current behavior.

**Architecture:** Current application modules move unchanged into `src/tmp`; the requested top-level directories become the destination for future refactors. A single TypeScript configuration checks both browser source and Vite configuration.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node test runner

**Spec:** `app/frontend/docs/superpowers/specs/2026-10-27-frontend-structure-design.md`

## Global Constraints

- Preserve runtime behavior and existing assets.
- Keep the five requested source entry files at `src` root.
- Preserve existing dependency-file changes.

## Review Focus

- Alias imports must resolve after moving modules under `src/tmp`.
- The merged TypeScript configuration must type-check browser and Node/Vite code.
- Every requested directory and root file must exist.
- Legacy TypeScript project files must be absent.
- Existing frontend tests and production build must still pass.

---

### Task 1: Lock and apply the source layout

**Files:**
- Create: `app/frontend/tests/frontend-structure.test.mjs`
- Create: requested `app/frontend/src` directories and `vite-env.d.ts`
- Move: current application module directories to `app/frontend/src/tmp`
- Modify: imports under `app/frontend/src`

**Interfaces:**
- Consumes: existing `@/*` alias and app entry points
- Produces: requested source layout with current implementation under `src/tmp`

- [ ] Add and run a failing filesystem contract test.
- [ ] Move current modules, create placeholders, and update imports.
- [ ] Run the structure test and full test suite.

### Task 2: Consolidate TypeScript configuration

**Files:**
- Modify: `app/frontend/tsconfig.json`
- Delete: `app/frontend/tsconfig.app.json`
- Delete: `app/frontend/tsconfig.node.json`

**Interfaces:**
- Consumes: source layout from Task 1
- Produces: one TypeScript project used by `tsc -b`

- [ ] Merge browser and Node compiler settings into `tsconfig.json`.
- [ ] Remove the two referenced configs.
- [ ] Run tests, lint, and production build.
