import { Trash2 } from 'lucide-react'
import { Card, SelectBox } from '@/components/common'
import { formatVnd } from '../../pos-transaction.utils'
import {
  GRADE_OPTIONS,
  type BuybackLineItem,
  type CustomerBuybackDetailDto,
} from './pos-buyback.utils'

type PosBuybackLinesTableCardProps = {
  activeBuybackId: string | null
  lines: BuybackLineItem[]
  onRemoveLine: (id: string) => void
  onSelectRecentBuyback: (detail: CustomerBuybackDetailDto) => void
  onUpdateLine: (id: string, patch: Partial<BuybackLineItem>) => void
  recentBuybacks: CustomerBuybackDetailDto[]
}

export function PosBuybackLinesTableCard({
  activeBuybackId,
  lines,
  onRemoveLine,
  onSelectRecentBuyback,
  onUpdateLine,
  recentBuybacks,
}: PosBuybackLinesTableCardProps) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden" padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Danh sách sách thu mua</h3>
          <span className="text-xs text-slate-400">{lines.length} dòng độc lập (1 dòng = 1 cuốn)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left" scope="col">Tên sách</th>
                <th className="px-3 py-3.5 text-left" scope="col">Grade</th>
                <th className="px-4 py-3.5 text-left" scope="col">Giá mua</th>
                <th className="px-4 py-3.5 text-left" scope="col">Giá bán dự kiến</th>
                <th className="px-6 py-3.5 text-left" scope="col">Barcode mới</th>
                <th className="px-3 py-3.5 text-center" scope="col">
                  <span className="sr-only">Xóa</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-400" colSpan={6}>
                    Chưa có sách trong danh sách thu mua. Hãy tra cứu hoặc chọn ấn bản ở trên để thêm.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr className="hover:bg-slate-50/70" key={line.id}>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{line.titleName}</td>
                    <td className="px-3 py-3.5 w-24">
                      <SelectBox
                        hideLabel
                        label={`Grade cho ${line.titleName}`}
                        onChange={(val) => onUpdateLine(line.id, { grade: val })}
                        options={GRADE_OPTIONS}
                        searchable={false}
                        value={line.grade}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        aria-label={`Giá mua ${line.titleName}`}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                        onChange={(e) =>
                          onUpdateLine(line.id, {
                            buyPrice: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0),
                          })
                        }
                        type="text"
                        value={formatVnd(line.buyPrice)}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        aria-label={`Giá bán dự kiến ${line.titleName}`}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                        onChange={(e) =>
                          onUpdateLine(line.id, {
                            expectedSellingPrice: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0),
                          })
                        }
                        type="text"
                        value={formatVnd(line.expectedSellingPrice)}
                      />
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">{line.barcodePreview}</td>
                    <td className="px-3 py-3.5 text-center">
                      <button
                        aria-label={`Xóa ${line.titleName}`}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
      </Card>

      {recentBuybacks.length > 0 && (
        <Card className="overflow-hidden" padding="none">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Phiếu thu mua gần đây ({recentBuybacks.length})</h3>
            <span className="text-xs text-slate-400">Nhấn vào dòng bất kỳ để xem mã vạch đã sinh</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-semibold">
                <tr>
                  <th className="px-6 py-3 text-left" scope="col">Mã phiếu / Người bán</th>
                  <th className="px-4 py-3 text-left" scope="col">Số lượng</th>
                  <th className="px-4 py-3 text-left" scope="col">Tổng tiền chi</th>
                  <th className="px-6 py-3 text-left" scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBuybacks.map((item) => (
                  <tr
                    className={`cursor-pointer transition hover:bg-slate-50/70 ${
                      activeBuybackId === item.id ? 'bg-indigo-50/60' : ''
                    }`}
                    key={item.id}
                    onClick={() => onSelectRecentBuyback(item)}
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-mono font-bold text-slate-900 block">{item.code}</span>
                      <span className="text-slate-600">
                        {item.sellerName} ({item.sellerPhone})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {item.totalCopies} cuốn ({item.generatedCopyCount} mã vạch)
                    </td>
                    <td className="px-4 py-3.5 font-bold text-indigo-700">{formatVnd(item.totalAmount)}</td>
                    <td className="px-6 py-3.5">
                      {item.status === 'COMPLETED' ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          Đã chi tiền & Sinh mã
                        </span>
                      ) : item.status === 'APPROVED' ? (
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                          Đã duyệt - Chờ chi
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                          Chờ Admin duyệt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
