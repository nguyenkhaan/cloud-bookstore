# HRM Wave 1 API Gap Specification (`SCR-HRM-01` & `SCR-HRM-04`)

This document tracks existing backend endpoints used by HRM Wave 1 and every missing backend API currently backed by frontend mock stores.
Wave 2 (`SCR-HRM-05` and `SCR-HRM-06`) will append payroll and payslip contracts to this document.

## 1. Existing Backend Endpoints Used

| Screen | Method | Endpoint | Usage & Notes | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| SCR-HRM-01C | `PATCH` | `/api/employee/{employeeId}/role` | Updates an employee role with `{ roleName, reason }` (`ChangeEmployeeRequest`). Falls back to local mock state when `employeeId` is a mock code (`NV-*`) or backend is unreachable. | `app/frontend/src/features/hr/hr-employees.service.ts` |
| Shared Auth | `GET` | `/api/auth/session` | Resolves signed-in staff user and `role` (`ADMIN`, `CASHIER`, `INVENTORY_MANAGER`) for Sidebar and HRM permissions. | `app/frontend/src/features/auth/auth.service.ts` |

## 2. Missing Backend Endpoints for SCR-HRM-01 (Employee Directory & Profile)

| Action / Screen | Suggested Method & Route | Query / Body Schema | Expected Response DTO | Frontend Caller & Current Fallback |
| :--- | :--- | :--- | :--- | :--- |
| List employees & KPI summary (`SCR-HRM-01`) | `GET /api/employees` | Query: `search?: string`, `role?: RoleName`, `status?: string`, `page?: number`, `pageSize?: number` | `{ items: EmployeeSummaryDto[], totalCount: number, page: number, pageSize: number, kpi: { activeCount, newAccountsCount, inShiftCount, rootAdminCount } }` | `listHrEmployees` in `hr-employees.service.ts` (uses 14 mock records in `hr-employees.mock.ts`) |
| Create internal staff account (`SCR-HRM-01A`) | `POST /api/employees` | Body: `{ fullName: string, email: string, phone: string, roleName: RoleName, jobTitle?: string }` | `201 Created` with `EmployeeDetailDto` (`status: 'pending_activation'`) and triggers email setup link | `createHrEmployee` in `hr-employees.service.ts` (appends `NV-00XX` record in memory) |
| Get employee profile detail (`SCR-HRM-01B`) | `GET /api/employees/{employeeId}` | Path: `employeeId: uuid` | `{ id, code, fullName, email, phone, roleName, jobTitle, status, branchName, createdAt, username, isRootAdmin }` | `getHrEmployeeById` in `hr-employees.service.ts` (resolves from `employeeStore`) |
| Get employee recent shifts (`SCR-HRM-01B`) | `GET /api/employees/{employeeId}/shifts` | Query: `page?: number`, `pageSize?: number` | `{ items: [{ id, workDate, shiftOrder, timeRange, checkInTime, checkOutTime, status }], totalCount }` | `EmployeeRecentShiftsCard.tsx` (reads `employee.recentShifts` from mock store) |
| Update employee profile & status (`SCR-HRM-01C`) | `PUT /api/employees/{employeeId}` | Body: `{ fullName: string, email: string, phone: string, jobTitle?: string, status: string }` | `200 OK` with updated `EmployeeDetailDto` (must reject locking/demoting `RootAdmin`) | `updateHrEmployee` in `hr-employees.service.ts` (updates in-memory store and calls `PATCH /api/employee/{id}/role` on role change) |

## 3. Missing Backend Endpoints for SCR-HRM-04 (Requests & Approvals)

| Action / Screen | Suggested Method & Route | Query / Body Schema | Expected Response DTO | Frontend Caller & Current Fallback |
| :--- | :--- | :--- | :--- | :--- |
| List personal & pending requests (`SCR-HRM-04A/B`) | `GET /api/hr/requests` | Query: `scope: 'mine' \| 'pending'`, `search?: string`, `month?: string`, `status?: 'pending' \| 'approved' \| 'rejected'` | `{ items: HrRequestDto[], myCount: number, pendingApprovalCount: number }` | `getHrRequestsSummary` in `hr-requests.service.ts` (uses mock dataset in `hr-requests.mock.ts`) |
| Submit leave / shift-swap / attendance explanation (`SCR-HRM-04A`) | `POST /api/hr/requests` | Body: `{ type: 'shift_swap' \| 'leave' \| 'attendance_explanation', applyDate: string, currentShiftId?: string, targetShiftId?: string, correctTimeRange?: string, replacementEmployeeId?: string, reason: string, attachmentUrl?: string }` | `201 Created` with `HrRequestDto` (`status: 'pending'`) | `createHrRequest` in `hr-requests.service.ts` (prepends pending request to local store) |
| Approve or reject HR request (`SCR-HRM-04B`) | `POST /api/hr/requests/{requestId}/review` | Body: `{ decision: 'approved' \| 'rejected', note: string }` (Admin role required, non-empty `note`) | `200 OK` with updated `HrRequestDto` and appended `history` entry | `reviewHrRequest` in `hr-requests.service.ts` (mutates local store and appends approval history) |
