export type InventoryAdjustmentStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED'

export type BookCopyStatus =
  | 'PENDING_RECEIPT'
  | 'AVAILABLE'
  | 'RENTED'
  | 'SOLD'
  | 'INVENTORY_LOCKED'
  | 'DAMAGED'
  | 'LOST'
  | 'DISPOSED'
  | 'DISCONTINUED'

export type InventoryVarianceType = 'MISSING' | 'UNEXPECTED_STATUS' | 'DAMAGED' | 'NONE'

export type AuditLogEntry = {
  id: string
  action: string
  performedBy?: string | null
  performedByName?: string | null
  timestamp: string
  details?: string | null
}

export type InventoryAdjustmentItem = {
  id: string
  requestCode: string
  inventoryCheckId?: string | null
  copyId: string
  copyBarcode: string
  titleName: string
  editionStatement?: string | null
  originalStatus: BookCopyStatus
  requestedStatus: BookCopyStatus
  varianceType: InventoryVarianceType
  status: InventoryAdjustmentStatus
  reason: string
  requestedBy: string
  requestedByName?: string | null
  requestedAt: string
  resolvedBy?: string | null
  resolvedByName?: string | null
  resolvedAt?: string | null
}

export type InventoryAdjustmentDetail = InventoryAdjustmentItem & {
  sellingPrice?: number | null
  rentalRate?: number | null
  conditionGrade?: string | null
  shelfCode?: string | null
  checkCode?: string | null
  checkNote?: string | null
  auditLogs: AuditLogEntry[]
}

export type InventoryAdjustmentStats = {
  total: number
  pendingApproval: number
  approved: number
  applied: number
  rejected: number
  cancelled: number
}

export type PagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type InventoryAdjustmentQuery = {
  page?: number
  pageSize?: number
  status?: InventoryAdjustmentStatus | ''
  requestedStatus?: BookCopyStatus | ''
  varianceType?: InventoryVarianceType | ''
  copyId?: string
  requestedBy?: string
  search?: string
  from?: string
  to?: string
}

export type CreateInventoryAdjustmentRequest = {
  copyId?: string
  copyBarcode?: string
  inventoryCheckId?: string
  requestedStatus: BookCopyStatus
  reason: string
  varianceType?: InventoryVarianceType
  isFound?: boolean
  checkCode?: string
  checkNote?: string
}

export type UpdateInventoryAdjustmentStatusRequest = {
  status: InventoryAdjustmentStatus
  reason?: string
}

export type CancelInventoryAdjustmentRequest = {
  reason?: string
}

export type SelectableBookCopy = {
  id: string
  copyBarcode: string
  titleName: string
  status: BookCopyStatus
  shelfCode?: string | null
}
