import { privateClient } from '@/api/client'
import type { components } from '@/contract/api-contract'
import {
  extractHrApiErrorMessage,
  formatVietnamShortDateTime,
  formatVietnamTime,
} from './hr-employees.service'
import { HR_REQUEST_ACTION_LABELS } from './hr-requests.constants'
import type {
  CreateHrRequestInput,
  HrApprovalHistoryEntry,
  HrRequestFilterQuery,
  HrRequestOption,
  HrRequestOptions,
  HrRequestRecord,
  HrRequestsSummaryData,
  HrRequestStatus,
  HrRequestType,
  ReviewHrRequestInput,
} from './hr-requests.type'

type HrRequestDto = components['schemas']['HrRequestDto']
type HrRequestListDto = components['schemas']['HrRequestListDto']
type HrRequestOptionsDto = components['schemas']['HrRequestOptionsDto']
type HrRequestOptionDto = components['schemas']['HrRequestOptionDto']
type HrRequestHistoryDto = components['schemas']['HrRequestHistoryDto']
type CreateHrRequestRequest = components['schemas']['CreateHrRequestRequest']
type HrRequestReviewRequest = components['schemas']['HrRequestReviewRequest']
type BackendHrRequestType = NonNullable<components['schemas']['HrRequestType']>
type BackendHrRequestStatus = NonNullable<components['schemas']['HrRequestStatus']>

const TYPE_FROM_API: Record<BackendHrRequestType, HrRequestType> = {
  SHIFT_SWAP: 'shift_swap',
  LEAVE: 'leave',
  ATTENDANCE_EXPLANATION: 'attendance_explanation',
}

const TYPE_TO_API: Record<HrRequestType, BackendHrRequestType> = {
  shift_swap: 'SHIFT_SWAP',
  leave: 'LEAVE',
  attendance_explanation: 'ATTENDANCE_EXPLANATION',
}

const STATUS_FROM_API: Record<BackendHrRequestStatus, HrRequestStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

function shortDayMonth(iso: string): string {
  const [, month, day] = iso.split('-')
  return month && day ? `${day}/${month}` : iso
}

function timeOf(value?: string | null): string {
  return formatVietnamTime(value)
}

function formatDateTime(iso?: string | null): string {
  return formatVietnamShortDateTime(iso)
}

function shiftLabel(shiftNo: number): string {
  return `Ca ${shiftNo}`
}

function mapHistory(entry: HrRequestHistoryDto): HrApprovalHistoryEntry {
  const actionLabel = HR_REQUEST_ACTION_LABELS[entry.action] ?? entry.action
  const note = entry.note?.trim()
  return {
    id: entry.id,
    timestamp: formatDateTime(entry.occurredAt),
    message: note ? `${entry.actorName} ${actionLabel} - ${note}` : `${entry.actorName} ${actionLabel}.`,
  }
}

export function mapHrRequest(dto: HrRequestDto): HrRequestRecord {
  const currentShiftLabel = shiftLabel(dto.shiftNo)
  const targetShiftLabel = dto.targetShiftNo ? shiftLabel(dto.targetShiftNo) : undefined
  const dateShiftSummary = `${shortDayMonth(dto.applyDate)} · ${currentShiftLabel}${
    targetShiftLabel ? ` → ${targetShiftLabel}` : ''
  }`
  const hasCorrectedTime = Boolean(dto.correctCheckInAt || dto.correctCheckOutAt)
  const replacementName = dto.replacementName?.trim() || 'Không áp dụng'
  return {
    id: dto.id,
    code: dto.requestCode,
    type: TYPE_FROM_API[dto.type],
    requesterCode: dto.requesterCode,
    requesterName: dto.requesterName,
    monthKey: monthKeyOf(dto.applyDate),
    applyDate: formatDate(dto.applyDate),
    dateShiftSummary,
    currentShiftLabel,
    targetShiftLabel,
    correctTimeRange: hasCorrectedTime
      ? `${timeOf(dto.correctCheckInAt)} – ${timeOf(dto.correctCheckOutAt)}`
      : undefined,
    replacementName,
    replacementLabel: dto.replacementEmployeeId ? replacementName : undefined,
    reason: dto.reason,
    attachmentLabel: dto.proofUrl ? 'Ảnh minh chứng đã tải lên' : undefined,
    proofUrl: dto.proofUrl ?? undefined,
    status: STATUS_FROM_API[dto.status],
    isOwnedByCurrentUser: dto.isOwnedByCurrentUser || dto.isRequestedByCurrentUser,
    reviewNote: dto.reviewNote ?? undefined,
    reviewedBy: dto.reviewedBy ?? undefined,
    reviewedAt: dto.reviewedAt ? formatDateTime(dto.reviewedAt) : undefined,
    history: dto.history.map(mapHistory),
  }
}

