import { useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import type { CustomerExportFormat } from '../customers.export'

export interface ExportCustomerDialogProps {
  isOpen: boolean
  recordCount: number
  isExporting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onSelectFormat: (format: CustomerExportFormat) => Promise<void> | void
}

export function ExportCustomerDialog({
  isOpen,
  recordCount,
  isExporting = false,
  errorMessage = null,
  onClose,
  onSelectFormat,
}: ExportCustomerDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExporting, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity motion-reduce:transition-none"
        onClick={() => {
          if (!isExporting) onClose()
        }}
      />

      <div
        aria-describedby="export-customer-desc"
        aria-labelledby="export-customer-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="export-customer-title">
              Xuất danh sách khách hàng
            </h2>
            <p className="mt-1 text-xs text-slate-600" id="export-customer-desc">
              Chọn định dạng tệp để tải xuống {recordCount} khách hàng theo bộ lọc hiện tại.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại xuất danh sách"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-40"
            disabled={isExporting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {errorMessage && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            className="group flex min-h-[44px] w-full cursor-pointer items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            disabled={isExporting || recordCount === 0}
            onClick={() => onSelectFormat('excel')}
            type="button"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <FileSpreadsheet aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                  Xuất Excel (.xlsx / .csv)
                </span>
                <Download aria-hidden="true" className="size-4 shrink-0 text-slate-600 group-hover:text-indigo-600" />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                Tải trực tiếp tệp bảng tính Microsoft Excel (.xlsx) đầy đủ cột và định dạng tiếng Việt.
              </span>
            </span>
          </button>

          <button
            className="group flex min-h-[44px] w-full cursor-pointer items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            disabled={isExporting || recordCount === 0}
            onClick={() => onSelectFormat('csv')}
            type="button"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/70">
              <FileText aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                  Xuất CSV (.csv)
                </span>
                <Download aria-hidden="true" className="size-4 shrink-0 text-slate-600 group-hover:text-indigo-600" />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                Tệp văn bản phân cách dấu phẩy chuẩn UTF-8 BOM, mở đúng tiếng Việt có dấu trên Excel.
              </span>
            </span>
          </button>

          {recordCount === 0 && (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-center text-xs text-slate-600">
              Không có khách hàng nào khớp với bộ lọc hiện tại để xuất.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {isExporting && (
            <span className="mr-auto text-xs text-slate-600" role="status">
              Đang chuẩn bị tệp tải xuống...
            </span>
          )}
          <Button
            disabled={isExporting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
