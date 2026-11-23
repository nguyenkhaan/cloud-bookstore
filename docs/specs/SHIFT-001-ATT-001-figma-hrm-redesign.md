# SHIFT-001 / ATT-001 — Figma HRM Screen Redesign

**Status:** Accepted  
**Date:** 2026-11-24  
**Scope:** Frontend only

## References

- Features: `SHIFT-001`, `ATT-001`, `ATT-002`, `PAYROLL-001`–`PAYROLL-003`, `RBAC-001`–`RBAC-003`.
- Figma: Cloud Bookstore, `SCR-HRM-02 · Lập lịch phân ca làm việc` (`326:6498`) and `SCR-HRM-03 · Điểm danh & Bảng chấm công tổng thể` (`326:6726`).
- Role/data-scope rules: `docs/product/ROLES.md` and `RBAC-002-screen-route-api-enforcement.md`.

## Goal

Replace the existing UI composition at `/hr/shifts` and `/hr/attendance` with the Figma information hierarchy and interactions, while retaining the application shell, existing Tailwind primitives, route guards, and frontend-only fixture data.

## Route and access decision

| Route | Navigation | Access | Data shown |
| --- | --- | --- | --- |
| `/hr/shifts` | Visible when the role has access | Admin manages the store roster; Cashier and Inventory see only their own shifts | Store roster for Admin; actor-scoped shifts for non-Admin |
| `/hr/attendance` | Visible when the role has access | Admin manages the aggregate timesheet; Cashier and Inventory use the integrated personal check-in area and see only their own records | Aggregate data for Admin; actor-scoped data for non-Admin |
| `/hr/attendance/personal` | Hidden for every role | Denied for every role; a manually entered URL receives the existing 403 boundary | None |

The personal-attendance feature is not deleted in this slice. Its hidden, denied route remains an intentional temporary permission boundary and can be restored later without reintroducing a navigation item.

## UX design

### `/hr/shifts` — weekly roster

- Retain `MainLayout`, current sidebar, breadcrumb treatment, typography, buttons, focus states, and responsive rules.
- Replace the daily records table with the Figma weekly roster: date/week navigation, store/my-schedule switch, four operational summary cards, three shift rows, staff assignment chips, shortage states, assignment controls, and an alerts panel.
- Admin can use the store schedule, publish the roster, and add staff to an open shift through local UI state. Non-Admin is limited to their own schedule and cannot see other employees' assignments.
- The layout must stack or horizontally scroll only inside the roster container at narrow widths; the page itself must not horizontally scroll.

### `/hr/attendance` — attendance and overall timesheet

- Replace the split Admin/personal pages with one Figma-shaped screen. It includes the actor's current-shift check-in/check-out card, current-period status, operational summary cards, filters, attendance table, and Admin-only administration panels.
- The check-in/check-out buttons remain local demo state until an API contract exists. UI clearly states that the timestamp is server-time controlled; it must not present a local timestamp edit field.
- For Admin, the table shows aggregate fixture records and the export/period-administration controls. For Cashier and Inventory, it shows only actor-scoped records and hides aggregate administration controls.
- The month-close/unlock panels from Figma are present only as non-mutating UI affordances. They must not claim to close, unlock, calculate, or pay a payroll period, because canonical `PAYROLL-001` supports pay per shift only.

## Constraints

- No backend endpoint, generated API contract, or global design system change.
- Do not show screen codes in the UI.
- Keep missing check-in/check-out as `Thiếu chấm công`; do not infer worked hours.
- Use text plus color for statuses, semantic controls, keyboard focus, and responsive layouts at 390px, 768px, and 1440px.
- Update route, navigation, RBAC-policy, fixture, and structure/behavior tests together.

## Acceptance criteria

1. `/hr/shifts` matches the Figma weekly scheduling UX inside the existing application shell and preserves role-scoped visibility.
2. `/hr/attendance` matches the Figma attendance UX, combines current-user check-in with the role-appropriate timesheet view, and keeps all mutations local/demo-only.
3. `Chấm công cá nhân` is absent from every navigation menu; `/hr/attendance/personal` is denied for Admin, Cashier, and Inventory.
4. Admin retains access to every relevant HRM-02/HRM-03 control; non-Admin roles never receive another employee's fixture rows in the UI.
5. Focused tests plus the full frontend test, lint, build, and `git diff --check` pass.
