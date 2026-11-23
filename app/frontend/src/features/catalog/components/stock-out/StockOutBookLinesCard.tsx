import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { formatVnd, type StockOutApprovalStage, type StockOutBookLine } from './stock-out.utils'

type StockOutBookLinesCardProps = {
  approvalStage: StockOutApprovalStage
  lines: StockOutBookLine[]
  onAddBarcode: (barcode: string) => void
  onChangeLineReason: (lineId: string, reason: string) => void
  onChangeScanInput: (value: string) => void
  onChangeSelectedDropdownBarcode: (barcode: string) => void
  onRemoveLine: (lineId: string) => void
  onScanSubmit: (event: FormEvent<HTMLFormElement>) => void
  scanBarcodeInput: string
  selectableCopyOptions: SelectOption<string>[]
  selectedDropdownBarcode: string
  totalCost: number
}

export function StockOutBookLinesCard({
  approvalStage,
  lines,
  onAddBarcode,
  onChangeLineReason,
  onChangeScanInput,
  onChangeSelectedDropdownBarcode,
  onRemoveLine,
  onScanSubmit,
  scanBarcodeInput,
  selectableCopyOptions,
  selectedDropdownBarcode,
  totalCost,
}: StockOutBookLinesCardProps) {
  const isLocked = approvalStage !== 'DRAFT'

  return (
    <Card bodyClassName="space-y-5" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Bản sách được chọn</h2>
        {selectableCopyOptions.length > 0 && !isLocked && (
          <div className="w-64">
            <SelectBox
              hideLabel
              label="Chọn nhanh CopyBarcode từ kho"
              onChange={(barcode) => {
                onChangeSelectedDropdownBarcode(barcode)
                onAddBarcode(barcode)
              }}
              options={selectableCopyOptions}
              placeholder="Chọn nhanh CopyBarcode..."
              searchPlaceholder="Tìm CopyBarcode..."
              value={selectedDropdownBarcode}
            />
          </div>
        )}
      </div>

      <form onSubmit={onScanSubmit}>
        <div className="relative">
          <input
            aria-label="Quét Barcode độc bản cần xuất"
            className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/20 py-3 pl-4 pr-20 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden disabled:opacity-60"
            disabled={isLocked}
            onChange={(e) => onChangeScanInput(e.target.value)}
            placeholder="Quét Barcode độc bản cần xuất..."
            type="text"
            value={scanBarcodeInput}
          />
          <button
            className="absolute right-3 top-2.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
            disabled={isLocked}
            type="submit"
          >
            Enter ↵
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Máy quét đang lắng nghe - Nhấn Enter để thêm bản sách từ cơ sở dữ liệu
        </p>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left" scope="col">Barcode / Tên sách</th>
              <th className="px-3 py-3 text-left" scope="col">Tình trạng</th>
              <th className="px-3 py-3 text-left" scope="col">Giá vốn gốc</th>
              <th className="px-3 py-3 text-left" scope="col">Lý do xuất</th>
              <th className="px-2 py-3 text-center" scope="col">
                <span className="sr-only">Xóa</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                  Chưa có bản sách nào được chọn. Hãy quét hoặc chọn CopyBarcode từ danh sách trên.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr className="hover:bg-slate-50/60" key={line.id}>
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    <span className="font-mono text-indigo-700">{line.copyBarcode}</span> - {line.titleName}
                  </td>
                  <td className="px-3 py-3.5 text-slate-600">{line.conditionText}</td>
                  <td className="px-3 py-3.5 text-slate-700 font-medium">{formatVnd(line.originalCost)}</td>
                  <td className="px-3 py-3.5">
                    <input
                      aria-label={`Lý do xuất ${line.copyBarcode}`}
                      className="w-full min-w-40 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden disabled:opacity-60"
                      disabled={isLocked}
                      onChange={(e) => onChangeLineReason(line.id, e.target.value)}
                      type="text"
                      value={line.lineReason}
                    />
                  </td>
                  <td className="px-2 py-3.5 text-center">
                    <button
                      aria-label={`Xóa ${line.copyBarcode}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      disabled={isLocked}
                      onClick={() => onRemoveLine(line.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 pt-1 text-xs">
        <p className="text-slate-600">
          {lines.length} bản sách - Tổng giá vốn xuất{' '}
          <strong className="text-sm font-black text-slate-900 ml-1">{formatVnd(totalCost)}</strong>
        </p>
        <p className="text-[11px] text-slate-400">
          Không cho chọn bản Đang thuê, Đã bán, Đã xuất hủy hoặc Đang khóa kiểm kê.
        </p>
      </div>
    </Card>
  )
}
