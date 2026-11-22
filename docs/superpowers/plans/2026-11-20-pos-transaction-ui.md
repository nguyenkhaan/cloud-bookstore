# POS Transaction UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the POS transaction mock UI described in `docs/designs/pos-transaction-ui-design.md` as a feature-local React workspace with four tabs, two modals, and a customer-display route.

**Architecture:** Keep all transaction UI under `app/frontend/src/features/pos`. `/pos` renders one `PosWorkspacePage` whose local tab state owns sale, rental, renewal, and return panels; `/pos/customer-display` renders a standalone customer-facing page; `/pos/shift` and its existing cash-shift page remain unchanged. Fixtures and local state model the UI only and never call an API.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS v4, lucide-react, existing `MainLayout`, `Card`, `Button`, `Badge`, `TextField`, and `SelectBox` primitives.

**Spec:** `docs/designs/pos-transaction-ui-design.md`

## Global Constraints

- Keep all feature-specific code in `app/frontend/src/features/pos`.
- Use `CopyBarcode` for transaction rows; ISBN may only appear as edition lookup context.
- Rental deposit display is 100% of each copy's actual selling price; unresolved rental/damage formulas remain fixture labels.
- `MOD-POS-02` displays an Admin approval fixture only; it must not grant Employee or Warehouse approval.
- No new API calls, services, hooks, TanStack Query keys, backend changes, migrations, or generated-contract edits.
- Reuse existing frontend theme and primitives; do not introduce a parallel design system or `App.css` styles.
- Preserve `/pos/shift` behavior and route.
- Keep `SCR-POS-07` standalone and sales-payment-only; direct navigation uses fallback fixture.

## Review Focus

- Scanner duplicate/invalid input: the UI must show inline feedback and never add an invalid or duplicate copy.
- Empty and disabled transaction states: primary actions must remain understandable and disabled with text reasons.
- Rental deposit versus rental fee: the UI must separate 100% copy deposit from fee-to-settle-on-return.
- Return settlement with insufficient deposit: the UI must show additional payment required and not claim completion.
- Customer display isolation: it must render without internal navigation and work with fallback fixture when opened directly.

### Task 1: Define POS transaction fixtures, types, and focused source contract

**Files:**
- Create: `app/frontend/src/features/pos/pos-transaction.type.ts`
- Create: `app/frontend/src/features/pos/pos-transaction.fixture.ts`
- Create: `app/frontend/tests/pos-transaction-ui.test.mjs`

**Interfaces:**
- Produces typed fixture data consumed by all transaction panels and modal components.
- Produces source-level regression assertions for the seven screen codes, routes, local-only boundary, and role/copy constraints.

**Acceptance Criteria:**
- Types cover sale, rental, renewal, return, customer display, quick picker, and damage-review state.
- Fixtures include valid, invalid, empty, pending, success, insufficient-deposit, over-due, and damage-placeholder examples.
- Focused tests assert `/pos/customer-display`, the four POS tabs, `CopyBarcode`, 100% deposit copy, Admin-only damage wording, and absence of API/service imports.

- [x] **Step 1: Write the failing source-contract test**

  Add tests that read the new feature files and assert the required screen codes, route names, fixture-only wording, and no API boundary imports.

- [x] **Step 2: Run the focused test to verify it fails**

  Run from `app/frontend`: `node --test tests/pos-transaction-ui.test.mjs`.
  Expected: FAIL because the new files and route contract do not exist yet.

- [x] **Step 3: Implement the types and fixtures**

  Use explicit unions for tab IDs, payment methods, copy availability, transaction statuses, and damage approval paths. Keep all monetary values as fixture numbers and format them at render time.

- [x] **Step 4: Run the focused test to verify the contract passes**

  Run: `node --test tests/pos-transaction-ui.test.mjs`.
  Expected: PASS for fixture/type/source contract assertions that do not yet depend on page markup.

### Task 2: Build the shared workspace shell and scanner behavior

