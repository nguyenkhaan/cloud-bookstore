import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Printer, Search, Trash2 } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { catalogPaths } from '../catalog.route'
import {
  useActivateStockReceiptCopiesMutation,
  useAllEditionsQuery,
  useCompleteStockReceiptMutation,
  useCreateStockReceiptMutation,
  useSeriesQuery,
  useStockReceiptsQuery,
  useSuppliersQuery,
  useTitlesQuery,
  useUpdateStockReceiptMutation,
} from '../catalog.hook'
import { getStockReceipt } from '../catalog.service'
import type { CopyAvailability, StockReceiptDetail } from '../catalog.type'
import { CatalogDialog } from '../components/CatalogDialog'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'

type ReceiptLineItem = {
  id: string
  lineId?: string
  editionId: string
  titleName: string
  isbn: string
  editionInfo: string
  formatInfo: string
  discountPct: number
  quantity: number
  unitCost: number
  coverPrice: number
  sellingPrice: number
  rentalRate: number
  availability: CopyAvailability
  firstBarcode?: string | null
  lastBarcode?: string | null
  barcodes: string[]
  barcodeStart: number
  barcodeEnd: number
  status: 'PENDING_BARCODE' | 'BARCODE_GENERATED' | 'AVAILABLE'
}

const PAYMENT_STATUS_OPTIONS: SelectOption<string>[] = [
  { value: 'PARTIAL', label: 'Thanh toán một phần' },
  { value: 'PAID', label: 'Đã thanh toán đủ' },
  { value: 'UNPAID', label: 'Công nợ toàn bộ' },
]

const AVAILABILITY_OPTIONS: SelectOption<CopyAvailability>[] = [
  { value: 'BOTH', label: 'Bán & Cho thuê' },
  { value: 'SALE_ONLY', label: 'Chỉ bán' },
  { value: 'RENTAL_ONLY', label: 'Chỉ cho thuê' },
]

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

function formatPreviewBarcode(num: number): string {
  return `BC${String(num).padStart(8, '0')}`
}

function formatDateVi(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN')
}

