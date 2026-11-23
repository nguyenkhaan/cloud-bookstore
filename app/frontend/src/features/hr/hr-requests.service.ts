import { createInitialHrRequests } from './hr-requests.mock'
import type {
  CreateHrRequestInput,
  HrRequestFilterQuery,
  HrRequestRecord,
  HrRequestsSummaryData,
  ReviewHrRequestInput,
} from './hr-requests.type'

let requestStore: HrRequestRecord[] = createInitialHrRequests()

export function resetHrRequestsStore(): void {
  requestStore = createInitialHrRequests()
}

function matchesFilter(
  item: HrRequestRecord,
  filter: HrRequestFilterQuery,
): boolean {
  if (filter.monthKey && filter.monthKey !== 'all' && item.monthKey !== filter.monthKey) {
    return false
  }
  if (filter.status && item.status !== filter.status) {
    return false
  }
  const search = filter.search?.trim().toLowerCase() ?? ''
  if (search) {
    const haystack = `${item.code} ${item.reason} ${item.requesterName} ${item.replacementName}`.toLowerCase()
    if (!haystack.includes(search)) return false
  }
  return true
}

function formatNowTimestamp(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day}/${month} · ${hours}:${minutes}`
}

function normalizeApplyDate(raw: string): {
  displayDate: string
  shortDayMonth: string
  monthKey: string
} {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return {
      displayDate: `${day}/${month}/${year}`,
      shortDayMonth: `${day}/${month}`,
      monthKey: `${year}-${month}`,
    }
  }
  const vnMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim())
  if (vnMatch) {
    const [, day, month, year] = vnMatch
    return {
      displayDate: `${day}/${month}/${year}`,
      shortDayMonth: `${day}/${month}`,
      monthKey: `${year}-${month}`,
    }
  }
  return {
    displayDate: '20/10/2026',
    shortDayMonth: '20/10',
    monthKey: '2026-10',
  }
}

function shortShiftName(label: string): string {
  const lowered = label.toLowerCase()
  if (lowered.includes('sáng')) return 'Sáng'
  if (lowered.includes('chiều')) return 'Chiều'
  if (lowered.includes('tối')) return 'Tối'
  return label.split('·')[0]?.trim() || label
}

function extractReplacementName(label?: string): string {
  if (!label) return 'Không áp dụng'
  return label.split('·')[0]?.trim() || label
}

function generateRequestCode(): string {
  const maxSeq = requestStore.reduce((max, item) => {
    const match = /-(\d+)$/.exec(item.code)
    const seq = match ? Number.parseInt(match[1], 10) : 0
    return Number.isFinite(seq) && seq > max ? seq : max
  }, 24)
  return `HR-20261018-${String(maxSeq + 1).padStart(3, '0')}`
}

export async function getHrRequestsSummary(
  mineFilter: HrRequestFilterQuery = {},
  approvalFilter: HrRequestFilterQuery = {},
  includeApproval = true,
): Promise<HrRequestsSummaryData> {
  const allMine = requestStore.filter((item) => item.isOwnedByCurrentUser)
  const allApprovalQueue = requestStore.filter(
    (item) => !item.isOwnedByCurrentUser || item.id === 'HR-20261018-024' || item.status === 'pending',
  )

  return {
    myRequests: allMine.filter((item) => matchesFilter(item, mineFilter)),
    approvalQueue: includeApproval
      ? allApprovalQueue.filter((item) => matchesFilter(item, approvalFilter))
      : [],
    myCount: allMine.length,
    pendingApprovalCount: includeApproval
      ? allApprovalQueue.filter((item) => item.status === 'pending').length
      : 0,
  }
}

export async function createHrRequest(
  input: CreateHrRequestInput,
): Promise<HrRequestRecord> {
  const reason = input.reason.trim()
  if (!reason) {
    throw new Error('Vui lòng nhập lý do gửi yêu cầu.')
  }

  const { displayDate, shortDayMonth, monthKey } = normalizeApplyDate(
    input.applyDate,
  )
  const code = generateRequestCode()
  const replacementName =
    input.type === 'attendance_explanation'
      ? 'Không áp dụng'
      : extractReplacementName(input.replacementLabel)

  let dateShiftSummary = `${shortDayMonth} · ${input.currentShiftLabel.split('·')[0]?.trim() ?? input.currentShiftLabel}`
  if (input.type === 'shift_swap' && input.targetShiftLabel) {
    dateShiftSummary = `${shortDayMonth} · ${shortShiftName(input.currentShiftLabel)} → ${shortShiftName(input.targetShiftLabel)}`
  }

  const requesterName = input.requesterName?.trim() || 'Trần Hoàng Phong'
  const requesterCode = input.requesterCode?.trim() || 'NV-0002'

  const validationNotice =
    input.type === 'shift_swap' && replacementName !== 'Không áp dụng'
      ? `Ca thay thế không trùng giờ. ${replacementName} đã xác nhận đồng ý.`
      : input.type === 'leave' && replacementName !== 'Không áp dụng'
        ? `Đã kiểm tra lịch ca của ${replacementName}, không trùng giờ.`
        : 'Đã ghi nhận thông tin giải trình và tệp chứng từ.'

  const created: HrRequestRecord = {
    id: code,
    code,
    type: input.type,
    requesterCode,
    requesterName,
    monthKey,
    applyDate: displayDate,
    dateShiftSummary,
    currentShiftLabel: input.currentShiftLabel,
    targetShiftLabel: input.targetShiftLabel,
    correctTimeRange: input.correctTimeRange?.trim() || undefined,
    replacementName,
    replacementLabel: input.replacementLabel,
    reason,
    attachmentLabel: input.attachmentLabel?.trim() || undefined,
    validationNotice,
    status: 'pending',
    isOwnedByCurrentUser: true,
    history: [
      {
        id: `hist-${code}-1`,
        timestamp: formatNowTimestamp(),
        message: `${requesterName} tạo yêu cầu ngày ${shortDayMonth}.`,
      },
      {
        id: `hist-${code}-2`,
        timestamp: '',
        message: `Lý do: ${reason}`,
      },
      {
        id: `hist-${code}-3`,
        timestamp: '',
        message: 'Chờ Quản trị viên xét duyệt.',
      },
    ],
  }

  requestStore = [created, ...requestStore]
  return created
}

export async function reviewHrRequest(
  input: ReviewHrRequestInput,
): Promise<HrRequestRecord> {
  const note = input.note.trim()
  if (!note) {
    throw new Error('Vui lòng nhập ghi chú xét duyệt trước khi xác nhận.')
  }

  const index = requestStore.findIndex((item) => item.id === input.requestId)
  if (index < 0) {
    throw new Error('Không tìm thấy đơn cần xét duyệt.')
  }

  const existing = requestStore[index]
  const timestamp = formatNowTimestamp()
  const actionText =
    input.decision === 'approved' ? 'đã phê duyệt yêu cầu' : 'đã từ chối yêu cầu'

  const updated: HrRequestRecord = {
    ...existing,
    status: input.decision,
    reviewNote: note,
    reviewedBy: input.reviewerName,
    reviewedAt: timestamp,
    history: [
      ...existing.history,
      {
        id: `hist-${existing.code}-${existing.history.length + 1}`,
        timestamp,
        message: `${input.reviewerName} (${input.reviewerRoleLabel}) ${actionText}. Ghi chú: ${note}`,
      },
    ],
  }

  requestStore = requestStore.map((item, idx) => (idx === index ? updated : item))
  return updated
}
