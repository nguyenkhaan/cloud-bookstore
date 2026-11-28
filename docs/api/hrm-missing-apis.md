# HRM API Specification (`SCR-HRM-01`, `SCR-HRM-04`, `SCR-HRM-05` & `SCR-HRM-06`)

All HRM Wave A (`SCR-HRM-01`, `SCR-HRM-04`) and Wave B (`SCR-HRM-05`, `SCR-HRM-06`) backend endpoints are implemented in PostgreSQL and ASP.NET Core 10 with typed OpenAPI DTOs, Cloudinary signed uploads (`proofUpload`), strict `SELF` scope, and Admin maker-checker controls.

## 1. Shared Authentication & Upload Endpoints

| Purpose | Method & Route | Request / Notes | Response DTO | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| Resolve current session | `GET /api/auth/session` | Cookie JWT + CSRF bootstrap | `SessionUserDto` (`ADMIN`, `CASHIER`, `INVENTORY_MANAGER`) | `app/frontend/src/features/auth/auth.service.ts` |
| Create Cloudinary upload signature | `POST /api/uploads/signature` | Body: `{ ownerType: 'HR_REQUEST_PROOF' \| 'PAYROLL_PAYOUT_PROOF' \| 'PAYSLIP_DISPUTE_PROOF' }` | `UploadSignatureResponse` (`uploadIntentId`, `publicId`, `signature`, `timestamp`) | `app/frontend/src/features/uploads/upload.service.ts` |

## 2. Implemented Endpoints for SCR-HRM-01 (Employee Directory & Profile)

All endpoints in `EmployeesController` require `ADMIN` role authorization and audit sensitive lifecycle changes.

| Action / Screen | Method & Route | Query / Body Schema | Response DTO | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| List employees & KPI summary (`SCR-HRM-01`) | `GET /api/employees` | Query: `search?: string`, `roleName?: RoleName`, `status?: string`, `inShiftOnly?: boolean`, `page?: number`, `pageSize?: number` | `EmployeeListResultDto` (`items`, `totalCount`, `page`, `pageSize`, `kpi`) | `listHrEmployees` in `hr-employees.service.ts` |
| Create internal staff account (`SCR-HRM-01A`) | `POST /api/employees` | Body: `CreateEmployeeRequest` (`fullName`, `email`, `phone`, `roleName`, `jobTitle?`, `branchName?`, `hourlyRate?`, `bankName?`, `bankAccountNumber?`) | `201 Created` with `EmployeeDto` (`status: INVITED`) + setup email | `createHrEmployee` in `hr-employees.service.ts` |
| Get employee profile detail (`SCR-HRM-01B`) | `GET /api/employees/{employeeId}` | Path: `employeeId: uuid` | `EmployeeDto` (`id`, `employeeCode`, `fullName`, `email`, `phone`, `roleName`, `status`, `isProtected`, `hourlyRate`, `bankName`, `bankAccountNumber`) | `getHrEmployeeById` in `hr-employees.service.ts` |
| Get employee recent shifts (`SCR-HRM-01B`) | `GET /api/employees/{employeeId}/shifts` | Query: `page?: number`, `pageSize?: number` | `EmployeeShiftListDto` (`items`, `totalCount`, `page`, `pageSize`) | `listEmployeeShifts` in `hr-employees.service.ts` |
| Update employee profile & status (`SCR-HRM-01C`) | `PUT /api/employees/{employeeId}` | Body: `UpdateEmployeeRequest` (`email`, `fullName`, `phone`, `jobTitle?`, `status`, `reason?`) | `200 OK` with `EmployeeDto` (protects `RootAdmin` and self-lock) | `updateHrEmployee` in `hr-employees.service.ts` |
| Resend setup email (`SCR-HRM-01B`) | `POST /api/employees/{employeeId}/resend-setup-email` | Path: `employeeId: uuid` (allowed when `INVITED`) | `200 OK` | `resendEmployeeSetupEmail` in `hr-employees.service.ts` |
| Change employee role (`SCR-HRM-01C`) | `PATCH /api/employees/{employeeId}/role` | Body: `ChangeEmployeeRequest` (`roleName`, `reason`) | `200 OK` with `EmployeeRoleResponse` | `updateHrEmployee` in `hr-employees.service.ts` |

## 3. Implemented Endpoints for SCR-HRM-04 (Requests & Approvals)

`HrRequestsController` derives the requester strictly from JWT `Sub`, enforces `ADMIN` + maker-checker on `review`, and updates `EmployeeWorkRecordModel` atomically when approving attendance explanations.

