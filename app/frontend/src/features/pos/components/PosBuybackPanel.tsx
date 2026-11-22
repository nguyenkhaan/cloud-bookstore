import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Printer } from 'lucide-react'
import { Button, Card, TextField } from '@/components/common'
import {
  BarcodeLabelsPrintModal,
  type PrintableBarcodeLabelItem,
} from '@/components/common/BarcodeLabel/BarcodeLabelsPrintModal'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { listAllEditions, listTitles } from '@/features/catalog/catalog.service'
import type { BookEdition, BookTitle } from '@/features/catalog/catalog.type'
import type { QuickSeriesFixture } from '../pos-transaction.type'
import { formatVnd } from '../pos-transaction.utils'
import { PosBuybackConfirmDialog } from './buyback/PosBuybackConfirmDialog'
import { PosBuybackEvaluatorCard } from './buyback/PosBuybackEvaluatorCard'
import { PosBuybackLinesTableCard } from './buyback/PosBuybackLinesTableCard'
import { PosBuybackSummarySidebar } from './buyback/PosBuybackSummarySidebar'
import {
  completeCustomerBuyback,
  createCustomerBuyback,
  fetchRecentBuybacks,
  lookupBuybackIsbn,
} from './buyback/pos-buyback.api'
import {
  CASH_DRAWER_BEFORE,
  EXCEED_REASON_OPTIONS,
  GRADE_META,
  SINGLE_ITEM_APPROVAL_LIMIT,
  SLIP_TOTAL_APPROVAL_LIMIT,
  type BuybackApprovalStage,
  type BuybackGrade,
  type BuybackLineItem,
  type BuybackPayoutMethod,
  type CustomerBuybackDetailDto,
} from './buyback/pos-buyback.utils'

