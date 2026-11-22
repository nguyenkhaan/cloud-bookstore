import type {
  CashVarianceReport,
  PayrollEmployeeRow,
  PayrollPeriodRecord,
  PayrollPeriodStatus,
  PayslipAdvanceVoucher,
  PayslipAttendanceDay,
  PayslipDisputeCategory,
  PayslipDisputeRecord,
  PayslipDisputeStatus,
  PayslipOvertimeEntry,
  PayslipPeriodOption,
  ZaloSendStatus,
} from './hr-payroll.type'

export const PAYROLL_PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: '10/2026', label: 'Tháng 10/2026' },
  { value: '09/2026', label: 'Tháng 09/2026' },
  { value: '08/2026', label: 'Tháng 08/2026' },
]

export const PAYROLL_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  draft: 'Bản nháp',
  approved_unpaid: 'Đã duyệt & Khóa',
  partially_paid: 'Đã duyệt & Khóa',
  settled: 'Đã duyệt & Khóa',
}

export const PAYOUT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả chi trả' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'partial', label: 'Thanh toán một phần' },
]

export const PAYROLL_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'approved_unpaid', label: 'Đã duyệt & Khóa' },
]

export const ZALO_STATUS_LABELS: Record<ZaloSendStatus, string> = {
  sent: 'Đã gửi',
  unsent: 'Chưa gửi',
  failed: 'Lỗi gửi',
}

export const PAYSLIP_DISPUTE_CATEGORY_OPTIONS: {
  value: PayslipDisputeCategory
  label: string
}[] = [
  { value: 'allowance', label: 'Phụ cấp' },
  { value: 'base_salary', label: 'Lương công' },
  { value: 'overtime', label: 'OT' },
  { value: 'bonus', label: 'Thưởng' },
  { value: 'deduction', label: 'Khấu trừ' },
]

export const PAYSLIP_DISPUTE_CATEGORY_LABELS: Record<
  PayslipDisputeCategory,
  string
> = {
  base_salary: 'Lương công',
  overtime: 'OT',
  bonus: 'Thưởng',
  allowance: 'Phụ cấp',
  deduction: 'Khấu trừ',
}

export const PAYSLIP_DISPUTE_STATUS_LABELS: Record<
  PayslipDisputeStatus,
  string
> = {
  pending_response: 'Chờ quản lý phản hồi',
  explained: 'Đã giải trình',
  approved_next_period: 'Đã duyệt bù trừ kỳ sau',
}

export const ADJUSTMENT_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Phụ cấp', label: 'Phụ cấp' },
  { value: 'Lương công', label: 'Lương công' },
  { value: 'OT', label: 'OT' },
  { value: 'Thưởng', label: 'Thưởng' },
  { value: 'Khấu trừ', label: 'Khấu trừ' },
]

export const ADJUSTMENT_TYPE_OPTIONS: {
  value: 'add_next_period' | 'deduct_next_period'
  label: string
}[] = [
  { value: 'add_next_period', label: 'Cộng bù vào lương kỳ sau' },
  { value: 'deduct_next_period', label: 'Khấu trừ vào lương kỳ sau' },
]

export const ADJUSTMENT_TARGET_PERIOD_OPTIONS: { value: string; label: string }[] =
  [
    { value: '10/2026', label: '10/2026' },
    { value: '11/2026', label: '11/2026' },
  ]