**Files:**
- Create: `app/frontend/src/features/pos/components/PosWorkspaceTabs.tsx`
- Create: `app/frontend/src/features/pos/components/PosScannerField.tsx`
- Create: `app/frontend/src/features/pos/components/PosPaymentPanel.tsx`
- Create: `app/frontend/src/features/pos/pages/PosWorkspacePage.tsx`
- Modify: `app/frontend/src/features/pos/pos.route.ts`
- Modify: `app/frontend/src/features/pos/pages/PosPage.tsx`

**Interfaces:**
- Consumes: transaction types/fixtures from Task 1 and existing `MainLayout`/common components.
- Produces: `PosWorkspacePage` with `activeTab`, `onOpenQuickPicker`, `onOpenDamageReview`, and local panel state; `PosScannerField` emits a scanned value through a typed callback.

**Acceptance Criteria:**
- `/pos` renders `MainLayout`, the POS tab strip, active screen code, shift fixture context, reset action, and a panel for the active tab.
- Tabs preserve each tab's local state during the current page session.
- Scanner input has a visible label, focus styling, Enter hint, duplicate/invalid inline error, and never performs network access.
- Payment panel supports mock cash/VietQR selection and pending/success copy without claiming real settlement.

- [x] **Step 1: Implement the tabs and scanner**

  Use semantic buttons with `aria-selected` for tabs. Keep scanner value local, add only known fixture copies, and report duplicate/invalid states through text.

- [x] **Step 2: Implement the shared payment panel**

  Render payment method controls, amount summary, cash received/change where applicable, and a mock action with disabled/error/success states.

- [x] **Step 3: Implement the workspace page and route handoff**

  Change `PosPage` from the existing redirect to the workspace page, add the customer-display path constant without changing `shift`, and wire `MainLayout` navigation through existing `workspacePathFor` behavior.

- [x] **Step 4: Run focused tests and TypeScript build**

  Run: `node --test tests/pos-transaction-ui.test.mjs` and `bun run build` from `app/frontend`.
  Expected: the shell compiles; panel imports may still be placeholders until Tasks 3–5 are complete.

### Task 3: Implement sale and rental tabs

**Files:**
- Create: `app/frontend/src/features/pos/components/PosSalePanel.tsx`
- Create: `app/frontend/src/features/pos/components/PosRentalPanel.tsx`
- Modify: `app/frontend/src/features/pos/pages/PosWorkspacePage.tsx`

**Interfaces:**
- Consumes: shared scanner/payment contracts from Task 2 and fixtures from Task 1.
- Produces: sale and rental panels with local line-item state and open-modal callbacks.

**Acceptance Criteria:**
- `SCR-POS-02` shows CopyBarcode rows, optional guest/customer context, discount preview, payment panel, QR/receipt previews, and invalid/blocked copy feedback.
- `SCR-POS-03` shows required renter information, tier limits, actual-selling-price deposit, fee deferred to return, and disabled reasons for blocked rental.
- `MOD-POS-01` can be opened from the workspace context without creating inventory or API state.

- [x] **Step 1: Implement `PosSalePanel`**

  Render the Figma-inspired two-column sale layout with fixture rows, removal/reset controls, customer toggle, payment panel, and status cards.

- [x] **Step 2: Implement `PosRentalPanel`**

  Render renter identity fields, copy availability rows, tier banner, deposit summary equal to fixture actual selling prices, and mock confirmation state.

- [x] **Step 3: Wire sale/rental panels into workspace tabs**

  Preserve local state when switching tabs and keep the screen code in the page header synchronized with the active tab.

- [x] **Step 4: Run focused tests and lint**

  Run: `node --test tests/pos-transaction-ui.test.mjs` and `bun run lint` from `app/frontend`.
  Expected: PASS with only pre-existing warnings, if any.

### Task 4: Implement renewal, return/settlement, and both modals

