# Shared Components Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move verified shared components from `src/tmp/components` to `src/components` and update all consumers.

**Architecture:** Preserve the existing `common` and `layout` groupings to avoid needless API changes. Leave the unimplemented Modal placeholder in `tmp`.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, Bun

**Spec:** `app/frontend/docs/superpowers/specs/2026-10-27-shared-components-design.md`

## Global Constraints

- Preserve component APIs and behavior.
- Do not alter unrelated user changes.
- Use Bun for verification.

## Review Focus

- No source import may reference `@/tmp/components`.
- Barrel exports must resolve after the move.
- The application shell must still render inside BrowserRouter.
- Empty placeholders must not be presented as implemented components.

---

### Task 1: Move shared components

- [x] Add and run a failing filesystem/import contract test.
- [x] Move common primitives and layout components.
- [x] Update all internal and consumer imports.
- [x] Run tests, lint, and production build.
