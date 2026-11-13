import React, { useMemo, useState } from 'react'
import { Button, SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { useAllBookCopiesQuery, useCreateApprovalMutation } from '../approvals.hook'
import { copyStatusLabel } from '../approvals.presentation'
import type { BookCopyStatus, InventoryVarianceType } from '../approvals.type'

export interface DiscrepancyRow {
  id: string
  copyBarcode: string
  titleName?: string
  systemStatus?: string
  varianceType: InventoryVarianceType
  requestedStatus: BookCopyStatus
  reason: string
}

export interface CreateAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialRows?: DiscrepancyRow[]
  batchCode?: string
  shelfZone?: string
}

const createEmptyRow = (id = `row-${Date.now()}`): DiscrepancyRow => ({
  id,
  copyBarcode: '',
  varianceType: 'MISSING',
  requestedStatus: 'LOST',
  reason: '',
})

const VARIANCE_OPTIONS: SelectOption<InventoryVarianceType>[] = [
  { value: 'MISSING', label: 'THIẾU SÁCH' },
  { value: 'DAMAGED', label: 'HƯ HỎNG' },
  { value: 'UNEXPECTED_STATUS', label: 'SAI TRẠNG THÁI' },
  { value: 'NONE', label: 'KHỚP ĐẾM' },
]

const REQUESTED_STATUS_OPTIONS: SelectOption<BookCopyStatus>[] = [
  { value: 'LOST', label: 'Mất sách (LOST)' },
  { value: 'DAMAGED', label: 'Hư hỏng (DAMAGED)' },
  { value: 'AVAILABLE', label: 'Sẵn sàng (AVAILABLE)' },
  { value: 'DISCONTINUED', label: 'Ngừng dùng (DISCONTINUED)' },
]

export const CreateAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRows,
  batchCode,
  shelfZone,
}) => {
  const [rows, setRows] = useState<DiscrepancyRow[]>(() =>
    initialRows && initialRows.length > 0 ? initialRows : [createEmptyRow('row-1')],
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createMutation = useCreateApprovalMutation()
  const { data: bookCopies = [], isLoading: isLoadingCopies } = useAllBookCopiesQuery(isOpen)

  const copyOptions = useMemo<SelectOption<string>[]>(() => {
    const options: SelectOption<string>[] = bookCopies.map((copy) => ({
      value: copy.copyBarcode,
      label: `${copy.copyBarcode} - ${copy.titleName} (${copyStatusLabel(copy.status)})`,
    }))
    for (const row of rows) {
      if (row.copyBarcode && !options.some((opt) => opt.value === row.copyBarcode)) {
        options.unshift({
          value: row.copyBarcode,
          label: row.titleName ? `${row.copyBarcode} - ${row.titleName}` : row.copyBarcode,
        })
      }
    }
    return options
  }, [bookCopies, rows])

  if (!isOpen) return null

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleUpdateRow = (id: string, patch: Partial<DiscrepancyRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const handleSubmit = async () => {
    setErrorMessage('')
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.copyBarcode.trim()) {
        setErrorMessage(`Dòng số ${i + 1}: Vui lòng chọn mã vạch cuốn sách (CopyBarcode).`)
        return
      }
      if (!row.reason.trim()) {
        setErrorMessage(`Dòng số ${i + 1}: Vui lòng nhập lý do giải trình chênh lệch.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      for (const row of rows) {
        await createMutation.mutateAsync({
          copyBarcode: row.copyBarcode.trim(),
          requestedStatus: row.requestedStatus,
          varianceType: row.varianceType,
          reason: row.reason.trim(),
          checkNote: batchCode ? `Đợt đối soát ${batchCode}${shelfZone ? ` (${shelfZone})` : ''}` : undefined,
        })
      }
      onSuccess?.()
      onClose()
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Có lỗi khi gửi đề nghị điều chỉnh.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-labelledby="modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>KHO SÁCH</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900" id="modal-title">
              Lập Đề nghị Điều chỉnh Kho sau Đối soát
            </h2>
            {(batchCode || shelfZone) && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {[batchCode, shelfZone].filter(Boolean).join(' - ')}
              </p>
            )}
          </div>
          <button
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            onClick={onClose}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Chi tiết chênh lệch kiểm kê</h3>
            <span className="text-xs text-rose-600 font-medium">* Bắt buộc giải trình từng dòng</span>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5 text-left" scope="col">Bản sách / CopyBarcode</th>
                  <th className="px-3 py-2.5 text-left" scope="col">Loại sai lệch</th>
                  <th className="px-3 py-2.5 text-left" scope="col">Trạng thái đề xuất</th>
                  <th className="px-3 py-2.5 text-left" scope="col">Giải trình chênh lệch *</th>
                  <th className="px-2 py-2.5 text-center" scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr className="hover:bg-slate-50/50" key={row.id}>
                    <td className="px-3 py-2.5 align-top min-w-56">
                      <SelectBox
                        disabled={isLoadingCopies}
                        emptyMessage={isLoadingCopies ? 'Đang tải danh sách bản sách...' : 'Không có bản sách nào.'}
                        hideLabel
                        label="Bản sách / CopyBarcode"
                        onChange={(barcode) => {
                          const selected = bookCopies.find((c) => c.copyBarcode === barcode)
                          handleUpdateRow(row.id, {
                            copyBarcode: barcode,
                            titleName: selected?.titleName,
                            systemStatus: selected ? copyStatusLabel(selected.status) : undefined,
                          })
                        }}
                        options={copyOptions}
                        placeholder={isLoadingCopies ? 'Đang tải...' : 'Chọn CopyBarcode...'}
                        searchPlaceholder="Tìm CopyBarcode hoặc tên sách..."
                        value={row.copyBarcode}
                      />
                      {(row.titleName || row.systemStatus) && (
                        <p className="mt-1 text-[11px] text-slate-500 truncate max-w-60">
                          {[row.titleName, row.systemStatus ? `Hiện tại: ${row.systemStatus}` : null]
                            .filter(Boolean)
                            .join(' - ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top min-w-35">
                      <SelectBox
                        hideLabel
                        label="Loại sai lệch"
                        onChange={(value) =>
                          handleUpdateRow(row.id, {
                            varianceType: value,
                            requestedStatus: value === 'MISSING' ? 'LOST' : 'DAMAGED',
                          })
                        }
                        options={VARIANCE_OPTIONS}
                        searchable={false}
                        value={row.varianceType}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top min-w-40">
                      <SelectBox
                        hideLabel
                        label="Trạng thái đề xuất"
                        onChange={(value) => handleUpdateRow(row.id, { requestedStatus: value })}
                        options={REQUESTED_STATUS_OPTIONS}
                        searchable={false}
                        value={row.requestedStatus}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <input
                        className="w-full min-w-50 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                        onChange={(e) => handleUpdateRow(row.id, { reason: e.target.value })}
                        placeholder="Nhập lý do đối soát thực tế..."
                        type="text"
                        value={row.reason}
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center align-top">
                      {rows.length > 1 && (
                        <button
                          aria-label={`Xóa dòng ${index + 1}`}
                          className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          onClick={() => handleRemoveRow(row.id)}
                          type="button"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              onClick={handleAddRow}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Thêm bản sách cần đề xuất
            </button>
            <div className="text-right">
              <span className="text-xs text-slate-500">Số lượng sai lệch: </span>
              <span className="text-xs font-bold text-slate-900">{rows.length} cuốn</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button onClick={onClose} variant="outline">
            Lưu bản nháp & Đóng
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            variant="primary"
          >
            {isSubmitting ? 'Đang gửi...' : 'GỬI DUYỆT YÊU CẦU →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