**Files:**
- Create: `app/frontend/src/features/pos/components/PosRenewalPanel.tsx`
- Create: `app/frontend/src/features/pos/components/PosReturnPanel.tsx`
- Create: `app/frontend/src/features/pos/components/QuickSeriesPickerModal.tsx`
- Create: `app/frontend/src/features/pos/components/DamageReviewModal.tsx`
- Modify: `app/frontend/src/features/pos/pages/PosWorkspacePage.tsx`

**Interfaces:**
- Consumes: workspace modal state and scanner/payment contracts from Tasks 1–3.
- Produces: renewal and return panels, modal callbacks that return local preview data only.

**Acceptance Criteria:**
- `SCR-POS-04` shows lookup, renewal count/day guardrails, fee preview deferred to return, history, and disabled overdue/maximum-renewal states.
- `SCR-POS-05` shows full-return scan progress, deduction breakdown, refund/additional-payment state, and opens damage review.
- `MOD-POS-01` shows series search, volume filters, selected volumes, grade/pricing draft, and Apply preview without creating sale lines or CopyBarcodes.
- `MOD-POS-02` shows damage placeholder, Admin approval branch, remote approval branch, image placeholders, and explicit unresolved-policy label.

- [x] **Step 1: Implement `PosRenewalPanel`**

  Use local lookup state and fixture statuses; keep confirmation disabled when overdue, blocked, or at the two-renewal limit.

- [x] **Step 2: Implement `PosReturnPanel`**

  Track scanned/remaining copies, compute only fixture display values, and show insufficient-deposit state without implying final business completion.

- [x] **Step 3: Implement `QuickSeriesPickerModal` and `DamageReviewModal`**

  Use accessible dialog semantics, Escape/close behavior, visible labels, and callbacks that update workspace preview state only.

- [x] **Step 4: Wire modal open/close and verify focused behavior**

  Run: `node --test tests/pos-transaction-ui.test.mjs` and `bun run build`.
  Expected: PASS and no API/service imports.

### Task 5: Implement the standalone customer display route

**Files:**
- Create: `app/frontend/src/features/pos/components/PosCustomerDisplay.tsx`
- Create: `app/frontend/src/features/pos/pages/PosCustomerDisplayPage.tsx`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/src/features/pos/pos.route.ts`

**Interfaces:**
- Consumes: sales fixture and optional local customer-display payload from Task 1.
- Produces: `/pos/customer-display` route with fallback fixture and optional same-browser `BroadcastChannel` update.

**Acceptance Criteria:**
- Route renders without `MainLayout`, sidebar, or internal actions.
- Desktop layout has selected books on the left and VietQR/payment status on the right; mobile layout stacks without horizontal page overflow.
- Direct navigation renders fallback fixture; same-browser messages can update the displayed sales payload; no cross-device persistence is introduced.

- [x] **Step 1: Implement the display component**

  Render store identity, request code, selected books, total, QR placeholder, payment status, expiry, and success/pending banner using local fixture data.

- [x] **Step 2: Implement the page and route**

  Add a `RequireSession`-protected route and keep the existing `/pos/shift` route unchanged.

- [x] **Step 3: Run focused UI contract and build checks**

  Run: `node --test tests/pos-transaction-ui.test.mjs` and `bun run build`.
  Expected: PASS.

### Task 6: Full verification and handoff

**Files:**
- Modify: `docs/plans/todo.md` only if the repository task tracker has an existing matching POS UI item.

**Acceptance Criteria:**
- All requested screens are reachable and local-only.
- Existing POS shift tests and routes remain passing.
- No unrelated files or generated contracts are changed.

- [x] **Step 1: Run the complete frontend verification**

  From `app/frontend`, run `bun run test`, `bun run lint`, and `bun run build`.

- [x] **Step 2: Inspect final diff and responsive-sensitive classes**

  Run `git diff --check`, `git status --short`, and inspect changed files for accidental API imports, stale temporary Figma URLs, and horizontal page overflow risks.

- [x] **Step 3: Report verification results**

  Distinguish pre-existing warnings/failures from regressions and provide the implemented route/component handoff.