| Action / Screen | Method & Route | Query / Body Schema | Response DTO | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| List personal & pending requests (`SCR-HRM-04A/B`) | `GET /api/hr/requests` | Query: `scope: 'mine' \| 'pending'`, `search?: string`, `month?: string`, `status?: HrRequestStatus` (`pending` requires `ADMIN`) | `HrRequestListDto` (`myRequests`, `approvalQueue`, `myCount`, `pendingApprovalCount`) | `getHrRequestsSummary` in `hr-requests.service.ts` |
| Load request form options (`SCR-HRM-04A`) | `GET /api/hr/requests/options` | Authenticated staff actor (`SELF`) | `HrRequestOptionsDto` (`employees`, `workRecords`) | `getHrRequestOptions` in `hr-requests.service.ts` |
| Submit leave / shift-swap / attendance explanation (`SCR-HRM-04A`) | `POST /api/hr/requests` | Body: `CreateHrRequestRequest` (`type`, `applyDate`, `shiftNo?`, `targetShiftNo?`, `replacementEmployeeId?`, `correctCheckInAt?`, `correctCheckOutAt?`, `reason`, `proofUpload?`) | `201 Created` with `HrRequestDto` (`status: PENDING`) | `createHrRequest` in `hr-requests.service.ts` |
| Cancel own pending request (`SCR-HRM-04A`) | `POST /api/hr/requests/{requestId}/cancel` | Path: `requestId: uuid` (requester only, `PENDING` only) | `200 OK` with updated `HrRequestDto` (`status: CANCELLED`) | `cancelHrRequest` in `hr-requests.service.ts` |
| Approve or reject HR request (`SCR-HRM-04B`) | `POST /api/hr/requests/{requestId}/review` | Body: `HrRequestReviewRequest` (`decision: APPROVED \| REJECTED`, `note`) (`ADMIN` only, maker-checker) | `200 OK` with updated `HrRequestDto` & `history` | `reviewHrRequest` in `hr-requests.service.ts` |

## 4. Implemented Endpoints for SCR-HRM-05 (Payroll & Next-Period Adjustments)

All endpoints in `HrPayrollController` require `ADMIN` role authorization, normalize dates to UTC, and persist real `PaymentModel`, `EmployeeWorkRecordModel`, `NotificationOutboxModel`, and `AuditLogModel` records.

| Action / Screen | Method & Route | Query / Body Schema | Response DTO | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| List available payroll periods (`SCR-HRM-05`) | `GET /api/hr/payroll/periods` | None | `PayrollPeriodListItemDto[]` (`periodKey`, `payrollCode`, `status`, `exists`, `employeeCount`, `totalNetPay`, `paidAmount`) | `listPayrollPeriods` in `hr-payroll.service.ts` |
| Get payroll period summary & rows (`SCR-HRM-05A/B/C`) | `GET /api/hr/payroll/periods/{periodKey}` | Query: `search?`, `status?: PayrollPeriodStatus`, `payoutFilter?: paid \| unpaid \| partial`, `page?`, `pageSize?` | `PayrollPeriodDetailDto` (`kpi`, `rows`, `batches`, `history`, `pendingAdjustments`) | `listPayrollPeriod` in `hr-payroll.service.ts` |
| Initialize draft payroll from work records (`SCR-HRM-05B`) | `POST /api/hr/payroll/periods/{periodKey}/initialize` | Path: `periodKey` (`MM/YYYY` or `YYYY-MM`; draft only) | `200 OK` with `PayrollPeriodDetailDto` | `initializePayrollFromAttendance` in `hr-payroll.service.ts` |
| Manual draft adjustment (`SCR-HRM-05B`) | `PATCH /api/hr/payroll/periods/{periodKey}/employees/{employeeId}` | Body: `PatchPayrollEmployeeRequest` (`bonus`, `allowance`, `deduction`, `note?`) | `200 OK` with `PayrollPeriodDetailDto` | `adjustDraftPayrollEmployee` in `hr-payroll.service.ts` |
| Approve & lock payroll (`SCR-HRM-05B -> 05C`) | `POST /api/hr/payroll/periods/{periodKey}/approve` | Path: `periodKey` | `200 OK` with `PayrollPeriodDetailDto` (`APPROVED_UNPAID`) | `approveAndLockPayroll` in `hr-payroll.service.ts` |
| Unlock unpaid payroll (`SCR-HRM-05E/M`) | `POST /api/hr/payroll/periods/{periodKey}/unlock` | Body: `UnlockPayrollRequest` (`reason`; returns `409` if any entry is `PAID`) | `200 OK` with `PayrollPeriodDetailDto` (`DRAFT`) | `unlockPayrollPeriod` in `hr-payroll.service.ts` |
| Execute batch payout via Bank or Cash (`SCR-HRM-05F/G/K/N`) | `POST /api/hr/payroll/periods/{periodKey}/payouts` | Body: `BatchPayoutRequest` (`employeeIds`, `method: BANK_TRANSFER \| CASH`, `transactionRef?`, `payoutDate`, `note?`, `proofUpload?`) | `200 OK` with `PayrollPeriodDetailDto` (`PARTIALLY_PAID` or `SETTLED`) | `executeBatchPayout` in `hr-payroll.service.ts` |
| Send payslips via Zalo outbox (`SCR-HRM-05H/L`) | `POST /api/hr/payroll/periods/{periodKey}/send-zalo` | Body: `SendPayrollZaloRequest` (`employeeIds?`) | `200 OK` with `SendPayrollZaloResultDto` | `sendPayrollZaloPayslips` in `hr-payroll.service.ts` |
| Get breakdown & cash variances (`SCR-HRM-05I/O`) | `GET /api/hr/payroll/periods/{periodKey}/employees/{employeeId}/breakdown` | Path: `periodKey`, `employeeId` | `PayrollBreakdownDto` (`entryId`, `employeeId`, `bonusItems`, `allowanceItems`, `deductionItems`, `cashVariances`) | `getPayrollBreakdown` in `hr-payroll.service.ts` |
| List next-period adjustments (`SCR-HRM-05J`) | `GET /api/hr/payroll/adjustments` | Query: `periodKey?: string` | `PayrollAdjustmentDto[]` | `listNextPeriodAdjustments` in `hr-payroll.service.ts` |
| Create/approve next-period adjustment (`SCR-HRM-05J`) | `POST /api/hr/payroll/adjustments` | Body: `CreatePayrollAdjustmentRequest` (`employeeId`, `sourcePeriodKey?`, `sourceVoucherRef?`, `targetPeriodKey`, `category`, `adjustmentType: ADD_NEXT_PERIOD \| DEDUCT_NEXT_PERIOD`, `amount`, `reason`, `mode: DRAFT \| APPROVED`, `referenceCode?`, `proofUpload?`) | `201 Created` with `PayrollAdjustmentDto` | `createNextPeriodAdjustment` in `hr-payroll.service.ts` |

