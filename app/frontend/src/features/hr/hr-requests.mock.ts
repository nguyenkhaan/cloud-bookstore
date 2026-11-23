import type {
  HrRequestRecord,
  HrRequestStatus,
  HrRequestType,
} from './hr-requests.type'

export const HR_REQUEST_TYPE_LABELS: Record<HrRequestType, string> = {
  shift_swap: 'Đổi ca làm việc',
  leave: 'Xin nghỉ',
  attendance_explanation: 'Giải trình chấm công',
}

export const HR_REQUEST_TYPE_SHORT_LABELS: Record<HrRequestType, string> = {
  shift_swap: 'Đổi ca',
  leave: 'Xin nghỉ',
  attendance_explanation: 'Giải trình chấm công',
}

export const HR_REQUEST_STATUS_LABELS: Record<HrRequestStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

export const HR_REQUEST_MONTH_OPTIONS = [
  { value: '2026-10', label: 'Tháng 10/2026' },
  { value: '2026-11', label: 'Tháng 11/2026' },
  { value: 'all', label: 'Tất cả tháng' },
]

export const HR_REQUEST_STATUS_OPTIONS: {
  value: HrRequestStatus | ''
  label: string
}[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
]

export const HR_SHIFT_OPTIONS = [
  { value: 'Ca sáng · 08:00–13:00', label: 'Ca sáng · 08:00–13:00' },
  { value: 'Ca chiều · 13:00–18:00', label: 'Ca chiều · 13:00–18:00' },
  { value: 'Ca tối · 18:00–22:30', label: 'Ca tối · 18:00–22:30' },
]

export const HR_ATTENDANCE_MISSING_OPTIONS = [
  {
    value: '18/10 · Ca sáng (Thiếu check-out)',
    label: '18/10 · Ca sáng (Thiếu check-out)',
  },
  {
    value: '17/10 · Ca sáng (Thiếu check-in)',
    label: '17/10 · Ca sáng (Thiếu check-in)',
  },
  {
    value: '14/10 · Ca chiều (Thiếu check-out)',
    label: '14/10 · Ca chiều (Thiếu check-out)',
  },
]

export const HR_REPLACEMENT_STAFF_OPTIONS = [
  { value: 'Lê Mai Linh · NV-0005', label: 'Lê Mai Linh · NV-0005' },
  { value: 'Nguyễn Hoài An · NV-0006', label: 'Nguyễn Hoài An · NV-0006' },
  { value: 'Trần Quốc Bảo · NV-0007', label: 'Trần Quốc Bảo · NV-0007' },
  { value: 'Lê Minh Khoa · NV-0003', label: 'Lê Minh Khoa · NV-0003' },
]