export function formatVnd(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0
  const sign = safeAmount < 0 ? '-' : ''
  const absFormatted = Math.abs(safeAmount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${absFormatted}đ`
}

const PHONG_CASH_VARIANCE: CashVarianceReport = {
  voucherCode: 'CASH-0925-02',
  shiftLabel: 'Ca POS ngày 25/09/2026',
  reconciliationResult: 'Đã đối soát · Không khấu trừ lương',
  employeeLabel: 'Trần Hoàng Phong · NV-0002',
  initialDifference: 'Thiếu 50.000đ so với số tiền hệ thống',
  verifiedCause: 'Một phiếu thu tiền mặt chưa được ghi nhận khi đóng ca.',
  resolutionNote: 'Đã bổ sung chứng từ và đối chiếu đủ tiền.',
  approverName: 'Nguyễn Minh Anh',
  approverRole: 'Quản trị viên',
  approvedAt: '25/09/2026, 21:15',
  payrollImpact: '0đ · Không đưa khoản lệch quỹ này vào khấu trừ.',
  internalDeductionNote: 'Khấu trừ nội bộ 100.000đ chỉ gồm tạm ứng ADV-0921.',
}

function createBaseEmployeeRows(mode: 'settled' | 'unpaid'): PayrollEmployeeRow[] {
  const isPaid = mode === 'settled'
  return [
    {
      id: 'NV-0002',
      employeeCode: 'NV-0002',
      fullName: 'Trần Hoàng Phong',
      roleLabel: 'Nhân viên · Thu ngân',
      standardHours: 160,
      hourlyRate: 30000,
      baseSalary: 4800000,
      overtimeHours: 4,
      overtimeAmount: 180000,
      overtimeFormula: '4h × 30.000đ × 1,5',
      bonus: 300000,
      allowance: 200000,
      deduction: 100000,
      mandatoryContribution: 0,
      taxAmount: 0,
      netPay: 5380000,
      payoutStatus: isPaid ? 'paid' : 'unpaid',
      zaloStatus: isPaid ? 'sent' : 'unsent',
      zaloSentAt: isPaid ? '03/10/2026, 09:35' : undefined,
      zaloLinked: true,
      bankAccount: 'Vietcombank •••• 2802',
      payoutDate: isPaid ? '03/10/2026' : undefined,
      payoutMethod: isPaid ? 'bank_transfer' : undefined,
      transactionRef: isPaid ? 'BANK-PAY-20261003-001' : undefined,
      bonusItems: [
        { label: 'Thưởng hiệu suất phục vụ tháng 09', amount: 300000 },
      ],
      allowanceItems: [
        { label: 'Ăn ca', amount: 100000 },
        { label: 'Đi lại', amount: 100000 },
      ],
      deductionItems: [
        { label: 'Tạm ứng ADV-0921', amount: 100000, voucherCode: 'ADV-0921' },
      ],
      contributionNote:
        'BHXH / BHYT / BHTN: 0đ · Thuế TNCN: 0đ · Hồ sơ minh họa cần đối chiếu trước khi chốt.',
      cashVarianceReport: PHONG_CASH_VARIANCE,
    },
    {
      id: 'NV-0003',
      employeeCode: 'NV-0003',
      fullName: 'Lê Minh Khoa',
      roleLabel: 'Quản lý kho',
      standardHours: 160,
      hourlyRate: 35000,
      baseSalary: 5600000,
      overtimeHours: 6,
      overtimeAmount: 315000,
      overtimeFormula: '6h × 35.000đ × 1,5',
      bonus: 200000,
      allowance: 300000,
      deduction: 50000,
      mandatoryContribution: 0,
      taxAmount: 0,
      netPay: 6365000,
      payoutStatus: isPaid ? 'paid' : 'unpaid',
      zaloStatus: isPaid ? 'sent' : 'unsent',
      zaloSentAt: isPaid ? '03/10/2026, 09:35' : undefined,
      zaloLinked: true,
      bankAccount: 'Techcombank •••• 4419',
      payoutDate: isPaid ? '03/10/2026' : undefined,
      payoutMethod: isPaid ? 'bank_transfer' : undefined,
      transactionRef: isPaid ? 'BANK-PAY-20261003-001' : undefined,
      bonusItems: [{ label: 'Thưởng kiểm kê đúng hạn', amount: 200000 }],
      allowanceItems: [
        { label: 'Ăn ca', amount: 150000 },
        { label: 'Trách nhiệm kho', amount: 150000 },
      ],
      deductionItems: [
        { label: 'Tạm ứng ADV-0918', amount: 50000, voucherCode: 'ADV-0918' },
      ],
      contributionNote:
        'BHXH / BHYT / BHTN: 0đ · Thuế TNCN: 0đ · Hồ sơ minh họa cần đối chiếu trước khi chốt.',
    },
    {
      id: 'NV-0004',
      employeeCode: 'NV-0004',
      fullName: 'Nguyễn Thanh Tâm',
      roleLabel: 'Quản trị viên',
      standardHours: 176,
      hourlyRate: 70000,
      baseSalary: 12320000,
      overtimeHours: 0,
      overtimeAmount: 0,
      overtimeFormula: '0h × 70.000đ × 1,5',
      bonus: 500000,
      allowance: 1000000,
      deduction: 0,
      mandatoryContribution: 0,
      taxAmount: 0,
      netPay: 13820000,
      payoutStatus: isPaid ? 'paid' : 'unpaid',
      zaloStatus: 'unsent',
      zaloLinked: true,
      bankAccount: 'ACB •••• 9011',
      payoutDate: isPaid ? '03/10/2026' : undefined,
      payoutMethod: isPaid ? 'bank_transfer' : undefined,
      transactionRef: isPaid ? 'BANK-PAY-20261003-001' : undefined,
      bonusItems: [{ label: 'Thưởng vận hành cửa hàng', amount: 500000 }],
      allowanceItems: [
        { label: 'Quản lý & Điều hành', amount: 700000 },
        { label: 'Đi lại', amount: 300000 },
      ],
      deductionItems: [],
      contributionNote:
        'BHXH / BHYT / BHTN: 0đ · Thuế TNCN: 0đ · Hồ sơ minh họa cần đối chiếu trước khi chốt.',
    },
    {
      id: 'NV-0005',
      employeeCode: 'NV-0005',
      fullName: 'Lê Mai Linh',
      roleLabel: 'Nhân viên · Thu ngân',
      standardHours: 160,
      hourlyRate: 30000,
      baseSalary: 4800000,
      overtimeHours: 4,
      overtimeAmount: 180000,
      overtimeFormula: '4h × 30.000đ × 1,5',
      bonus: 200000,
      allowance: 200000,
      deduction: 95000,
      mandatoryContribution: 0,
      taxAmount: 0,
      netPay: 5285000,
      payoutStatus: isPaid ? 'paid' : 'unpaid',
      zaloStatus: isPaid ? 'failed' : 'unsent',
      zaloErrorReason: isPaid ? 'quá thời gian' : undefined,
      zaloLinked: true,
      bankAccount: 'MB Bank •••• 7734',
      payoutDate: isPaid ? '03/10/2026' : undefined,
      payoutMethod: isPaid ? 'bank_transfer' : undefined,
      transactionRef: isPaid ? 'BANK-PAY-20261003-001' : undefined,
      bonusItems: [{ label: 'Thưởng doanh số quầy sách', amount: 200000 }],
      allowanceItems: [
        { label: 'Ăn ca', amount: 100000 },
        { label: 'Đi lại', amount: 100000 },
      ],
      deductionItems: [{ label: 'Đi muộn 2 ca sáng', amount: 95000 }],
      contributionNote:
        'BHXH / BHYT / BHTN: 0đ · Thuế TNCN: 0đ · Hồ sơ minh họa cần đối chiếu trước khi chốt.',
    },
  ]
}

export function createInitialPayrollPeriods(): PayrollPeriodRecord[] {
  return [
    {
      periodKey: '09/2026',
      payrollCode: 'PAY-202609',
      periodRangeLabel: 'Kỳ 01–30/09/2026',
      attendanceSourceCode: 'ATT-202609',
      status: 'settled',
      approvedDate: '02/10/2026',
      approvedAt: '02/10/2026 · 14:20',
      approvedBy: 'Nguyễn Minh Anh',
      payoutDate: '03/10/2026',
      payoutMethod: 'bank_transfer',
      transactionRef: 'BANK-PAY-20261003-001',
      payoutConfirmedBy: 'Nguyễn Minh Anh',
      rows: createBaseEmployeeRows('settled'),
      batches: [
        {
          id: 'BATCH-202609-1',
          batchNumber: 1,
          method: 'bank_transfer',
          transactionRef: 'BANK-PAY-20261003-001',
          payoutDate: '03/10/2026',
          amount: 30850000,
          employeeNames: [
            'Trần Hoàng Phong',
            'Lê Minh Khoa',
            'Nguyễn Thanh Tâm',
            'Lê Mai Linh',
          ],
          confirmedBy: 'Nguyễn Minh Anh',
        },
      ],
      history: [
        {
          id: 'HIS-09-1',
          timestamp: '01/10/2026 · 09:00',
          actor: 'Nguyễn Thanh Tâm · Admin',
          event: 'Khởi tạo từ ATT-202609 đã khóa',
          result: '4 nhân viên · 30.850.000đ',
        },
        {
          id: 'HIS-09-2',
          timestamp: '02/10/2026 · 14:20',
          actor: 'Nguyễn Minh Anh · Admin',
          event: 'Duyệt & Chốt bảng lương',
          result: 'Đã khóa · Chi phí được phê duyệt',
        },
        {
          id: 'HIS-09-3',
          timestamp: '03/10/2026 · 09:30',
          actor: 'Nguyễn Minh Anh · Admin',
          event: 'Xác nhận chuyển khoản',
          result: 'BANK-PAY-20261003-001',
        },
      ],
    },
    {
      periodKey: '10/2026',
      payrollCode: 'PAY-202610',
      periodRangeLabel: 'Kỳ 01–31/10/2026',
      attendanceSourceCode: 'ATT-202610',
      status: 'draft',
      rows: createBaseEmployeeRows('unpaid'),
      batches: [],
      history: [
        {
          id: 'HIS-10-1',
          timestamp: '01/11/2026 · 09:00',
          actor: 'Nguyễn Thanh Tâm · Admin',
          event: 'Khởi tạo từ ATT-202610',
          result: '4 nhân viên · 30.850.000đ',
        },
      ],
    },
    {
      periodKey: '08/2026',
      payrollCode: 'PAY-202608',
      periodRangeLabel: 'Kỳ 01–31/08/2026',
      attendanceSourceCode: 'ATT-202608',
      status: 'approved_unpaid',
      approvedDate: '02/09/2026',
      approvedAt: '02/09/2026 · 14:20',
      approvedBy: 'Nguyễn Minh Anh',
      rows: createBaseEmployeeRows('unpaid'),
      batches: [],
      history: [
        {
          id: 'HIS-08-1',
          timestamp: '01/09/2026 · 09:00',
          actor: 'Nguyễn Thanh Tâm · Admin',
          event: 'Khởi tạo từ ATT-202608 đã khóa',
          result: '4 nhân viên · 30.850.000đ',
        },
        {
          id: 'HIS-08-2',
          timestamp: '02/09/2026 · 14:20',
          actor: 'Nguyễn Minh Anh · Admin',
          event: 'Duyệt & Chốt bảng lương',
          result: 'Đã khóa · Chờ chi trả',
        },
      ],
    },
  ]
}

export const PHONG_ATTENDANCE_DAYS_092026: PayslipAttendanceDay[] = [
  { date: '01/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '02/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '03/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '04/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '07/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '08/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '09/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '10/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '11/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '14/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '15/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '16/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '17/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '18/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '21/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '22/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '23/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '24/09/2026', checkInOut: '08:00 / 19:00', standardHours: 8, otHours: 2 },
  { date: '25/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
  { date: '28/09/2026', checkInOut: '08:00 / 19:00', standardHours: 8, otHours: 2 },
]

export const PHONG_OVERTIME_ENTRIES_092026: PayslipOvertimeEntry[] = [
  { date: '24/09/2026', timeRange: '17:00-19:00', hours: 2, amount: 90000 },
  { date: '28/09/2026', timeRange: '17:00-19:00', hours: 2, amount: 90000 },
]

export const PHONG_ADVANCE_VOUCHER_092026: PayslipAdvanceVoucher = {
  voucherCode: 'ADV-0921',
  employeeLabel: 'Trần Hoàng Phong · NV-0002',
  amount: 100000,
  receivedDate: '21/09/2026',
  payoutMethod: 'Tiền mặt · PC-20260921-003',
  approverLabel: 'Nguyễn Minh Anh · Quản trị viên',
  content: 'Tạm ứng nội bộ, khấu trừ trong lương tháng 09/2026.',
  attachmentName: 'bien-nhan-ADV-0921.pdf · Đã xác nhận nhận tiền',
  footnote:
    'Khấu trừ trên phiếu PAY-202609-NV0002: -100.000đ. Chứng từ này không tạo khoản chi lần hai.',
}

export const PAYSLIP_PERIOD_OPTIONS: PayslipPeriodOption[] = [
  { periodKey: '10/2026', status: 'pending_payout', statusShortLabel: 'Chờ trả' },
  { periodKey: '09/2026', status: 'paid', statusShortLabel: 'Đã trả' },
  { periodKey: '08/2026', status: 'paid', statusShortLabel: 'Đã trả' },
  { periodKey: '07/2026', status: 'paid', statusShortLabel: 'Đã trả' },
]

export function createInitialPayslipDisputes(): PayslipDisputeRecord[] {
  return [
    {
      id: 'DC-0926-003',
      payslipCode: 'PAY-202609-NV0002',
      category: 'allowance',
      categoryLabel: 'Phụ cấp',
      status: 'pending_response',
      statusLabel: 'Chờ quản lý phản hồi',
      content:
        'Kiểm tra lại khoản phụ cấp trách nhiệm ca tối tháng 09/2026 (200.000đ).',
      submittedAt: '03/10/2026, 15:10',
    },
    {
      id: 'DC-0926-002',
      payslipCode: 'PAY-202609-NV0002',
      category: 'base_salary',
      categoryLabel: 'Giờ công',
      status: 'explained',
      statusLabel: 'Đã giải trình',
      content:
        'Đối chiếu lại tổng giờ công tiêu chuẩn ngày 15/09 có nghỉ bù giữa ca.',
      submittedAt: '03/10/2026, 11:05',
      adminName: 'Nguyễn Minh Anh',
      adminRole: 'Quản trị viên',
      respondedAt: '03/10/2026, 16:45',
      adminResponse:
        'Đã kiểm tra bảng công ATT-202609: ca ngày 15/09 có nghỉ giữa ca 1 giờ đúng quy định, tổng 160 giờ chuẩn chính xác.',
      adjustmentNote: 'Phiếu 09/2026 giữ nguyên 5.380.000đ.',
    },
    {
      id: 'DC-0926-001',
      payslipCode: 'PAY-202609-NV0002',
      category: 'overtime',
      categoryLabel: 'OT',
      status: 'approved_next_period',
      statusLabel: 'Đã duyệt bù trừ kỳ sau',
      content:
        'Bạn đề nghị bổ sung 2 giờ OT ngày 28/09/2026, có ảnh chấm công kèm theo.',
      attachmentName: 'cham-cong-2809.png',
      attachmentSize: '284 KB',
      submittedAt: '03/10/2026, 09:50',
      adminName: 'Nguyễn Minh Anh',
      adminRole: 'Quản trị viên',
      respondedAt: '04/10/2026, 10:20',
      adminResponse:
        'Đã xác minh thêm 2 giờ OT. Duyệt bù trừ +90.000đ vào kỳ 10/2026 theo ADJ-202610-002.',
      calculationNote: '2 giờ × 30.000đ × 1,5 = 90.000đ',
      adjustmentNote: 'Phiếu 09/2026 đã trả giữ nguyên 5.380.000đ.',
    },
  ]
}
