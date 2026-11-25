import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'

export type HrRequestType = 'shift_swap' | 'leave' | 'attendance_explanation'

export type HrRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface HrApprovalHistoryEntry {
  id: string
  timestamp: string
  message: string
}

export interface HrRequestRecord {
  id: string
  code: string
  type: HrRequestType
  requesterCode: string
  requesterName: string
  monthKey: string
  applyDate: string
  dateShiftSummary: string
  currentShiftLabel: string
  targetShiftLabel?: string
  correctTimeRange?: string
  replacementName: string
  replacementLabel?: string
  reason: string
  attachmentLabel?: string
  proofUrl?: string
  status: HrRequestStatus
  isOwnedByCurrentUser: boolean
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  history: HrApprovalHistoryEntry[]
}

export interface HrRequestFilterQuery {
  search?: string
  monthKey?: string
  status?: HrRequestStatus | ''
}

export interface CreateHrRequestInput {
  type: HrRequestType
  applyDate: string
  shiftNo: number
  targetShiftNo?: number | null
  replacementEmployeeId?: string | null
  correctCheckInAt?: string | null
  correctCheckOutAt?: string | null
  reason: string
  proofUpload?: CloudinaryUploadResultRequest | null
}

export interface ReviewHrRequestInput {
  requestId: string
  decision: 'approved' | 'rejected'
  note: string
}

export interface HrRequestsSummaryData {
  myRequests: HrRequestRecord[]
  approvalQueue: HrRequestRecord[]
  myCount: number
  pendingApprovalCount: number
}

export interface HrRequestOption {
  value: string
  label: string
  applyDate?: string | null
  shiftNo?: number | null
}

export interface HrRequestOptions {
  employees: HrRequestOption[]
  workRecords: HrRequestOption[]
}