## 5. Implemented Endpoints for SCR-HRM-06 (Payslips & Disputes)

`HrPayslipsController` enforces strict `SELF` scope on `/me` and `disputes` via JWT `Sub`, restricts `{employeeId}`, `respond`, and `resend-zalo` to `ADMIN`, and enforces maker-checker on dispute responses.

| Action / Screen | Method & Route | Query / Body Schema | Response DTO | Frontend Caller |
| :--- | :--- | :--- | :--- | :--- |
| Get personal payslip (`SCR-HRM-06A/B`) | `GET /api/hr/payslips/me` | Query: `periodKey?: string` (`SELF` via JWT `Sub`) | `PayslipDetailDto` (`hasPayslip`, `entryId`, `availablePeriods`, `attendanceDays`, `overtimeEntries`, `advanceVouchers`, `disputes`) | `getMyPayslipDetail` in `hr-payroll.service.ts` |
| Get employee payslip (`SCR-HRM-06C`) | `GET /api/hr/payslips/{employeeId}` | Path: `employeeId: uuid`, Query: `periodKey?: string` (`ADMIN` only) | `PayslipDetailDto` | `getEmployeePayslipDetail` in `hr-payroll.service.ts` |
| Submit payslip reconciliation dispute (`SCR-HRM-06A/D`) | `POST /api/hr/payslips/{entryId}/disputes` | Path: `entryId: uuid`, Body: `CreatePayslipDisputeRequest` (`category: BASE_SALARY \| OVERTIME \| BONUS \| ALLOWANCE \| DEDUCTION`, `content`, `proofUpload?`) | `201 Created` with `PayslipDisputeDto` (`PENDING_RESPONSE`) | `createPayslipDispute` in `hr-payroll.service.ts` |
| Respond to payslip dispute (`SCR-HRM-06C`) | `POST /api/hr/payslips/disputes/{disputeId}/respond` | Path: `disputeId: uuid`, Body: `RespondPayslipDisputeRequest` (`status`, `adminResponse`, `calculationNote?`, `adjustmentNote?`, `adjustmentAmount?`, `adjustmentType?`) (`ADMIN`, maker-checker) | `200 OK` with `PayslipDisputeDto` | `respondPayslipDispute` in `hr-payroll.service.ts` |
| Resend single employee payslip via Zalo (`SCR-HRM-06C/L/M`) | `POST /api/hr/payslips/{entryId}/resend-zalo` | Path: `entryId: uuid` (`ADMIN` only) | `200 OK` with `ZaloSendResultDto` | `resendSinglePayslipZalo` in `hr-payroll.service.ts` |
