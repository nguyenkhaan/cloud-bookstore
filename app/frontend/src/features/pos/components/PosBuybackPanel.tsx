import { useMemo, useState } from 'react'
import { BookOpen, Printer, Trash2 } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import type { QuickSeriesFixture } from '../pos-transaction.type'
import { formatVnd } from '../pos-transaction.utils'

type BuybackGrade = 'A' | 'B' | 'C' | 'D'

export type BuybackLineItem = {
  id: string
  titleName: string
  grade: BuybackGrade
  buyPrice: number
  expectedSellingPrice: number
  barcodePreview: string
  needsApproval: boolean
}

const GRADE_OPTIONS: SelectOption<BuybackGrade>[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

const EXCEED_REASON_OPTIONS: SelectOption<string>[] = [
  {
    value: 'Bộ đặc biệt đủ bìa áo, chất lượng tốt, nhu cầu cao.',
    label: 'Bộ đặc biệt đủ bìa áo, chất lượng tốt, nhu cầu cao.',
  },
  {
    value: 'Ấn bản giới hạn đã ngừng in, nhiều khách hỏi thuê.',
    label: 'Ấn bản giới hạn đã ngừng in, nhiều khách hỏi thuê.',
  },
  {
    value: 'Trọn bộ đủ tập không khuyết, tiết kiệm chi phí săn lẻ.',
    label: 'Trọn bộ đủ tập không khuyết, tiết kiệm chi phí săn lẻ.',
  },
]

const GRADE_META: Record<
  BuybackGrade,
  { badgeLabel: string; minPct: number; maxPct: number; defaultPct: number }
> = {
  A: { badgeLabel: 'A - 90–99%', minPct: 0.6, maxPct: 0.7, defaultPct: 0.65 },
  B: { badgeLabel: 'B - 70–89%', minPct: 0.5, maxPct: 0.6, defaultPct: 0.55 },
  C: { badgeLabel: 'C - 50–69%', minPct: 0.3, maxPct: 0.45, defaultPct: 0.4 },
  D: { badgeLabel: 'D - <50%', minPct: 0.15, maxPct: 0.25, defaultPct: 0.2 },
}

const INITIAL_BUYBACK_LINES: BuybackLineItem[] = [
  {
    id: 'bb-1',
    titleName: 'Doraemon - Tuyển tập đặc biệt',
    grade: 'B',
    buyPrice: 220000,
    expectedSellingPrice: 300000,
    barcodePreview: 'Chờ duyệt → Sinh mã',
    needsApproval: true,
  },
  {
    id: 'bb-2',
    titleName: 'Conan - Tập 01',
    grade: 'B',
    buyPrice: 95000,
    expectedSellingPrice: 140000,
    barcodePreview: 'BC-BUY-31',
    needsApproval: false,
  },
  {
    id: 'bb-3',
    titleName: 'Conan - Tập 03',
    grade: 'A',
    buyPrice: 100000,
    expectedSellingPrice: 150000,
    barcodePreview: 'BC-BUY-32',
    needsApproval: false,
  },
  {
    id: 'bb-4',
    titleName: 'Conan - Tập 05',
    grade: 'B',
    buyPrice: 95000,
    expectedSellingPrice: 140000,
    barcodePreview: 'BC-BUY-33',
    needsApproval: false,
  },
  {
    id: 'bb-5',
    titleName: 'Conan - Tập 10',
    grade: 'C',
    buyPrice: 90000,
    expectedSellingPrice: 130000,
    barcodePreview: 'BC-BUY-34',
    needsApproval: false,
  },
  {
    id: 'bb-6',
    titleName: 'Nhà giả kim - Bản 1',
    grade: 'A',
    buyPrice: 100000,
    expectedSellingPrice: 150000,
    barcodePreview: 'BC-BUY-35',
    needsApproval: false,
  },
  {
    id: 'bb-7',
    titleName: 'Nhà giả kim - Bản 2',
    grade: 'A',
    buyPrice: 100000,
    expectedSellingPrice: 150000,
    barcodePreview: 'BC-BUY-36',
    needsApproval: false,
  },
]

const SINGLE_ITEM_APPROVAL_LIMIT = 200000
const SLIP_TOTAL_APPROVAL_LIMIT = 1000000
const CASH_DRAWER_BEFORE = 6065000

interface PosBuybackPanelProps {
  onOpenQuickPicker: () => void
  quickPickerBatch?: QuickSeriesFixture | null
  onConsumeQuickPickerBatch?: () => void
}

export function PosBuybackPanel({
  onOpenQuickPicker,
  quickPickerBatch,
  onConsumeQuickPickerBatch,
}: PosBuybackPanelProps) {
  const [sellerName, setSellerName] = useState('Lê Hoàng Nam')
  const [sellerPhone, setSellerPhone] = useState('0918 567 890')

  const [isbnQuery, setIsbnQuery] = useState('9786042227211')
  const [currentTitle, setCurrentTitle] = useState('Doraemon - Tuyển tập đặc biệt')
  const [currentAuthorPublisher, setCurrentAuthorPublisher] = useState('Fujiko F. Fujio - NXB Kim Đồng')
  const [currentCoverPrice, setCurrentCoverPrice] = useState(350000)
  const [isManualEntry, setIsManualEntry] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState<BuybackGrade>('B')
  const [agreedBuyPrice, setAgreedBuyPrice] = useState(220000)
  const [expectedSalePrice, setExpectedSalePrice] = useState(300000)

  const [lines, setLines] = useState<BuybackLineItem[]>(INITIAL_BUYBACK_LINES)
  const [payoutMethod, setPayoutMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH')
  const [exceedReason, setExceedReason] = useState(EXCEED_REASON_OPTIONS[0].value)
  const [managerPin, setManagerPin] = useState('1234')
  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED' | 'COMPLETED'>('PENDING')

  if (quickPickerBatch && quickPickerBatch.selectedVolumes.length > 0) {
    const startNumber = 31 + lines.length
    const unfoldedLines: BuybackLineItem[] = quickPickerBatch.selectedVolumes.map((vol, idx) => {
      const price = quickPickerBatch.agreedPricePerVolume
      const overLimit = price > SINGLE_ITEM_APPROVAL_LIMIT
      return {
        id: `quick-${startNumber + idx}-${vol}`,
        titleName: `${quickPickerBatch.seriesName} - ${vol.replace('T.', 'Tập ')}`,
        grade: quickPickerBatch.grade,
        buyPrice: price,
        expectedSellingPrice: quickPickerBatch.expectedSalePricePerVolume,
        barcodePreview: overLimit ? 'Chờ duyệt → Sinh mã' : `BC-BUY-${startNumber + idx}`,
        needsApproval: overLimit,
      }
    })
    setLines((prev) => [...prev, ...unfoldedLines])
    onConsumeQuickPickerBatch?.()
  }

  const suggestedRangeText = useMemo(() => {
    const meta = GRADE_META[selectedGrade]
    const min = Math.round((currentCoverPrice * meta.minPct) / 1000) * 1000
    const max = Math.round((currentCoverPrice * meta.maxPct) / 1000) * 1000
    return `${min.toLocaleString('vi-VN')}–${max.toLocaleString('vi-VN')}đ`
  }, [currentCoverPrice, selectedGrade])

  const isCurrentItemOverLimit = agreedBuyPrice > SINGLE_ITEM_APPROVAL_LIMIT

  const summary = useMemo(() => {
    const totalCopies = lines.length
    const totalPayout = lines.reduce((sum, item) => sum + item.buyPrice, 0)
    const hasOverLimitItem = lines.some((item) => item.buyPrice > SINGLE_ITEM_APPROVAL_LIMIT)
    const isTotalOverLimit = totalPayout > SLIP_TOTAL_APPROVAL_LIMIT
    const requiresApproval = hasOverLimitItem || isTotalOverLimit
    const drawerAfter = Math.max(0, CASH_DRAWER_BEFORE - (payoutMethod === 'CASH' ? totalPayout : 0))
    return {
      totalCopies,
      totalPayout,
      hasOverLimitItem,
      isTotalOverLimit,
      requiresApproval,
      drawerAfter,
    }
  }, [lines, payoutMethod])

  const handleSelectGrade = (grade: BuybackGrade) => {
    setSelectedGrade(grade)
    const meta = GRADE_META[grade]
    const suggested = Math.round((currentCoverPrice * meta.defaultPct) / 1000) * 1000
    setAgreedBuyPrice(suggested)
    setExpectedSalePrice(Math.round((suggested * 1.4) / 1000) * 1000)
  }

  const handleIsbnLookup = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = isbnQuery.trim()
    if (!clean) return
    if (clean.endsWith('3595') || clean.includes('09359')) {
      setCurrentTitle('Thám tử lừng danh Conan - Tập 10')
      setCurrentAuthorPublisher('Gosho Aoyama - NXB Kim Đồng')
      setCurrentCoverPrice(45000)
      setAgreedBuyPrice(25000)
      setExpectedSalePrice(36000)
      notify.success('Đã tra cứu metadata ấn bản từ ISBN.')
    } else {
      notify.success(`Đã tra cứu ISBN ${clean}: ${currentTitle}`)
    }
  }

  const handleAddEvaluatedBook = () => {
    if (!currentTitle.trim()) {
      notify.error('Vui lòng nhập tên sách trước khi thêm.')
      return
    }
    const overLimit = agreedBuyPrice > SINGLE_ITEM_APPROVAL_LIMIT
    const nextSeq = 31 + lines.length
    const newItem: BuybackLineItem = {
      id: `bb-${Date.now()}`,
      titleName: currentTitle.trim(),
      grade: selectedGrade,
      buyPrice: agreedBuyPrice,
      expectedSellingPrice: expectedSalePrice,
      barcodePreview: overLimit && approvalStatus !== 'APPROVED' ? 'Chờ duyệt → Sinh mã' : `BC-BUY-${nextSeq}`,
      needsApproval: overLimit,
    }
    setLines((prev) => [newItem, ...prev])
    if (overLimit && approvalStatus === 'APPROVED') {
      setApprovalStatus('PENDING')
    }
    notify.success(`Đã thêm "${newItem.titleName}" vào danh sách thu mua.`)
  }

  const handleUpdateLine = (id: string, patch: Partial<BuybackLineItem>) => {
    setLines((prev) =>
      prev.map((item, idx) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        const over = updated.buyPrice > SINGLE_ITEM_APPROVAL_LIMIT
        updated.needsApproval = over
        updated.barcodePreview =
          over && approvalStatus !== 'APPROVED' ? 'Chờ duyệt → Sinh mã' : `BC-BUY-${30 + idx + 1}`
        return updated
      }),
    )
  }

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) {
      notify.error('Phiếu thu mua cần ít nhất 1 cuốn sách.')
      return
    }
    setLines((prev) => prev.filter((item) => item.id !== id))
  }

  const handleRequestApproval = () => {
    if (!sellerName.trim() || !sellerPhone.trim()) {
      notify.error('Thiếu người bán: Bắt buộc nhập họ tên và số điện thoại.')
      return
    }
    if (managerPin.trim().length >= 4) {
      setApprovalStatus('APPROVED')
      setLines((prev) =>
        prev.map((item, idx) => ({
          ...item,
          barcodePreview: `BC-BUY-${31 + idx}`,
        })),
      )
      notify.success('Admin đã xác nhận phê duyệt giá thu mua vượt hạn mức!')
    } else {
      setApprovalStatus('PENDING')
      notify.success('Đã gửi yêu cầu duyệt giá thu mua vượt hạn mức sang Trung tâm Phê duyệt!')
    }
  }

  const handleCompleteBuyback = () => {
    if (!sellerName.trim() || !sellerPhone.trim()) {
      notify.error('Thiếu người bán: Bắt buộc họ tên và số điện thoại trước khi lập phiếu.')
      return
    }
    if (summary.requiresApproval && approvalStatus === 'PENDING') {
      notify.error('Phiếu có sách vượt hạn mức. Vui lòng gửi duyệt giá trước khi chi tiền.')
      return
    }
    setApprovalStatus('COMPLETED')
    setLines((prev) =>
      prev.map((item, idx) => ({
        ...item,
        barcodePreview: `BC-BUY-${31 + idx}`,
      })),
    )
    notify.success(
      `Đã hoàn tất phiếu thu mua BUY-20261018-0012, chi ${formatVnd(summary.totalPayout)} và sinh ${summary.totalCopies} mã CopyBarcode!`,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Thu mua sách cũ từ khách hàng</h2>
          <p className="mt-1 text-xs font-mono text-slate-500">
            BUY-20261018-0012 - Định danh người bán để lưu chứng từ chi phí hợp lệ.
          </p>
        </div>

        <Button
          onClick={() =>
            notify.success(`Đã mở bản in nhiệt cho ${summary.totalCopies} mã CopyBarcode độc bản!`)
          }
          type="button"
          variant="outline"
        >
          <Printer className="mr-1.5 h-4 w-4" />
          In hàng loạt mã Barcode độc bản
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] items-start">
        <div className="space-y-6">
          <Card bodyClassName="space-y-4" padding="lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Thông tin người bán bắt buộc</h3>
              <span className="text-xs text-slate-400">•••</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Họ tên người bán *"
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Nhập họ tên người bán..."
                required
                value={sellerName}
              />
              <TextField
                label="Số điện thoại *"
                onChange={(e) => setSellerPhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                required
                value={sellerPhone}
              />
            </div>
          </Card>

          <Card bodyClassName="space-y-5" padding="lg">
            <div>
              <Button onClick={onOpenQuickPicker} type="button" variant="outline">
                + Thu mua theo Bộ truyện (Series Quick-Picker)
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tra cứu & Định giá sách</h3>
              <span className="text-xs text-slate-400">•••</span>
            </div>

            <form onSubmit={handleIsbnLookup}>
              <div className="relative">
                <input
                  aria-label="Tra cứu ISBN sách thu mua"
                  className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/25 py-3 pl-4 pr-20 font-mono text-sm font-bold text-indigo-700 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  placeholder="ISBN 9786042227211 - Tra cứu ISBN (Enter)"
                  type="text"
                  value={`ISBN ${isbnQuery} - Tra cứu ISBN (Enter)`}
                />
                <button
                  className="absolute right-3 top-2.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  type="submit"
                >
                  Enter
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Máy quét đang lắng nghe - Quét ISBN để tìm ấn bản
              </p>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-900 text-white shadow-2xs">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentTitle}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {currentAuthorPublisher} - Giá bìa {formatVnd(currentCoverPrice)}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setIsManualEntry((prev) => !prev)}
                type="button"
                variant="outline"
              >
                {isManualEntry ? 'Đóng nhập tay' : 'Nhập tay nếu không có ISBN'}
              </Button>
            </div>

            {isManualEntry && (
              <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 sm:grid-cols-3">
                <TextField
                  label="Tên sách / Tập *"
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  value={currentTitle}
                />
                <TextField
                  label="Tác giả & Nhà xuất bản"
                  onChange={(e) => setCurrentAuthorPublisher(e.target.value)}
                  value={currentAuthorPublisher}
                />
                <TextField
                  label="Giá bìa tham chiếu (VNĐ)"
                  onChange={(e) => setCurrentCoverPrice(Math.max(0, Number(e.target.value) || 0))}
                  type="number"
                  value={String(currentCoverPrice)}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(['A', 'B', 'C', 'D'] as BuybackGrade[]).map((grade) => {
                const isSelected = selectedGrade === grade
                return (
                  <button
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-white text-indigo-700 ring-2 ring-indigo-600 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    key={grade}
                    onClick={() => handleSelectGrade(grade)}
                    type="button"
                  >
                    {GRADE_META[grade].badgeLabel}
                  </button>
                )
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Khoảng giá mua đề xuất"
                readOnly
                value={suggestedRangeText}
              />
              <TextField
                label="Giá thỏa thuận thực tế"
                onChange={(e) => setAgreedBuyPrice(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                value={formatVnd(agreedBuyPrice)}
              />
              <TextField
                label="Giá bán niêm yết dự kiến"
                onChange={(e) => setExpectedSalePrice(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                value={formatVnd(expectedSalePrice)}
              />
            </div>

            {isCurrentItemOverLimit && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-600 text-[10px] font-bold text-amber-700">
                  !
                </span>
                <span>
                  Cần Admin duyệt giá (Nhập PIN tại chỗ hoặc gửi sang Trung tâm Phê duyệt)
                </span>
              </div>
            )}

            <div>
              <Button onClick={handleAddEvaluatedBook} type="button" variant="outline">
                Thêm vào danh sách thu mua
              </Button>
            </div>
          </Card>

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
                  {lines.map((line) => (
                    <tr className="hover:bg-slate-50/70" key={line.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-900">{line.titleName}</td>
                      <td className="px-3 py-3.5 w-24">
                        <SelectBox
                          hideLabel
                          label={`Grade cho ${line.titleName}`}
                          onChange={(val) => handleUpdateLine(line.id, { grade: val })}
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
                            handleUpdateLine(line.id, {
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
                            handleUpdateLine(line.id, {
                              expectedSellingPrice: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0),
                            })
                          }
                          type="text"
                          value={formatVnd(line.expectedSellingPrice)}
                        />
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">{line.barcodePreview}</td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          aria-label={`Xóa ${line.titleName}`}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => handleRemoveLine(line.id)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card bodyClassName="space-y-4" padding="lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tổng kết thu mua</h3>
              <span className="text-xs text-slate-400">•••</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số bản sách vật lý</span>
                <strong className="font-bold text-slate-900">{summary.totalCopies} cuốn</strong>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Tổng tiền chi thực tế</span>
                <span className="text-xl font-black text-indigo-700">{formatVnd(summary.totalPayout)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  payoutMethod === 'CASH'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setPayoutMethod('CASH')}
                type="button"
              >
                Tiền mặt từ két
              </button>
              <button
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  payoutMethod === 'BANK_TRANSFER'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setPayoutMethod('BANK_TRANSFER')}
                type="button"
              >
                Chuyển khoản ngoài
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Két trước chi</span>
                <strong className="font-bold text-slate-900">{formatVnd(CASH_DRAWER_BEFORE)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Két dự kiến sau chi</span>
                <strong className="font-bold text-slate-900">{formatVnd(summary.drawerAfter)}</strong>
              </div>
            </div>

            <SelectBox
              label="Lý do đề xuất vượt hạn mức"
              onChange={(val) => setExceedReason(val)}
              options={EXCEED_REASON_OPTIONS}
              searchable={false}
              value={exceedReason}
            />

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <label className="block text-[11px] font-bold text-indigo-700" htmlFor="buyback-manager-pin">
                Admin duyệt tại chỗ - PIN 4 số
              </label>
              <input
                className="mt-1 w-full bg-transparent font-mono text-sm font-black tracking-widest text-indigo-950 outline-hidden"
                id="buyback-manager-pin"
                maxLength={6}
                onChange={(e) => setManagerPin(e.target.value)}
                type="password"
                value={managerPin}
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <Button
                className="w-full justify-center"
                onClick={handleRequestApproval}
                type="button"
                variant="primary"
              >
                Gửi duyệt giá vượt hạn mức
              </Button>
              <Button
                className="w-full justify-center"
                onClick={handleCompleteBuyback}
                type="button"
                variant="secondary"
              >
                Lập phiếu thu mua & Chi tiền
              </Button>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-600 text-[10px] font-bold text-indigo-700">
                i
              </span>
              <span className="leading-relaxed">
                {approvalStatus === 'COMPLETED'
                  ? `Đã hoàn tất chi tiền và sinh ${summary.totalCopies} mã CopyBarcode độc bản.`
                  : approvalStatus === 'APPROVED'
                    ? 'Đã được Admin duyệt giá. Nhấn "Lập phiếu thu mua & Chi tiền" để hoàn tất.'
                    : 'Đang chờ duyệt giá. Chỉ sinh Barcode độc bản, ghi tăng kho và chi tiền sau khi được phê duyệt.'}
              </span>
            </div>
          </Card>

          <Card bodyClassName="space-y-3" padding="lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Chứng từ & Chi phí</h3>
              <span className="text-xs text-slate-400">•••</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Mỗi bản sách có giá vốn thực mua, giá bán dự kiến và Barcode riêng. Chứng từ lưu tên / SĐT người bán, thời gian và người lập.
            </p>
            <div>
              {approvalStatus === 'COMPLETED' ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  Đã chi tiền & Sinh Barcode
                </span>
              ) : approvalStatus === 'APPROVED' ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                  Đã duyệt - Chờ chi tiền
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  Chờ Admin duyệt
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          QUY TẮC KIỂM SOÁT / NGOẠI LỆ THU MUA
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card bodyClassName="space-y-2" padding="md">
            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
              Thiếu người bán
            </span>
            <p className="text-xs text-slate-500">
              Bắt buộc họ tên và số điện thoại; chưa được lập phiếu.
            </p>
          </Card>

          <Card bodyClassName="space-y-2" padding="md">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
              Không tìm thấy ISBN
            </span>
            <p className="text-xs text-slate-500">
              Cho phép nhập tay tên sách, tác giả, NXB và giá bìa.
            </p>
          </Card>

          <Card bodyClassName="space-y-2" padding="md">
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              Tổng phiếu &gt; 1.000.000đ
            </span>
            <p className="text-xs text-slate-500">
              Luôn gửi Admin duyệt dù mỗi cuốn dưới 200.000đ.
            </p>
          </Card>
        </div>
      </section>
    </div>
  )
}