export const INITIAL_HR_REQUESTS: HrRequestRecord[] = [
  {
    id: 'HR-20261018-024',
    code: 'HR-20261018-024',
    type: 'shift_swap',
    requesterCode: 'NV-0002',
    requesterName: 'Trần Hoàng Phong',
    monthKey: '2026-10',
    applyDate: '20/10/2026',
    dateShiftSummary: '20/10 · Sáng → Chiều',
    currentShiftLabel: 'Ca sáng · 08:00–13:00',
    targetShiftLabel: 'Ca chiều · 13:00–18:00',
    replacementName: 'Lê Mai Linh',
    replacementLabel: 'Lê Mai Linh · NV-0005',
    reason: 'Có lịch hẹn khám vào buổi sáng, đã thống nhất đổi ca với Linh.',
    attachmentLabel: 'lich-hen-2010.pdf · 182 KB',
    validationNotice:
      'Ca thay thế không trùng giờ. Lê Mai Linh đã xác nhận đồng ý.',
    status: 'pending',
    isOwnedByCurrentUser: true,
    history: [
      {
        id: 'hist-024-1',
        timestamp: '18/10 · 09:42',
        message: 'Phong tạo yêu cầu đổi ca ngày 20/10.',
      },
      {
        id: 'hist-024-2',
        timestamp: '',
        message: 'Lý do: có lịch hẹn khám buổi sáng.',
      },
      {
        id: 'hist-024-3',
        timestamp: '18/10 · 09:48',
        message: 'Lê Mai Linh xác nhận đồng ý thay ca.',
      },
      {
        id: 'hist-024-4',
        timestamp: '',
        message: 'Chờ Nguyễn Minh Anh (Quản trị viên) xét duyệt.',
      },
    ],
  },
  {
    id: 'HR-20261017-023',
    code: 'HR-20261017-023',
    type: 'attendance_explanation',
    requesterCode: 'NV-0003',
    requesterName: 'Lê Minh Khoa',
    monthKey: '2026-10',
    applyDate: '17/10/2026',
    dateShiftSummary: '17/10 · Ca sáng',
    currentShiftLabel: 'Ca sáng · 08:00–13:00',
    correctTimeRange: '08:00 – 13:05',
    replacementName: 'Không áp dụng',
    reason: 'Hệ thống máy chấm công mất kết nối lúc kết thúc ca sáng.',
    attachmentLabel: 'bien-ban-ban-giao-ca.jpg · 410 KB',
    validationNotice: 'Đã đính kèm chứng từ bàn giao ca sáng ngày 17/10.',
    status: 'pending',
    isOwnedByCurrentUser: false,
    history: [
      {
        id: 'hist-023-1',
        timestamp: '17/10 · 14:15',
        message: 'Khoa gửi giải trình thiếu check-out ca sáng ngày 17/10.',
      },
      {
        id: 'hist-023-2',
        timestamp: '',
        message: 'Chờ Nguyễn Minh Anh (Quản trị viên) xét duyệt.',
      },
    ],
  },
  {
    id: 'HR-20261016-022',
    code: 'HR-20261016-022',
    type: 'leave',
    requesterCode: 'NV-0005',
    requesterName: 'Lê Mai Linh',
    monthKey: '2026-10',
    applyDate: '19/10/2026',
    dateShiftSummary: '19/10 · Ca chiều',
    currentShiftLabel: 'Ca chiều · 13:00–18:00',
    replacementName: 'Nguyễn Hoài An',
    replacementLabel: 'Nguyễn Hoài An · NV-0006',
    reason: 'Xin nghỉ phép 1 ca chiều để giải quyết việc gia đình.',
    attachmentLabel: 'don-xin-nghi-1910.pdf · 96 KB',
    validationNotice: 'Nguyễn Hoài An trống ca chiều 19/10 và sẵn sàng nhận ca.',
    status: 'pending',
    isOwnedByCurrentUser: false,
    history: [
      {
        id: 'hist-022-1',
        timestamp: '16/10 · 16:05',
        message: 'Lê Mai Linh gửi đơn xin nghỉ ca chiều ngày 19/10.',
      },
      {
        id: 'hist-022-2',
        timestamp: '16/10 · 16:18',
        message: 'Nguyễn Hoài An xác nhận nhận ca thay thế.',
      },
      {
        id: 'hist-022-3',
        timestamp: '',
        message: 'Chờ Nguyễn Minh Anh (Quản trị viên) xét duyệt.',
      },
    ],
  },
  {
    id: 'HR-20261012-019',
    code: 'HR-20261012-019',
    type: 'attendance_explanation',
    requesterCode: 'NV-0002',
    requesterName: 'Trần Hoàng Phong',
    monthKey: '2026-10',
    applyDate: '11/10/2026',
    dateShiftSummary: '11/10 · Ca sáng',
    currentShiftLabel: 'Ca sáng · 08:00–13:00',
    correctTimeRange: '07:58 – 13:02',
    replacementName: 'Không áp dụng',
    reason: 'Quên quét vân tay đầu ca do hỗ trợ nhập hàng đầu giờ.',
    attachmentLabel: 'xac-nhan-kho-1110.png · 245 KB',
    status: 'approved',
    isOwnedByCurrentUser: true,
    reviewedBy: 'Nguyễn Minh Anh',
    reviewedAt: '12/10 · 10:15',
    reviewNote: 'Đã đối chiếu camera quầy lúc 07:58, đồng ý cập nhật công.',
    history: [
      {
        id: 'hist-019-1',
        timestamp: '12/10 · 08:30',
        message: 'Phong gửi giải trình chấm công ngày 11/10.',
      },
      {
        id: 'hist-019-2',
        timestamp: '12/10 · 10:15',
        message: 'Nguyễn Minh Anh (Quản trị viên) đã phê duyệt.',
      },
    ],
  },
  {
    id: 'HR-20261005-012',
    code: 'HR-20261005-012',
    type: 'leave',
    requesterCode: 'NV-0002',
    requesterName: 'Trần Hoàng Phong',
    monthKey: '2026-10',
    applyDate: '08/10/2026',
    dateShiftSummary: '08/10 · Ca tối',
    currentShiftLabel: 'Ca tối · 18:00–22:30',
    replacementName: 'Nguyễn Hoài An',
    replacementLabel: 'Nguyễn Hoài An · NV-0006',
    reason: 'Xin nghỉ ca tối tham dự việc riêng của gia đình.',
    status: 'approved',
    isOwnedByCurrentUser: true,
    reviewedBy: 'Nguyễn Minh Anh',
    reviewedAt: '06/10 · 11:20',
    reviewNote: 'Đã sắp xếp Nguyễn Hoài An thay ca tối 08/10.',
    history: [
      {
        id: 'hist-012-1',
        timestamp: '05/10 · 14:10',
        message: 'Phong gửi đơn xin nghỉ ca tối ngày 08/10.',
      },
      {
        id: 'hist-012-2',
        timestamp: '06/10 · 11:20',
        message: 'Nguyễn Minh Anh (Quản trị viên) đã phê duyệt.',
      },
    ],
  },
  {
    id: 'HR-20261002-008',
    code: 'HR-20261002-008',
    type: 'shift_swap',
    requesterCode: 'NV-0002',
    requesterName: 'Trần Hoàng Phong',
    monthKey: '2026-10',
    applyDate: '04/10/2026',
    dateShiftSummary: '04/10 · Ca sáng',
    currentShiftLabel: 'Ca sáng · 08:00–13:00',
    targetShiftLabel: 'Ca chiều · 13:00–18:00',
    replacementName: 'Lê Mai Linh',
    replacementLabel: 'Lê Mai Linh · NV-0005',
    reason: 'Đề xuất đổi ca sáng chủ nhật sang ca chiều.',
    status: 'rejected',
    isOwnedByCurrentUser: true,
    reviewedBy: 'Nguyễn Minh Anh',
    reviewedAt: '02/10 · 17:45',
    reviewNote: 'Cuối tuần thiếu nhân sự quầy sáng, vui lòng giữ nguyên ca.',
    history: [
      {
        id: 'hist-008-1',
        timestamp: '02/10 · 15:00',
        message: 'Phong gửi yêu cầu đổi ca ngày 04/10.',
      },
      {
        id: 'hist-008-2',
        timestamp: '02/10 · 17:45',
        message: 'Nguyễn Minh Anh (Quản trị viên) đã từ chối.',
      },
    ],
  },
  {
    id: 'HR-20261001-004',
    code: 'HR-20261001-004',
    type: 'leave',
    requesterCode: 'NV-0002',
    requesterName: 'Trần Hoàng Phong',
    monthKey: '2026-10',
    applyDate: '01/10/2026',
    dateShiftSummary: '01/10 · Ca chiều',
    currentShiftLabel: 'Ca chiều · 13:00–18:00',
    replacementName: 'Trần Quốc Bảo',
    replacementLabel: 'Trần Quốc Bảo · NV-0007',
    reason: 'Xin nghỉ 1 buổi chiều đi làm giấy tờ cá nhân.',
    status: 'approved',
    isOwnedByCurrentUser: true,
    reviewedBy: 'Nguyễn Minh Anh',
    reviewedAt: '30/09 · 16:00',
    reviewNote: 'Đồng ý nghỉ phép và bàn giao ca cho Bảo.',
    history: [
      {
        id: 'hist-004-1',
        timestamp: '30/09 · 10:20',
        message: 'Phong gửi đơn xin nghỉ ca chiều ngày 01/10.',
      },
      {
        id: 'hist-004-2',
        timestamp: '30/09 · 16:00',
        message: 'Nguyễn Minh Anh (Quản trị viên) đã phê duyệt.',
      },
    ],
  },
]

export function createInitialHrRequests(): HrRequestRecord[] {
  return INITIAL_HR_REQUESTS.map((item) => ({
    ...item,
    history: item.history.map((entry) => ({ ...entry })),
  }))
}
