export type HrRequestType = 'shift_swap' | 'leave' | 'attendance_explanation'

export type HrRequestStatus = 'pending' | 'approved' | 'rejected'

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
  validationNotice?: string
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
  currentShiftLabel: string
  targetShiftLabel?: string
  correctTimeRange?: string
  replacementLabel?: string
  reason: string
  attachmentLabel?: string
  requesterName?: string
  requesterCode?: string
}

export interface ReviewHrRequestInput {
  requestId: string
  decision: 'approved' | 'rejected'
  note: string
  reviewerName: string
  reviewerRoleLabel: string
}

export interface HrRequestsSummaryData {
  myRequests: HrRequestRecord[]
  approvalQueue: HrRequestRecord[]
  myCount: number
  pendingApprovalCount: number
}