function mapOption(option: HrRequestOptionDto): HrRequestOption {
  return {
    value: option.value,
    label: option.label,
    applyDate: option.applyDate ?? undefined,
    shiftNo: option.shiftNo ?? undefined,
  }
}

function buildListParams(scope: 'mine' | 'pending', filter: HrRequestFilterQuery) {
  const month = filter.monthKey && filter.monthKey !== 'all' ? filter.monthKey : undefined
  return {
    scope,
    search: filter.search?.trim() || undefined,
    month,
    status: filter.status ? filter.status.toUpperCase() : undefined,
    page: 1,
    pageSize: 50,
  }
}

export async function getHrRequestsSummary(
  mineFilter: HrRequestFilterQuery = {},
  approvalFilter: HrRequestFilterQuery = {},
  includeApproval = true,
): Promise<HrRequestsSummaryData> {
  try {
    const mineResponse = await privateClient.get<HrRequestListDto>('/hr/requests', {
      params: buildListParams('mine', mineFilter),
    })
    const approvalResponse = includeApproval
      ? await privateClient.get<HrRequestListDto>('/hr/requests', {
          params: buildListParams('pending', approvalFilter),
        })
      : null

    return {
      myRequests: mineResponse.data.myRequests.map(mapHrRequest),
      approvalQueue: approvalResponse?.data.approvalQueue.map(mapHrRequest) ?? [],
      myCount: mineResponse.data.myCount,
      pendingApprovalCount: mineResponse.data.pendingApprovalCount,
    }
  } catch (error) {
    throw new Error(extractHrApiErrorMessage(error, 'Không thể tải danh sách đơn xét duyệt.'))
  }
}

export async function getHrRequestOptions(): Promise<HrRequestOptions> {
  try {
    const response = await privateClient.get<HrRequestOptionsDto>('/hr/requests/options')
    return {
      employees: response.data.employees.map(mapOption),
      workRecords: response.data.workRecords.map(mapOption),
    }
  } catch (error) {
    throw new Error(extractHrApiErrorMessage(error, 'Không thể tải dữ liệu gợi ý cho đơn.'))
  }
}

export async function createHrRequest(
  input: CreateHrRequestInput,
): Promise<HrRequestRecord> {
  const reason = input.reason.trim()
  if (!reason) {
    throw new Error('Vui lòng nhập lý do gửi yêu cầu.')
  }
  const body: CreateHrRequestRequest = {
    type: TYPE_TO_API[input.type],
    applyDate: input.applyDate,
    shiftNo: input.shiftNo,
    targetShiftNo: input.targetShiftNo ?? null,
    replacementEmployeeId: input.replacementEmployeeId ?? null,
    correctCheckInAt: input.correctCheckInAt ?? null,
    correctCheckOutAt: input.correctCheckOutAt ?? null,
    reason,
    proofUpload: input.proofUpload ?? null,
  }
  try {
    const response = await privateClient.post<HrRequestDto>('/hr/requests', body)
    return mapHrRequest(response.data)
  } catch (error) {
    throw new Error(extractHrApiErrorMessage(error, 'Không thể gửi yêu cầu. Vui lòng thử lại.'))
  }
}

export async function cancelHrRequest(requestId: string): Promise<HrRequestRecord> {
  try {
    const response = await privateClient.post<HrRequestDto>(
      `/hr/requests/${encodeURIComponent(requestId)}/cancel`,
    )
    return mapHrRequest(response.data)
  } catch (error) {
    throw new Error(extractHrApiErrorMessage(error, 'Không thể hủy đơn. Vui lòng thử lại.'))
  }
}

export async function reviewHrRequest(
  input: ReviewHrRequestInput,
): Promise<HrRequestRecord> {
  const note = input.note.trim()
  if (!note) {
    throw new Error('Vui lòng nhập ghi chú xét duyệt trước khi xác nhận.')
  }
  const body: HrRequestReviewRequest = {
    status: input.decision === 'approved' ? 'APPROVED' : 'REJECTED',
    note,
  }
  try {
    const response = await privateClient.post<HrRequestDto>(
      `/hr/requests/${encodeURIComponent(input.requestId)}/review`,
      body,
    )
    return mapHrRequest(response.data)
  } catch (error) {
    throw new Error(extractHrApiErrorMessage(error, 'Không thể cập nhật trạng thái đơn.'))
  }
}