export type { BuybackLineItem }

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
  const seqRef = useRef(1)

  const [editions, setEditions] = useState<BookEdition[]>([])
  const [titles, setTitles] = useState<BookTitle[]>([])
  const [recentBuybacks, setRecentBuybacks] = useState<CustomerBuybackDetailDto[]>([])

  const [activeBuybackId, setActiveBuybackId] = useState<string | null>(null)
  const [activeBuybackCode, setActiveBuybackCode] = useState('BUY-NHAP-MOI')
  const [sellerName, setSellerName] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')

  const [selectedEditionId, setSelectedEditionId] = useState('')
  const [isbnQuery, setIsbnQuery] = useState('')
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentAuthorPublisher, setCurrentAuthorPublisher] = useState('')
  const [currentCoverPrice, setCurrentCoverPrice] = useState(0)
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState<BuybackGrade>('B')
  const [agreedBuyPrice, setAgreedBuyPrice] = useState(0)
  const [expectedSalePrice, setExpectedSalePrice] = useState(0)

  const [lines, setLines] = useState<BuybackLineItem[]>([])
  const [payoutMethod, setPayoutMethod] = useState<BuybackPayoutMethod>('CASH')
  const [exceedReason, setExceedReason] = useState(EXCEED_REASON_OPTIONS[0].value)
  const [managerPin, setManagerPin] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<BuybackApprovalStage>('DRAFT')
  const [isBusy, setIsBusy] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      listAllEditions().catch(() => []),
      listTitles().catch(() => []),
      fetchRecentBuybacks().catch(() => []),
    ]).then(([edList, titleList, buybackList]) => {
      if (!active) return
      setEditions(edList)
      setTitles(titleList)
      setRecentBuybacks(buybackList)
    })
    return () => {
      active = false
    }
  }, [])

  const titlesById = useMemo(() => {
    const map = new Map<string, BookTitle>()
    for (const t of titles) {
      map.set(t.id, t)
    }
    return map
  }, [titles])

  const editionOptions = useMemo<SelectOption<string>[]>(() => {
    return editions.map((ed) => {
      const t = titlesById.get(ed.titleId)
      const name = t ? `${t.name}${t.volumeLabel ? ` (${t.volumeLabel})` : ''}` : 'Đầu sách'
      return {
        value: ed.id,
        label: `${name} - ${ed.isbn ? `ISBN ${ed.isbn}` : 'Chưa có ISBN'}`,
      }
    })
  }, [editions, titlesById])

  if (quickPickerBatch && quickPickerBatch.selectedVolumes.length > 0) {
    const startNumber = 31 + lines.length
    const unfoldedLines: BuybackLineItem[] = quickPickerBatch.selectedVolumes.map((vol, idx) => {
      const price = quickPickerBatch.agreedPricePerVolume
      const overLimit = price > SINGLE_ITEM_APPROVAL_LIMIT
      return {
        id: `quick-${startNumber + idx}-${vol}`,
        editionId: editions[0]?.id ?? null,
        titleName: `${quickPickerBatch.seriesName} - ${vol.replace('T.', 'Tập ')}`,
        grade: quickPickerBatch.grade,
        buyPrice: price,
        expectedSellingPrice: quickPickerBatch.expectedSalePricePerVolume,
        barcodePreview: overLimit ? 'Chờ duyệt → Sinh mã' : 'Chờ chi tiền → Sinh mã',
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

  const applyBuybackDetail = (detail: CustomerBuybackDetailDto) => {
    setActiveBuybackId(detail.id)
    setActiveBuybackCode(detail.code)
    setSellerName(detail.sellerName)
    setSellerPhone(detail.sellerPhone)
    setPayoutMethod(detail.payoutMethod)

    if (detail.status === 'COMPLETED') {
      setApprovalStatus('COMPLETED')
    } else if (detail.status === 'APPROVED') {
      setApprovalStatus('APPROVED')
    } else {
      setApprovalStatus('PENDING')
    }

    const mappedLines: BuybackLineItem[] = []
    for (const l of detail.lines) {
      if (l.barcodes.length > 0) {
        for (const bc of l.barcodes) {
          mappedLines.push({
            id: `${l.id}-${bc}`,
            editionId: l.editionId,
            isbn: l.isbn,
            titleName: l.titleName,
            grade: l.conditionGrade,
            buyPrice: l.agreedBuyPrice,
            expectedSellingPrice: l.expectedSellingPrice,
            barcodePreview: bc,
            needsApproval: l.overSingleLimit,
          })
        }
      } else {
        mappedLines.push({
          id: l.id,
          editionId: l.editionId,
          isbn: l.isbn,
          titleName: l.titleName,
          grade: l.conditionGrade,
          buyPrice: l.agreedBuyPrice,
          expectedSellingPrice: l.expectedSellingPrice,
          barcodePreview:
            detail.status === 'APPROVED' ? 'Đã duyệt → Chờ chi' : 'Chờ duyệt → Sinh mã',
          needsApproval: l.overSingleLimit,
        })
      }
    }
    setLines(mappedLines)
  }

  const handleResetNewBuyback = () => {
    setActiveBuybackId(null)
    setActiveBuybackCode('BUY-NHAP-MOI')
    setSellerName('')
    setSellerPhone('')
    setSelectedEditionId('')
    setIsbnQuery('')
    setCurrentTitle('')
    setCurrentAuthorPublisher('')
    setCurrentCoverPrice(0)
    setAgreedBuyPrice(0)
    setExpectedSalePrice(0)
    setManagerPin('')
    setApprovalStatus('DRAFT')
    setLines([])
    notify.success('Đã tạo phiếu thu mua mới (trống). Hãy quét ISBN hoặc chọn sách để định giá.')
  }

  const handleSelectEditionOption = (editionId: string) => {
    setSelectedEditionId(editionId)
    const ed = editions.find((e) => e.id === editionId)
    if (!ed) return
    const t = titlesById.get(ed.titleId)
    const cover = ed.coverPrice > 0 ? ed.coverPrice : 80000
    const meta = GRADE_META[selectedGrade]
    const suggested = Math.round((cover * meta.defaultPct) / 1000) * 1000

    setCurrentTitle(t ? `${t.name}${t.volumeLabel ? ` - ${t.volumeLabel}` : ''}` : 'Đầu sách')
    setCurrentAuthorPublisher([t?.author, ed.publisher].filter(Boolean).join(' - ') || 'NXB')
    setCurrentCoverPrice(cover)
    setIsbnQuery(ed.isbn ?? '')
    setAgreedBuyPrice(suggested)
    setExpectedSalePrice(Math.round((suggested * 1.4) / 1000) * 1000)
  }

  const handleSelectGrade = (grade: BuybackGrade) => {
    setSelectedGrade(grade)
    const meta = GRADE_META[grade]
    const suggested = Math.round((currentCoverPrice * meta.defaultPct) / 1000) * 1000
    setAgreedBuyPrice(suggested)
    setExpectedSalePrice(Math.round((suggested * 1.4) / 1000) * 1000)
  }

  const handleIsbnLookup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const clean = isbnQuery.trim()
    if (!clean) return

    setIsLookingUp(true)
    try {
      const found = await lookupBuybackIsbn(clean)
      setSelectedEditionId(found.editionId)
      setCurrentTitle(found.titleName)
      setCurrentAuthorPublisher(
        [found.author, found.publisher, found.publishYear].filter(Boolean).join(' - ') || 'Ấn bản kho',
      )
      setCurrentCoverPrice(found.coverPrice)
      const meta = GRADE_META[selectedGrade]
      const suggested = Math.round((found.coverPrice * meta.defaultPct) / 1000) * 1000
      setAgreedBuyPrice(suggested)
      setExpectedSalePrice(Math.round((suggested * 1.4) / 1000) * 1000)
      notify.success(`Đã tra cứu từ DB: "${found.titleName}" (Giá bìa ${formatVnd(found.coverPrice)}).`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không tìm thấy ISBN trong danh mục.')
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleAddEvaluatedBook = () => {
    if (!currentTitle.trim()) {
      notify.error('Vui lòng quét ISBN hoặc nhập tên sách trước khi thêm.')
      return
    }
    if (agreedBuyPrice <= 0) {
      notify.error('Vui lòng nhập Giá thỏa thuận thực tế (> 0đ) trước khi thêm.')
      return
    }
    const overLimit = agreedBuyPrice > SINGLE_ITEM_APPROVAL_LIMIT
    const seq = seqRef.current++
    const newItem: BuybackLineItem = {
      id: `bb-${seq}`,
      editionId: selectedEditionId || (editions[0]?.id ?? null),
      isbn: isbnQuery.trim() || null,
      titleName: currentTitle.trim(),
      grade: selectedGrade,
      buyPrice: agreedBuyPrice,
      expectedSellingPrice: expectedSalePrice > 0 ? expectedSalePrice : Math.round((agreedBuyPrice * 1.4) / 1000) * 1000,
      barcodePreview: overLimit ? 'Chờ duyệt → Sinh mã' : 'Chờ chi tiền → Sinh mã',
      needsApproval: overLimit,
    }
    setLines((prev) => [newItem, ...prev])
    notify.success(`Đã thêm "${newItem.titleName}" vào danh sách thu mua.`)
  }

  const handleUpdateLine = (id: string, patch: Partial<BuybackLineItem>) => {
    setLines((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        updated.needsApproval = updated.buyPrice > SINGLE_ITEM_APPROVAL_LIMIT
        return updated
      }),
    )
  }

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((item) => item.id !== id))
  }

  const refreshRecentList = async () => {
    const list = await fetchRecentBuybacks().catch(() => null)
    if (list) setRecentBuybacks(list)
  }

  const handleRequestApproval = async () => {
    if (!sellerName.trim() || !sellerPhone.trim()) {
      notify.error('Thiếu người bán: Bắt buộc nhập họ tên và số điện thoại (BR-BUY-001).')
      return
    }
    if (lines.length === 0) {
      notify.error('Phiếu thu mua cần ít nhất 1 cuốn sách.')
      return
    }

    setIsBusy(true)
    try {
      const created = await createCustomerBuyback({
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone.trim(),
        payoutMethod,
        exceedReason,
        managerPin: managerPin.trim() || null,
        completeImmediately: false,
        lines: lines.map((l) => ({
          editionId: l.editionId,
          isbn: l.isbn,
          titleName: l.titleName,
          conditionGrade: l.grade,
          agreedBuyPrice: l.buyPrice,
          expectedSellingPrice: l.expectedSellingPrice,
          quantity: 1,
        })),
      })

      applyBuybackDetail(created)
      await refreshRecentList()

      if (created.status === 'APPROVED') {
        notify.success(
          `Đã lập phiếu ${created.code} và xác nhận phê duyệt giá thu mua! Nhấn "Lập phiếu thu mua & Chi tiền" để sinh mã vạch.`,
        )
      } else {
        notify.success(`Đã gửi phiếu thu mua ${created.code} sang Trung tâm Phê duyệt!`)
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể gửi phiếu thu mua.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleOpenCompleteConfirm = () => {
    if (!sellerName.trim() || !sellerPhone.trim()) {
      notify.error('Thiếu người bán: Bắt buộc họ tên và số điện thoại trước khi lập phiếu (BR-BUY-001).')
      return
    }
    if (lines.length === 0) {
      notify.error('Phiếu thu mua cần ít nhất 1 cuốn sách.')
      return
    }
    setIsConfirmDialogOpen(true)
  }

  const handleCompleteBuyback = async () => {
    if (!sellerName.trim() || !sellerPhone.trim()) {
      notify.error('Thiếu người bán: Bắt buộc họ tên và số điện thoại trước khi lập phiếu (BR-BUY-001).')
      return
    }
    if (lines.length === 0) {
      notify.error('Phiếu thu mua cần ít nhất 1 cuốn sách.')
      return
    }

    setIsBusy(true)
    try {
      let detail: CustomerBuybackDetailDto
      if (activeBuybackId) {
        detail = await completeCustomerBuyback(activeBuybackId, {
          payoutMethod,
          managerPin: managerPin.trim() || null,
          note: exceedReason,
        })
      } else {
        detail = await createCustomerBuyback({
          sellerName: sellerName.trim(),
          sellerPhone: sellerPhone.trim(),
          payoutMethod,
          exceedReason,
          managerPin: managerPin.trim() || null,
          completeImmediately: true,
          lines: lines.map((l) => ({
            editionId: l.editionId,
            isbn: l.isbn,
            titleName: l.titleName,
            conditionGrade: l.grade,
            agreedBuyPrice: l.buyPrice,
            expectedSellingPrice: l.expectedSellingPrice,
            quantity: 1,
          })),
        })
      }

      setIsConfirmDialogOpen(false)
      applyBuybackDetail(detail)
      await refreshRecentList()
      notify.success(
        `Đã hoàn tất phiếu ${detail.code}, chi ${formatVnd(detail.totalAmount)} (${detail.paymentNo ?? payoutMethod}) và sinh ${detail.generatedCopyCount} mã CopyBarcode độc bản!`,
      )
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể hoàn tất phiếu thu mua.')
    } finally {
      setIsBusy(false)
    }
  }

  const printableLabels = useMemo<PrintableBarcodeLabelItem[]>(() => {
    return lines.map((line, idx) => {
      const hasRealBarcode = /^BC/i.test(line.barcodePreview)
      const code = hasRealBarcode
        ? line.barcodePreview
        : `BC-PREVIEW-${String(idx + 1).padStart(4, '0')}`
      return {
        barcode: code,
        titleName: line.titleName,
        sellingPrice: line.expectedSellingPrice,
        grade: line.grade,
        subtitle: hasRealBarcode ? 'Đã sinh trong kho' : 'Mã xem trước (chờ chi tiền)',
      }
    })
  }, [lines])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Thu mua sách cũ từ khách hàng</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={handleResetNewBuyback}
            type="button"
            variant="ghost"
          >
            Phiếu thu mua mới
          </Button>
          <Button
            disabled={summary.totalCopies === 0}
            icon={<Printer className="h-4 w-4" />}
            onClick={() => setIsPrintModalOpen(true)}
            type="button"
            variant="outline"
          >
            In hàng loạt mã Barcode độc bản
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] items-start">
        <div className="space-y-6">
          <Card bodyClassName="space-y-4" padding="lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Thông tin người bán bắt buộc</h3>
              <span className="text-xs text-slate-400">---</span>
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

          <PosBuybackEvaluatorCard
            agreedBuyPrice={agreedBuyPrice}
            currentAuthorPublisher={currentAuthorPublisher}
            currentCoverPrice={currentCoverPrice}
            currentTitle={currentTitle}
            editionOptions={editionOptions}
            expectedSalePrice={expectedSalePrice}
            isbnQuery={isbnQuery}
            isCurrentItemOverLimit={isCurrentItemOverLimit}
            isLookingUp={isLookingUp}
            isManualEntry={isManualEntry}
            onAddEvaluatedBook={handleAddEvaluatedBook}
            onChangeAgreedBuyPrice={setAgreedBuyPrice}
            onChangeAuthorPublisher={setCurrentAuthorPublisher}
            onChangeCoverPrice={setCurrentCoverPrice}
            onChangeExpectedSalePrice={setExpectedSalePrice}
            onChangeIsbnQuery={setIsbnQuery}
            onChangeTitle={setCurrentTitle}
            onIsbnLookup={(e) => void handleIsbnLookup(e)}
            onOpenQuickPicker={onOpenQuickPicker}
            onSelectEditionOption={handleSelectEditionOption}
            onSelectGrade={handleSelectGrade}
            onToggleManualEntry={() => setIsManualEntry((prev) => !prev)}
            selectedEditionId={selectedEditionId}
            selectedGrade={selectedGrade}
            suggestedRangeText={suggestedRangeText}
          />

          <PosBuybackLinesTableCard
            activeBuybackId={activeBuybackId}
            lines={lines}
            onRemoveLine={handleRemoveLine}
            onSelectRecentBuyback={applyBuybackDetail}
            onUpdateLine={handleUpdateLine}
            recentBuybacks={recentBuybacks}
          />
        </div>

        <PosBuybackSummarySidebar
          approvalStatus={approvalStatus}
          drawerAfter={summary.drawerAfter}
          exceedReason={exceedReason}
          isBusy={isBusy}
          managerPin={managerPin}
          onChangeExceedReason={setExceedReason}
          onChangeManagerPin={setManagerPin}
          onChangePayoutMethod={setPayoutMethod}
          onCompleteBuyback={handleOpenCompleteConfirm}
          onRequestApproval={() => void handleRequestApproval()}
          payoutMethod={payoutMethod}
          requiresApproval={summary.requiresApproval}
          totalCopies={summary.totalCopies}
          totalPayout={summary.totalPayout}
        />
      </div>

      {isConfirmDialogOpen && (
        <PosBuybackConfirmDialog
          buybackCode={activeBuybackCode}
          drawerAfter={summary.drawerAfter}
          isSubmitting={isBusy}
          lines={lines}
          onClose={() => setIsConfirmDialogOpen(false)}
          onConfirm={() => void handleCompleteBuyback()}
          payoutMethod={payoutMethod}
          sellerName={sellerName.trim()}
          sellerPhone={sellerPhone.trim()}
          totalCopies={summary.totalCopies}
          totalPayout={summary.totalPayout}
        />
      )}

      {isPrintModalOpen && (
        <BarcodeLabelsPrintModal
          batchCode={activeBuybackCode}
          items={printableLabels}
          onClose={() => setIsPrintModalOpen(false)}
          title={`In nhãn CopyBarcode sách thu mua (${printableLabels.length} tem)`}
        />
      )}

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