export default function StockReceiptsPage() {
  const navigate = useNavigate()
  const lineSeqRef = useRef(1)

  const suppliersQuery = useSuppliersQuery({ isActive: true })
  const seriesQuery = useSeriesQuery()
  const titlesQuery = useTitlesQuery()
  const editionsQuery = useAllEditionsQuery()
  const receiptsQuery = useStockReceiptsQuery({ pageSize: 20 })

  const createReceiptMutation = useCreateStockReceiptMutation()
  const updateReceiptMutation = useUpdateStockReceiptMutation()
  const completeReceiptMutation = useCompleteStockReceiptMutation()
  const activateCopiesMutation = useActivateStockReceiptCopiesMutation()

  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null)
  const [activeReceiptCode, setActiveReceiptCode] = useState<string>('PN-NHAP-MOI')
  const [step, setStep] = useState<1 | 2>(1)
  const [supplierId, setSupplierId] = useState('')
  const [invoiceInfo, setInvoiceInfo] = useState('Hóa đơn nhập kho NCC')
  const [contactDeliverer, setContactDeliverer] = useState('')
  const [warehouseLocation, setWarehouseLocation] = useState('Cơ sở 01 - Kho chính')
  const [paymentStatus, setPaymentStatus] = useState('PARTIAL')
  const [paidAmount, setPaidAmount] = useState(100000)
  const [dueDate, setDueDate] = useState('30 ngày sau ngày nhập')
  const [lines, setLines] = useState<ReceiptLineItem[] | null>(null)
  const [selectedEditionId, setSelectedEditionId] = useState('')
  const [quickSearch, setQuickSearch] = useState('')
  const [receiptStage, setReceiptStage] = useState<'DRAFT' | 'BARCODE_READY' | 'AVAILABLE'>('DRAFT')

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false)
  const [batchSeriesId, setBatchSeriesId] = useState('')
  const [batchFromVol, setBatchFromVol] = useState('1')
  const [batchToVol, setBatchToVol] = useState('5')
  const [batchQuantityEach, setBatchQuantityEach] = useState('5')
  const [batchUnitCost, setBatchUnitCost] = useState('25000')

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data])
  const titles = useMemo(() => titlesQuery.data ?? [], [titlesQuery.data])
  const editions = useMemo(() => editionsQuery.data ?? [], [editionsQuery.data])
  const recentReceipts = useMemo(() => receiptsQuery.data ?? [], [receiptsQuery.data])

  const effectiveSupplierId = supplierId || (suppliers[0]?.id ?? '')
  const effectiveSelectedEditionId = selectedEditionId || (editions[0]?.id ?? '')

  const titlesById = useMemo(() => {
    const map = new Map<string, (typeof titles)[number]>()
    for (const t of titles) {
      map.set(t.id, t)
    }
    return map
  }, [titles])

  const supplierOptions = useMemo<SelectOption<string>[]>(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: `${s.code} - ${s.name}`,
    }))
  }, [suppliers])

  const editionOptions = useMemo<SelectOption<string>[]>(() => {
    return editions.map((ed) => {
      const title = titlesById.get(ed.titleId)
      const titleLabel = title
        ? `${title.name}${title.volumeLabel ? ` (${title.volumeLabel})` : ''}`
        : 'Đầu sách'
      const isbnPart = ed.isbn ? `ISBN ${ed.isbn}` : 'Chưa có ISBN'
      const pubPart = [ed.publisher, ed.publishYear].filter(Boolean).join(' ')
      return {
        value: ed.id,
        label: `${titleLabel} - ${isbnPart}${pubPart ? ` - ${pubPart}` : ''}`,
      }
    })
  }, [editions, titlesById])

  const seriesOptions = useMemo<SelectOption<string>[]>(() => {
    return (seriesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }))
  }, [seriesQuery.data])

  const recomputeBarcodes = (items: ReceiptLineItem[]): ReceiptLineItem[] => {
    let cursor = 1
    return items.map((item) => {
      const qty = Math.max(1, item.quantity)
      const start = cursor
      const end = cursor + qty - 1
      cursor = end + 1
      return { ...item, barcodeStart: start, barcodeEnd: end }
    })
  }

  const defaultLines = useMemo<ReceiptLineItem[]>(() => {
    if (editions.length === 0 || titles.length === 0) return []
    let cursor = 1
    return editions.slice(0, 3).map((ed, idx) => {
      const title = titlesById.get(ed.titleId)
      const cover = ed.coverPrice > 0 ? ed.coverPrice : 60000
      const cost = Math.round(cover * 0.65)
      const selling = cover
      const discount = cover > 0 ? Math.round(((cover - cost) / cover) * 10000) / 100 : 0
      const start = cursor
      const end = cursor + 4
      cursor = end + 1

      return {
        id: `line-init-${idx + 1}`,
        editionId: ed.id,
        titleName: title
          ? `${title.name}${title.volumeLabel ? ` - ${title.volumeLabel}` : ''}`
          : 'Đầu sách',
        isbn: ed.isbn ?? 'Chưa có ISBN',
        editionInfo: [ed.publisher ?? 'NXB', ed.publishYear ?? 2025].join(' - '),
        formatInfo: ed.format ?? '11 x 18 cm',
        discountPct: discount,
        quantity: 5,
        unitCost: cost,
        coverPrice: cover,
        sellingPrice: selling,
        rentalRate: Math.max(2000, Math.round(selling / 15 / 500) * 500),
        availability: 'BOTH' as CopyAvailability,
        barcodes: [],
        barcodeStart: start,
        barcodeEnd: end,
        status: 'PENDING_BARCODE' as const,
      }
    })
  }, [editions, titles, titlesById])

  const activeLines = lines ?? defaultLines

  const totals = useMemo(() => {
    const totalCopies = activeLines.reduce((sum, l) => sum + l.quantity, 0)
    const totalAmount = activeLines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
    const effectivePaid =
      paymentStatus === 'PAID' ? totalAmount : paymentStatus === 'UNPAID' ? 0 : Math.min(paidAmount, totalAmount)
    const debtAmount = Math.max(0, totalAmount - effectivePaid)
    return {
      totalCopies,
      totalTitles: activeLines.length,
      totalAmount,
      effectivePaid,
      debtAmount,
    }
  }, [activeLines, paymentStatus, paidAmount])

  const applyReceiptDetailToState = (detail: StockReceiptDetail) => {
    setActiveReceiptId(detail.id)
    setActiveReceiptCode(detail.code)
    if (detail.supplierId) {
      setSupplierId(detail.supplierId)
    }
    if (detail.note) {
      setInvoiceInfo(detail.note)
    }

    const allAvailable =
      detail.lines.length > 0 &&
      detail.lines.every((l) => l.generatedCopyCount > 0 && l.copyStatus === 'AVAILABLE')
    const anyGenerated = detail.lines.some((l) => l.generatedCopyCount > 0)

    if (allAvailable) {
      setReceiptStage('AVAILABLE')
    } else if (detail.status === 'COMPLETED' || anyGenerated) {
      setReceiptStage('BARCODE_READY')
    } else {
      setReceiptStage('DRAFT')
    }

    const mappedLines: ReceiptLineItem[] = detail.lines.map((l) => {
      const cover = l.coverPrice > 0 ? l.coverPrice : Math.max(l.unitCost, 50000)
      const selling = l.sellingPrice && l.sellingPrice > 0 ? l.sellingPrice : cover
      const rental =
        l.rentalRate && l.rentalRate > 0
          ? l.rentalRate
          : Math.max(2000, Math.round(selling / 15 / 500) * 500)
      const discount =
        cover > 0 ? Math.max(0, Math.round(((cover - l.unitCost) / cover) * 10000) / 100) : 0

      const lineStatus: ReceiptLineItem['status'] =
        l.copyStatus === 'AVAILABLE'
          ? 'AVAILABLE'
          : l.generatedCopyCount > 0
            ? 'BARCODE_GENERATED'
            : 'PENDING_BARCODE'

      return {
        id: l.id,
        lineId: l.id,
        editionId: l.editionId,
        titleName: `${l.titleName}${l.volumeLabel ? ` - ${l.volumeLabel}` : ''}`,
        isbn: l.isbn ?? 'Chưa có ISBN',
        editionInfo: [l.publisher ?? 'NXB', l.publishYear ?? 2025].join(' - '),
        formatInfo: l.format ?? l.editionStatement ?? 'Bìa mềm',
        discountPct: discount,
        quantity: l.quantity,
        unitCost: l.unitCost,
        coverPrice: cover,
        sellingPrice: selling,
        rentalRate: rental,
        availability: l.availability,
        firstBarcode: l.firstBarcode,
        lastBarcode: l.lastBarcode,
        barcodes: l.barcodes,
        barcodeStart: 1,
        barcodeEnd: l.quantity,
        status: lineStatus,
      }
    })

    setLines(recomputeBarcodes(mappedLines))
  }

  const handleLoadReceipt = async (receiptId: string) => {
    try {
      const detail = await getStockReceipt(receiptId)
      applyReceiptDetailToState(detail)
      notify.success(`Đã nạp phiếu nhập ${detail.code}.`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể tải chi tiết phiếu nhập.')
    }
  }

  const handleResetNewDraft = () => {
    setActiveReceiptId(null)
    setActiveReceiptCode('PN-NHAP-MOI')
    setReceiptStage('DRAFT')
    setStep(1)
    setLines((prev) =>
      recomputeBarcodes(
        (prev ?? defaultLines).map((l) => ({
          ...l,
          lineId: undefined,
          firstBarcode: null,
          lastBarcode: null,
          barcodes: [],
          status: 'PENDING_BARCODE',
        })),
      ),
    )
    notify.success('Đã khởi tạo biểu mẫu phiếu nhập mới.')
  }

  const handleUpdateLine = (id: string, patch: Partial<ReceiptLineItem>) => {
    setLines((prev) => {
      const base = prev ?? defaultLines
      const next = base.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        if (updated.coverPrice > 0) {
          updated.discountPct = Math.max(
            0,
            Math.round(((updated.coverPrice - updated.unitCost) / updated.coverPrice) * 10000) / 100,
          )
        }
        return updated
      })
      return recomputeBarcodes(next)
    })
  }

  const handleRemoveLine = (id: string) => {
    if (activeLines.length <= 1) {
      notify.error('Phiếu nhập cần ít nhất 1 dòng sách.')
      return
    }
    setLines((prev) => recomputeBarcodes((prev ?? defaultLines).filter((l) => l.id !== id)))
  }

  const buildLineFromEdition = (editionId: string, quantity = 5, customCost?: number): ReceiptLineItem | null => {
    const ed = editions.find((e) => e.id === editionId)
    if (!ed) return null
    const title = titlesById.get(ed.titleId)
    const cover = ed.coverPrice > 0 ? ed.coverPrice : 60000
    const cost = customCost ?? Math.round(cover * 0.65)
    const selling = cover
    const discount = cover > 0 ? Math.max(0, Math.round(((cover - cost) / cover) * 10000) / 100) : 0
    const seq = lineSeqRef.current++

    return {
      id: `line-${seq}`,
      editionId: ed.id,
      titleName: title
        ? `${title.name}${title.volumeLabel ? ` - ${title.volumeLabel}` : ''}`
        : 'Đầu sách',
      isbn: ed.isbn ?? 'Chưa có ISBN',
      editionInfo: [ed.publisher ?? 'NXB', ed.publishYear ?? 2025].join(' - '),
      formatInfo: ed.format ?? ed.editionStatement ?? '11 x 18 cm',
      discountPct: discount,
      quantity,
      unitCost: cost,
      coverPrice: cover,
      sellingPrice: selling,
      rentalRate: Math.max(2000, Math.round(selling / 15 / 500) * 500),
      availability: 'BOTH',
      barcodes: [],
      barcodeStart: 1,
      barcodeEnd: quantity,
      status: 'PENDING_BARCODE',
    }
  }

  const handleAddSelectedEdition = () => {
    if (!effectiveSelectedEditionId) {
      notify.error('Vui lòng chọn một ấn bản để thêm vào phiếu.')
      return
    }
    const existing = activeLines.find((l) => l.editionId === effectiveSelectedEditionId)
    if (existing) {
      handleUpdateLine(existing.id, { quantity: existing.quantity + 5 })
      notify.success(`Đã cộng thêm 5 cuốn cho "${existing.titleName}".`)
      return
    }
    const newLine = buildLineFromEdition(effectiveSelectedEditionId, 5)
    if (!newLine) return
    setLines((prev) => recomputeBarcodes([...(prev ?? defaultLines), newLine]))
    notify.success(`Đã thêm "${newLine.titleName}" vào phiếu nhập.`)
  }

  const handleQuickAddTitle = (e: React.FormEvent) => {
    e.preventDefault()
    const term = quickSearch.trim().toLowerCase()
    if (!term) {
      handleAddSelectedEdition()
      return
    }

    const matchedEdition = editions.find((ed) => {
      const title = titlesById.get(ed.titleId)
      const isbnMatch = ed.isbn?.toLowerCase().replace(/-/g, '').includes(term.replace(/-/g, ''))
      const titleMatch = title?.name.toLowerCase().includes(term)
      return Boolean(isbnMatch || titleMatch)
    })

    if (!matchedEdition) {
      notify.error(`Không tìm thấy ấn bản nào khớp với "${quickSearch}".`)
      return
    }

    const newLine = buildLineFromEdition(matchedEdition.id, 5)
    if (!newLine) return

    setLines((prev) => recomputeBarcodes([...(prev ?? defaultLines), newLine]))
    setQuickSearch('')
    notify.success(`Đã thêm "${newLine.titleName}" vào phiếu nhập.`)
  }

  const handleBatchSeriesImport = (e: React.FormEvent) => {
    e.preventDefault()
    const fromVol = Math.max(1, Number(batchFromVol) || 1)
    const toVol = Math.max(fromVol, Number(batchToVol) || fromVol)
    const qty = Math.max(1, Number(batchQuantityEach) || 5)
    const cost = Math.max(1000, Number(batchUnitCost) || 25000)

    const seriesTitles = titles.filter((t) => t.seriesId === batchSeriesId)
    const seriesTitleIds = new Set(seriesTitles.map((t) => t.id))
    const seriesEditions = editions.filter((ed) => seriesTitleIds.has(ed.titleId))

    const targetEditions =
      seriesEditions.length > 0
        ? seriesEditions.slice(0, toVol - fromVol + 1)
        : editions.slice(0, Math.min(5, toVol - fromVol + 1))

    if (targetEditions.length === 0) {
      notify.error('Chưa có ấn bản nào trong hệ thống để thêm theo bộ.')
      return
    }

    const generated: ReceiptLineItem[] = []
    for (const ed of targetEditions) {
      const built = buildLineFromEdition(ed.id, qty, cost)
      if (built) generated.push(built)
    }

    setLines((prev) => recomputeBarcodes([...(prev ?? defaultLines), ...generated]))
    setIsSeriesModalOpen(false)
    notify.success(`Đã thêm ${generated.length} ấn bản vào phiếu nhập.`)
  }

  const saveDraftInternalAsync = async (): Promise<StockReceiptDetail | null> => {
    if (!effectiveSupplierId) {
      notify.error('Vui lòng chọn nhà cung cấp.')
      return null
    }
    if (activeLines.length === 0) {
      notify.error('Phiếu nhập phải có ít nhất 1 dòng sách.')
      return null
    }

    const noteParts = [invoiceInfo.trim(), contactDeliverer.trim(), warehouseLocation.trim()].filter(Boolean)
    const payload = {
      supplierId: effectiveSupplierId,
      note: noteParts.join(' | '),
      lines: activeLines.map((l) => ({
        editionId: l.editionId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        conditionGrade: 'A' as const,
        availability: l.availability,
      })),
    }

    if (activeReceiptId && receiptStage === 'DRAFT') {
      return await updateReceiptMutation.mutateAsync({
        receiptId: activeReceiptId,
        request: payload,
      })
    }

    return await createReceiptMutation.mutateAsync(payload)
  }

  const handleSaveDraft = async () => {
    try {
      const saved = await saveDraftInternalAsync()
      if (!saved) return
      applyReceiptDetailToState(saved)
      notify.success(`Đã lưu bản nháp phiếu nhập kho ${saved.code}.`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể lưu bản nháp phiếu nhập.')
    }
  }

  const handleConfirmGenerateBarcodes = async () => {
    for (const line of activeLines) {
      if (line.sellingPrice <= 0) {
        notify.error(`Vui lòng nhập Giá bán niêm yết hợp lệ cho "${line.titleName}".`)
        return
      }
    }

    try {
      let receiptId = activeReceiptId
      let currentLines = activeLines

      if (!receiptId || receiptStage === 'DRAFT') {
        const saved = await saveDraftInternalAsync()
        if (!saved) return
        receiptId = saved.id
        currentLines = activeLines.map((uiLine, idx) => ({
          ...uiLine,
          lineId: saved.lines[idx]?.id ?? uiLine.lineId,
        }))
      }

      const completed = await completeReceiptMutation.mutateAsync({
        receiptId,
        request: {
          activateImmediately: false,
          note: [invoiceInfo.trim(), contactDeliverer.trim(), warehouseLocation.trim()].filter(Boolean).join(' | '),
          lines: currentLines.map((l) => ({
            lineId: l.lineId,
            editionId: l.editionId,
            sellingPrice: l.sellingPrice,
            rentalRate: l.rentalRate,
            availability: l.availability,
          })),
        },
      })

      applyReceiptDetailToState(completed)
      setReceiptStage('BARCODE_READY')
      setStep(2)
      notify.success(
        `Đã xác nhận phiếu ${completed.code} và sinh ${completed.generatedCopyCount} mã CopyBarcode độc bản!`,
      )
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể hoàn tất phiếu nhập kho.')
    }
  }

  const handleActivateAvailable = async () => {
    if (!activeReceiptId) {
      notify.error('Vui lòng xác nhận nhập kho & sinh Barcode trước khi mở bán.')
      return
    }

    try {
      const activated = await activateCopiesMutation.mutateAsync({
        receiptId: activeReceiptId,
        request: {
          lines: activeLines.map((l) => ({
            lineId: l.lineId,
            editionId: l.editionId,
            sellingPrice: l.sellingPrice,
            rentalRate: l.rentalRate,
            availability: l.availability,
          })),
        },
      })

      applyReceiptDetailToState(activated)
      setReceiptStage('AVAILABLE')
      notify.success(
        `Đã chuyển toàn bộ ${activated.generatedCopyCount} bản sách của phiếu ${activated.code} sang trạng thái Khả dụng (AVAILABLE)!`,
      )
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể kích hoạt trạng thái Khả dụng.')
    }
  }

  const isBusy =
    createReceiptMutation.isPending ||
    updateReceiptMutation.isPending ||
    completeReceiptMutation.isPending ||
    activateCopiesMutation.isPending

  return (
    <WarehouseWorkspace
      action={
        <div className="flex items-center gap-2">
          {activeReceiptId && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={handleResetNewDraft}
              type="button"
              variant="ghost"
            >
              Tạo phiếu mới
            </Button>
          )}
          <Button
            disabled={isBusy || receiptStage !== 'DRAFT'}
            onClick={() => void handleSaveDraft()}
            variant="outline"
          >
            {createReceiptMutation.isPending || updateReceiptMutation.isPending ? 'Đang lưu...' : 'Lưu bản nháp'}
          </Button>
        </div>
      }
      title="Lập & Quản lý Phiếu nhập kho từ NCC"
    >

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-2">
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            step === 1
              ? 'bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-200'
              : 'text-slate-600 hover:text-indigo-700'
          }`}
          onClick={() => setStep(1)}
          type="button"
        >
          <Check className="h-3.5 w-3.5 text-indigo-600" />
          1. Nhà cung cấp & Danh mục nhập
        </button>
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            step === 2
              ? 'bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-200'
              : 'text-slate-600 hover:text-indigo-700'
          }`}
          onClick={() => setStep(2)}
          type="button"
        >
          2. Giá bán & Sinh Barcode
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] items-start">
        <div className="space-y-6">
          <Card bodyClassName="space-y-5" padding="lg">
            <h2 className="text-sm font-bold text-slate-900">Thông tin nhà cung cấp</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectBox
                label="Nhà cung cấp *"
                onChange={(val) => {
                  setSupplierId(val)
                  const found = suppliers.find((s) => s.id === val)
                  if (found?.phone) setContactDeliverer(found.phone)
                }}
                options={supplierOptions}
                placeholder="Chọn nhà cung cấp..."
                searchPlaceholder="Tìm mã hoặc tên NCC..."
                value={effectiveSupplierId}
              />
              <TextField
                label="Ngày nhập / Hóa đơn"
                onChange={(e) => setInvoiceInfo(e.target.value)}
                value={invoiceInfo}
              />
              <TextField
                label="Người giao / Liên hệ"
                onChange={(e) => setContactDeliverer(e.target.value)}
                value={contactDeliverer}
              />
              <TextField
                label="Kho nhận / Vị trí"
                onChange={(e) => setWarehouseLocation(e.target.value)}
                value={warehouseLocation}
              />
            </div>

            <div>
              <Button
                onClick={() => navigate(catalogPaths.suppliers)}
                type="button"
                variant="outline"
              >
                + Tạo nhanh nhà cung cấp
              </Button>
            </div>
          </Card>

          <Card bodyClassName="space-y-5" padding="lg">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bước 1 - Danh mục nhập đã xác nhận</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Mặc định Grade A, mỗi bản vật lý nhận một Barcode riêng từ hệ thống.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] items-end">
              <SelectBox
                label="Chọn nhanh Ấn bản từ danh mục"
                onChange={(val) => setSelectedEditionId(val)}
                options={editionOptions}
                placeholder="Chọn ấn bản sách..."
                searchPlaceholder="Tìm theo tên đầu sách hoặc ISBN..."
                value={effectiveSelectedEditionId}
              />
              <Button
                disabled={receiptStage !== 'DRAFT'}
                onClick={handleAddSelectedEdition}
                type="button"
                variant="secondary"
              >
                + Thêm ấn bản đã chọn
              </Button>
            </div>

            <form className="flex flex-wrap gap-2" onSubmit={handleQuickAddTitle}>
              <div className="relative flex-1 min-w-60">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  aria-label="Tìm đầu sách hoặc ISBN để thêm vào phiếu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Hoặc quét/nhập tên đầu sách, ISBN để thêm nhanh..."
                  type="text"
                  value={quickSearch}
                />
              </div>
              <Button disabled={receiptStage !== 'DRAFT'} type="submit" variant="outline">
                Tìm & Thêm
              </Button>
            </form>

            <div className="space-y-1.5">
              <Button
                disabled={receiptStage !== 'DRAFT'}
                onClick={() => {
                  if (!batchSeriesId && seriesOptions[0]) setBatchSeriesId(seriesOptions[0].value)
                  setIsSeriesModalOpen(true)
                }}
                type="button"
                variant="outline"
              >
                + Nhập theo Trọn bộ (Boxset / Series)
              </Button>
              <p className="text-[11px] font-semibold text-indigo-700">
                Chọn bộ sách - từ tập A đến tập B → Thêm từng tập và chọn đúng ấn bản
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left" scope="col">Đầu sách - Tập</th>
                    <th className="px-3 py-3 text-left" scope="col">ISBN-13 / Năm tái bản / Khổ sách</th>
                    <th className="px-3 py-3 text-left" scope="col">% Chiết khấu NCC</th>
                    <th className="px-3 py-3 text-left" scope="col">Số lượng nhập</th>
                    <th className="px-3 py-3 text-left" scope="col">Giá vốn</th>
                    <th className="px-3 py-3 text-left" scope="col">Giá bìa niêm yết</th>
                    <th className="px-2 py-3 text-center" scope="col">
                      <span className="sr-only">Xóa</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLines.map((line) => (
                    <tr className="hover:bg-slate-50/60" key={line.id}>
                      <td className="px-4 py-3.5 font-bold text-slate-900 align-top">
                        {line.titleName}
                      </td>
                      <td className="px-3 py-3.5 text-slate-500 align-top space-y-0.5">
                        <span className="block font-mono text-[11px] text-slate-700">ISBN {line.isbn}</span>
                        <span className="block text-[11px]">{line.editionInfo}</span>
                        <span className="block text-[11px]">{line.formatInfo}</span>
                      </td>
                      <td className="px-3 py-3.5 text-slate-700 font-medium align-top">
                        {line.discountPct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <input
                          aria-label={`Số lượng nhập ${line.titleName}`}
                          className="w-18 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                          disabled={receiptStage !== 'DRAFT'}
                          min={1}
                          onChange={(e) =>
                            handleUpdateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                          type="number"
                          value={line.quantity}
                        />
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <input
                          aria-label={`Giá vốn ${line.titleName}`}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                          disabled={receiptStage !== 'DRAFT'}
                          min={0}
                          onChange={(e) =>
                            handleUpdateLine(line.id, { unitCost: Math.max(0, Number(e.target.value) || 0) })
                          }
                          step={1000}
                          type="number"
                          value={line.unitCost}
                        />
                      </td>
                      <td className="px-3 py-3.5 text-slate-700 font-medium align-top">
                        {formatVnd(line.coverPrice)}
                      </td>
                      <td className="px-2 py-3.5 text-center align-top">
                        <button
                          aria-label={`Xóa dòng ${line.titleName}`}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          disabled={receiptStage !== 'DRAFT'}
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

            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
              Tổng cộng <strong>{totals.totalCopies} bản sách</strong> trên{' '}
              <strong>{totals.totalTitles} đầu sách</strong> - Mỗi bản vật lý sẽ được cấp một mã CopyBarcode duy nhất từ sequence khi xác nhận.
            </div>
          </Card>

          <Card bodyClassName="space-y-5" padding="lg">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bước 2 - Thiết lập giá bán & Sinh Barcode</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Giá bán thực tế là căn cứ thu cọc 100% trong giao dịch thuê sau này.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left" scope="col">Đầu sách</th>
                    <th className="px-3 py-3 text-left" scope="col">Giá bán niêm yết *</th>
                    <th className="px-3 py-3 text-left" scope="col">Thuê/ngày</th>
                    <th className="px-3 py-3 text-left" scope="col">Kênh sử dụng</th>
                    <th className="px-3 py-3 text-left" scope="col">Dải Barcode</th>
                    <th className="px-4 py-3 text-left" scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLines.map((line) => {
                    const barcodeRangeText =
                      line.firstBarcode && line.lastBarcode
                        ? `${line.firstBarcode} → ${line.lastBarcode}`
                        : `Dự kiến (${line.quantity} mã)`
                    return (
                      <tr className="hover:bg-slate-50/60" key={line.id}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{line.titleName}</td>
                        <td className="px-3 py-3.5">
                          <input
                            aria-label={`Giá bán niêm yết ${line.titleName}`}
                            className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:outline-hidden"
                            min={1000}
                            onChange={(e) =>
                              handleUpdateLine(line.id, { sellingPrice: Math.max(0, Number(e.target.value) || 0) })
                            }
                            step={1000}
                            type="number"
                            value={line.sellingPrice}
                          />
                        </td>
                        <td className="px-3 py-3.5">
                          <input
                            aria-label={`Đơn giá thuê mỗi ngày ${line.titleName}`}
                            className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                            min={0}
                            onChange={(e) =>
                              handleUpdateLine(line.id, { rentalRate: Math.max(0, Number(e.target.value) || 0) })
                            }
                            step={500}
                            type="number"
                            value={line.rentalRate}
                          />
                        </td>
                        <td className="px-3 py-3.5 min-w-38">
                          <SelectBox
                            hideLabel
                            label={`Kênh sử dụng ${line.titleName}`}
                            onChange={(val) => handleUpdateLine(line.id, { availability: val })}
                            options={AVAILABILITY_OPTIONS}
                            searchable={false}
                            value={line.availability}
                          />
                        </td>
                        <td className="px-3 py-3.5 font-mono text-slate-600">{barcodeRangeText}</td>
                        <td className="px-4 py-3.5">
                          {line.status === 'AVAILABLE' ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              Khả dụng (AVAILABLE)
                            </span>
                          ) : line.status === 'BARCODE_GENERATED' ? (
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                              Đã sinh Barcode
                            </span>
                          ) : (
                            <span className="text-slate-500">Chờ hoàn tất nhập</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-950">
              Bản sách tiếp tục ở trạng thái Chờ hoàn tất nhập cho đến khi xác nhận đầy đủ Giá bán niêm yết. Chưa được bán hoặc cho thuê tại POS.
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button onClick={() => setStep(1)} type="button" variant="outline">
                &lt; Quay lại bước 1
              </Button>
              <Button
                disabled={isBusy || receiptStage !== 'DRAFT'}
                onClick={() => void handleConfirmGenerateBarcodes()}
                type="button"
                variant="primary"
              >
                {completeReceiptMutation.isPending ? 'Đang sinh Barcode...' : 'Xác nhận nhập kho & Sinh Barcode'}
              </Button>
              <Button
                onClick={() => setIsPrintModalOpen(true)}
                type="button"
                variant="outline"
              >
                In toàn bộ mã vạch của đợt nhập
              </Button>
            </div>
          </Card>

          <Card bodyClassName="space-y-3.5" padding="lg">
            <h2 className="text-sm font-bold text-slate-900">Hoàn tất giá bán niêm yết</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                disabled={isBusy || receiptStage === 'DRAFT' || receiptStage === 'AVAILABLE'}
                onClick={() => void handleActivateAvailable()}
                type="button"
                variant="secondary"
              >
                {activateCopiesMutation.isPending ? 'Đang kích hoạt...' : 'Xác nhận giá bán → Chuyển Khả dụng'}
              </Button>
              <p className="text-xs text-slate-500 flex-1">
                Chỉ bật sau khi phiếu được duyệt và đã sinh Barcode. Xác nhận giá bán cho đủ {totals.totalCopies} bản để mở bán / cho thuê.
              </p>
            </div>
          </Card>

          {receiptStage !== 'DRAFT' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-800">Sau duyệt - Trạng thái phiếu nhập ({activeReceiptCode})</p>
                <p className="mt-1">
                  Phiếu nhập đã xác nhận thành công. Đã sinh <strong>{totals.totalCopies} mã CopyBarcode</strong> trong cơ sở dữ liệu.
                </p>
              </div>
              <button
                className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                onClick={() => setIsPrintModalOpen(true)}
                type="button"
              >
                <Printer className="h-4 w-4" />
                Chuyển sang In nhãn Barcode ngay →
              </button>
            </div>
          )}

          <Card className="overflow-hidden" padding="none">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Phiếu nhập gần đây ({recentReceipts.length})</h2>
              <span className="text-[11px] text-slate-500">Nhấn vào dòng bất kỳ để xem chi tiết & mã vạch đã sinh</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-left" scope="col">Mã phiếu / NCC</th>
                    <th className="px-4 py-3 text-left" scope="col">Ngày nhập</th>
                    <th className="px-4 py-3 text-left" scope="col">Số lượng</th>
                    <th className="px-4 py-3 text-left" scope="col">Giá trị</th>
                    <th className="px-5 py-3 text-left" scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReceipts.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-slate-400" colSpan={5}>
                        Chưa có phiếu nhập kho nào.
                      </td>
                    </tr>
                  ) : (
                    recentReceipts.map((rec) => (
                      <tr
                        className={`cursor-pointer transition hover:bg-slate-50/70 ${
                          activeReceiptId === rec.id ? 'bg-indigo-50/60' : ''
                        }`}
                        key={rec.id}
                        onClick={() => void handleLoadReceipt(rec.id)}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-slate-900 block">{rec.code}</span>
                          <span className="text-slate-600">{rec.supplierName ?? 'Nhà cung cấp'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{formatDateVi(rec.createdAt)}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {rec.totalCopies} cuốn ({rec.generatedCopyCount} mã vạch)
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">{formatVnd(rec.totalAmount)}</td>
                        <td className="px-5 py-3.5">
                          {rec.status === 'COMPLETED' ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              Hoàn tất
                            </span>
                          ) : rec.status === 'DRAFT' ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                              Bản nháp
                            </span>
                          ) : (
                            <span className="text-slate-600">{rec.status}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card bodyClassName="space-y-5" className="lg:sticky lg:top-20" padding="lg">
          <h2 className="text-sm font-bold text-slate-900">Giá trị & Công nợ</h2>

          <div className="space-y-2.5 border-b border-slate-100 pb-4 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">
                {totals.totalCopies} cuốn - {totals.totalTitles} đầu sách
              </span>
              <span className="text-base font-black text-slate-900">{formatVnd(totals.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Đã thanh toán</span>
              <input
                aria-label="Số tiền đã thanh toán cho nhà cung cấp"
                className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                disabled={paymentStatus !== 'PARTIAL'}
                min={0}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                step={50000}
                type="number"
                value={totals.effectivePaid}
              />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">Phải trả NCC</span>
              <span className="text-sm font-black text-amber-600">{formatVnd(totals.debtAmount)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <SelectBox
              label="Trạng thái thanh toán"
              onChange={(val) => setPaymentStatus(val)}
              options={PAYMENT_STATUS_OPTIONS}
              searchable={false}
              value={paymentStatus}
            />

            <TextField
              label="Hạn thanh toán"
              onChange={(e) => setDueDate(e.target.value)}
              value={dueDate}
            />
          </div>

          <div className="pt-1">
            {receiptStage === 'AVAILABLE' ? (
              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                Đã hoàn tất nhập kho
              </span>
            ) : receiptStage === 'BARCODE_READY' ? (
              <span className="inline-flex items-center rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                Đã sinh Barcode - Chờ mở bán
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                Bản nháp - Chờ xác nhận nhập kho
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-3">
            <p>Mã phiếu: <strong>{activeReceiptCode}</strong></p>
            <p>Mọi thao tác xác nhận nhập kho & sinh CopyBarcode đều được lưu nhật ký kiểm toán.</p>
          </div>
        </Card>
      </div>

      {isSeriesModalOpen && (
        <CatalogDialog
          onClose={() => setIsSeriesModalOpen(false)}
          title="Nhập kho theo Trọn bộ (Boxset / Series)"
        >
          <form className="space-y-4" onSubmit={handleBatchSeriesImport}>
            <SelectBox
              label="Chọn Bộ sách *"
              onChange={(val) => setBatchSeriesId(val)}
              options={seriesOptions}
              placeholder="Chọn bộ truyện..."
              searchPlaceholder="Tìm tên bộ truyện..."
              value={batchSeriesId}
            />
            <div className="grid grid-cols-3 gap-3">
              <TextField
                label="Từ tập *"
                min={1}
                onChange={(e) => setBatchFromVol(e.target.value)}
                required
                type="number"
                value={batchFromVol}
              />
              <TextField
                label="Đến tập *"
                min={1}
                onChange={(e) => setBatchToVol(e.target.value)}
                required
                type="number"
                value={batchToVol}
              />
              <TextField
                label="Số bản / tập *"
                min={1}
                onChange={(e) => setBatchQuantityEach(e.target.value)}
                required
                type="number"
                value={batchQuantityEach}
              />
            </div>
            <TextField
              label="Giá vốn / cuốn (VNĐ)"
              min={0}
              onChange={(e) => setBatchUnitCost(e.target.value)}
              required
              type="number"
              value={batchUnitCost}
            />
            <p className="text-xs text-slate-500">
              Hệ thống sẽ lấy danh sách ấn bản thuộc bộ sách đã chọn và cấp dải CopyBarcode riêng cho từng cuốn.
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsSeriesModalOpen(false)} type="button" variant="ghost">
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Thêm các tập vào phiếu
              </Button>
            </div>
          </form>
        </CatalogDialog>
      )}

      {isPrintModalOpen && (
        <CatalogDialog
          onClose={() => setIsPrintModalOpen(false)}
          title={`In nhãn CopyBarcode đợt nhập (${totals.totalCopies} tem nhiệt)`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Xem trước mẫu tem nhiệt dán gáy sách (kích thước chuẩn 50mm x 30mm):
            </p>
            <div className="grid gap-3 sm:grid-cols-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {activeLines.map((line) => {
                const firstCode = line.firstBarcode ?? formatPreviewBarcode(line.barcodeStart)
                const lastCode = line.lastBarcode ?? formatPreviewBarcode(line.barcodeEnd)
                return (
                  <div
                    className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center shadow-2xs"
                    key={line.id}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      CLOUD BOOKSTORE
                    </p>
                    <p className="mt-1 font-mono text-sm font-black tracking-wider text-slate-900">
                      || ||| || |||| {firstCode}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{line.titleName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-indigo-700">
                      Giá bán: {formatVnd(line.sellingPrice)} ({line.quantity} tem: {firstCode} → {lastCode})
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsPrintModalOpen(false)} type="button" variant="ghost">
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setIsPrintModalOpen(false)
                  notify.success(`Đã gửi lệnh in ${totals.totalCopies} tem CopyBarcode ra máy in nhiệt!`)
                }}
                type="button"
                variant="primary"
              >
                In toàn bộ {totals.totalCopies} tem (Ctrl+P)
              </Button>
            </div>
          </div>
        </CatalogDialog>
      )}
    </WarehouseWorkspace>
  )
}
