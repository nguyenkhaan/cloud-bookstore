# CAT-001 Series Card Actions Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Book Series information and cover-image updates from each card while leaving all deletion calls disconnected.

**Architecture:** Keep state in the feature-owned `SeriesCardActions` component rendered beside the existing card link, so action clicks never nest inside or trigger navigation. Reuse `useUpdateSeriesMutation` for name/description and `useUpdateSeriesStatusMutation` only for a changed status, preserving the backend's status cascade without backend changes. For an image, reuse the signed direct-upload service (`uploadImage('BOOK_SERIES_IMAGE', file)`) and then `useReplaceSeriesImageMutation`; the browser sends the file to Cloudinary and only its signed result to the backend.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `lucide-react`, Node test runner.

**Spec:** `docs/specs/CAT-001-series-card-actions-ui.md`

## Global Constraints

- Scope is limited to `/catalog/series` Book Cards and their existing dialogs.
- Do not call either Book Series deletion endpoint or edit the generated API contract.
- Do not send image files through the backend; use the existing signed direct upload flow.
- Keep the existing slate/indigo visual language and card navigation behavior.
- Icon actions must be keyboard accessible with visible focus; dialog close restores focus to its opener.

## Review Focus

- Card navigation remains available while icon clicks do not navigate.
- The destructive action only opens confirmation; it cannot delete a series or its image in this slice.
- Opening and closing the dialog preserves the card context and returns keyboard focus correctly.
- The save and image actions are single-flight, announce pending state, and retain usable data after errors.
- An uploaded cover previews from Cloudinary before the card cache refreshes.
- Existing create-series dialog behavior remains intact after shared-dialog focus changes.

---

### Task 1: Align the update payload with the generated contract

**Files:**
- Modify: `app/frontend/src/features/catalog/catalog.type.ts`
- Modify: `app/frontend/tests/catalog-api-coverage.test.mjs`

**Interfaces:**
- Consumes: generated `components['schemas']['UpdateBookSeriesRequest']`.
- Produces: `UpdateSeriesRequest` limited to the `name` and `description` sent by `updateSeries`.

**Acceptance Criteria:**
- The typed general-update payload cannot include unsupported `expectedVolumeCount`.
- The status is intentionally not part of this payload because it uses the status endpoint.

- [x] **Step 1: Write the failing source-level contract test**

Add a test that requires `UpdateSeriesRequest` to be derived from generated `UpdateBookSeriesRequest` and narrowed to `name`/`description`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-api-coverage.test.mjs`
Expected: FAIL because the handwritten update type includes unsupported fields.

- [x] **Step 3: Narrow `UpdateSeriesRequest` to the generated request fields used by `updateSeries`**

Use a frontend-specific `Pick` of the generated request. Image and status retain their dedicated endpoints and types.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-api-coverage.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the required frontend verification**

Run: `cd app/frontend && bun run test && bun run lint && bun run build`
Expected: all commands exit 0.

### Task 2: Save general Book Series information

**Files:**
- Modify: `app/frontend/src/features/catalog/components/SeriesCardActions.tsx`
- Modify: `app/frontend/tests/catalog-series-cover.test.mjs`

**Interfaces:**
- Consumes: `useUpdateSeriesMutation({ seriesId, request })` and `useUpdateSeriesStatusMutation({ seriesId, isActive })`.
- Produces: a single-flight details form that reports errors without closing or clearing user input.

**Acceptance Criteria:**
- Saving a valid name and description uses the update mutation.
- A changed status uses the dedicated status mutation after the information request.
- The submit button is disabled and displays `Đang lưu…` while either mutation is pending.
- No delete mutation is imported or invoked.

- [x] **Step 1: Write the failing source-level UI tests**

Require the two update hooks, the async submit handler, a pending `Button` labelled `Đang lưu…`, a form error alert, and continued absence of `useDeleteSeriesMutation`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: FAIL because the form is still UI-only.

- [x] **Step 3: Connect `SeriesCardActions` to the update mutations**

Reset draft state each time the edit dialog opens. Submit trimmed `name` and nullable `description`; call the status mutation only when `isActive` differs from the current series. Preserve input and show an explicit partial-save error if the second request fails.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: PASS.

### Task 3: Directly upload and attach a Book Series cover

**Files:**
- Modify: `app/frontend/src/features/catalog/components/SeriesCardActions.tsx`
- Modify: `app/frontend/tests/catalog-series-cover.test.mjs`

**Interfaces:**
- Consumes: `uploadImage('BOOK_SERIES_IMAGE', file)` and `useReplaceSeriesImageMutation({ seriesId, imageUpload })`.
- Produces: an image tab with Cloudinary preview, automatic attach, retry-safe pending upload result, and no image deletion request.

**Acceptance Criteria:**
- An accepted file is sent directly to Cloudinary through the signed-upload service and its returned preview is visible in the dialog.
- The attach mutation runs after upload and blocks duplicate selection/attachment while pending.
- On attach `400`, the upload result remains available for retry; on `409`, it is discarded and the user is asked to choose a new file.
- The existing image persists on upload failure; a failed attachment retains the new preview only as an unsaved retry candidate, and `DELETE /image` is not invoked.

- [x] **Step 1: Write the failing source-level UI tests**

Require the direct-upload owner type, `previewUrl` display, replacement mutation, pending labels, retry handling, and no delete-image mutation.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: FAIL because the image tab is preview-only.

- [x] **Step 3: Implement the direct upload and attach state machine**

Use a hidden file input. Keep the returned `UploadedImage` until attachment succeeds; show its Cloudinary `previewUrl` immediately, automatically attach it, and expose a retry button only for a retained non-409 result.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the required frontend verification and update task evidence**

Run: `cd app/frontend && bun run test && bun run lint && bun run build`
Expected: all commands exit 0. Update `docs/plans/todo.md` with the exact results and retain the delete API as out of scope.
