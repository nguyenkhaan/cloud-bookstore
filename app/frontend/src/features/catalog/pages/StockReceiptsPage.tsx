import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Printer, Search, Trash2 } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { catalogPaths } from '../catalog.route'
import { useSeriesQuery, useTitlesQuery } from '../catalog.hook'
import type { CopyAvailability } from '../catalog.type'
import { CatalogDialog } from '../components/CatalogDialog'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'

type ReceiptLineItem = {
  id: string
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
  barcodeStart: number
  barcodeEnd: number
  status: 'PENDING_BARCODE' | 'BARCODE_GENERATED' | 'AVAILABLE'
}

type RecentReceiptSummary = {
  id: string
  code: string
  supplierName: string
  receiptDate: string
  totalAmount: number
  debtAmount: number
  status: 'COMPLETED' | 'IMPORTED_DEBT' | 'DRAFT'
}

const SUPPLIER_OPTIONS: SelectOption<string>[] = [
  { value: 'sup-1', label: 'NCC-001 - NXB Kim Đồng' },
  { value: 'sup-2', label: 'NCC-002 - NXB Trẻ' },
  { value: 'sup-3', label: 'NCC-003 - Phân phối Minh Long' },
  { value: 'sup-4', label: 'NCC-004 - Sách Nhã Nam' },
]

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

const INITIAL_LINES: ReceiptLineItem[] = [
  {
    id: 'line-1',
    titleName: 'Doraemon - Tập 01',
    isbn: '9786042223121',
    editionInfo: 'Kim Đồng - 2024',
    formatInfo: '11 x 18 cm',
    discountPct: 37.5,
    quantity: 20,
    unitCost: 25000,
    coverPrice: 40000,
    sellingPrice: 36000,
    rentalRate: 2500,
    availability: 'BOTH',
    barcodeStart: 8001,
    barcodeEnd: 8020,
    status: 'PENDING_BARCODE',
  },
  {
    id: 'line-2',
    titleName: 'Conan - Tập 10',
    isbn: '978-604-2-09359-5',
    editionInfo: 'Kim Đồng - Tái bản 2024',
    formatInfo: '11 x 18 cm',
    discountPct: 33.33,
    quantity: 10,
    unitCost: 30000,
    coverPrice: 45000,
    sellingPrice: 42000,
    rentalRate: 3000,
    availability: 'BOTH',
    barcodeStart: 8021,
    barcodeEnd: 8030,
    status: 'PENDING_BARCODE',
  },
  {
    id: 'line-3',
    titleName: 'One Piece - Tập 01',
    isbn: 'ISBN chờ xác nhận',
    editionInfo: 'Kim Đồng - 2024',
    formatInfo: '11 x 18 cm',
    discountPct: 42.86,
    quantity: 15,
    unitCost: 20000,
    coverPrice: 35000,
    sellingPrice: 32000,
    rentalRate: 2000,
    availability: 'BOTH',
    barcodeStart: 8031,
    barcodeEnd: 8045,
    status: 'PENDING_BARCODE',
  },
]

const INITIAL_RECENT_RECEIPTS: RecentReceiptSummary[] = [
  {
    id: 'rec-1',
    code: 'INB-20261017-011',
    supplierName: 'NXB Trẻ',
    receiptDate: '17/10/2026',
    totalAmount: 2450000,
    debtAmount: 0,
    status: 'COMPLETED',
  },
  {
    id: 'rec-2',
    code: 'INB-20261016-010',
    supplierName: 'Kim Đồng',
    receiptDate: '16/10/2026',
    totalAmount: 1800000,
    debtAmount: 800000,
    status: 'IMPORTED_DEBT',
  },
]

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

function formatBarcode(num: number): string {
  return `BC-${num}`
}

export default function StockReceiptsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const creatorName = session?.user?.name ?? 'Lê Minh Khoa'

  const [step, setStep] = useState<1 | 2>(1)
  const [supplierId, setSupplierId] = useState('sup-1')
  const [invoiceInfo, setInvoiceInfo] = useState('18/10/2026 - KD-1026-882')
  const [contactDeliverer, setContactDeliverer] = useState('Nguyễn Hữu An - 028 3930 8888')
  const [warehouseLocation, setWarehouseLocation] = useState('Cơ sở 01 - Kho chính')
  const [paymentStatus, setPaymentStatus] = useState('PARTIAL')
  const [paidAmount, setPaidAmount] = useState(600000)
  const [dueDate, setDueDate] = useState('25/10/2026')
  const [lines, setLines] = useState<ReceiptLineItem[]>(INITIAL_LINES)
  const [quickSearch, setQuickSearch] = useState('')
  const [receiptStage, setReceiptStage] = useState<'DRAFT' | 'BARCODE_READY' | 'AVAILABLE'>('DRAFT')
  const [recentReceipts, setRecentReceipts] = useState<RecentReceiptSummary[]>(INITIAL_RECENT_RECEIPTS)

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false)
  const [batchSeriesId, setBatchSeriesId] = useState('')
  const [batchFromVol, setBatchFromVol] = useState('1')
  const [batchToVol, setBatchToVol] = useState('5')
  const [batchQuantityEach, setBatchQuantityEach] = useState('5')
  const [batchUnitCost, setBatchUnitCost] = useState('25000')
  const [batchCoverPrice, setBatchCoverPrice] = useState('40000')

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const seriesQuery = useSeriesQuery()
  const titlesQuery = useTitlesQuery()

  const seriesOptions = useMemo<SelectOption<string>[]>(() => {
    const apiSeries = seriesQuery.data ?? []
    if (apiSeries.length > 0) {
      return apiSeries.map((s) => ({ value: s.id, label: s.name }))
    }
    return [
      { value: 's-conan', label: 'Thám tử lừng danh Conan' },
      { value: 's-doraemon', label: 'Doraemon Truyện ngắn' },
      { value: 's-onepiece', label: 'One Piece' },
    ]
  }, [seriesQuery.data])

  const recomputeBarcodes = (items: ReceiptLineItem[]): ReceiptLineItem[] => {
    let cursor = 8001
    return items.map((item) => {
      const qty = Math.max(1, item.quantity)
      const start = cursor
      const end = cursor + qty - 1
      cursor = end + 1
      return { ...item, barcodeStart: start, barcodeEnd: end }
    })
  }

  const totals = useMemo(() => {
    const totalCopies = lines.reduce((sum, l) => sum + l.quantity, 0)
    const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
    const effectivePaid =
      paymentStatus === 'PAID' ? totalAmount : paymentStatus === 'UNPAID' ? 0 : Math.min(paidAmount, totalAmount)
    const debtAmount = Math.max(0, totalAmount - effectivePaid)
    return {
      totalCopies,
      totalTitles: lines.length,
      totalAmount,
      effectivePaid,
      debtAmount,
    }
  }, [lines, paymentStatus, paidAmount])

  const handleUpdateLine = (id: string, patch: Partial<ReceiptLineItem>) => {
    setLines((prev) => {
      const next = prev.map((item) => {
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
    if (lines.length <= 1) {
      notify.error('Phiếu nhập cần ít nhất 1 dòng sách.')
      return
    }
    setLines((prev) => recomputeBarcodes(prev.filter((l) => l.id !== id)))
  }

  const handleQuickAddTitle = (e: React.FormEvent) => {
    e.preventDefault()
    const term = quickSearch.trim()
    if (!term) return

    const matchedTitle = (titlesQuery.data ?? []).find(
      (t) => t.name.toLowerCase().includes(term.toLowerCase()),
    )

    const newLine: ReceiptLineItem = {
      id: `line-${Date.now()}`,
      titleName: matchedTitle ? matchedTitle.name : term,
      isbn: /^\d{10,13}$/.test(term.replace(/-/g, '')) ? term : '978-604-2-18290-4',
      editionInfo: 'Kim Đồng - 2025',
      formatInfo: '11 x 18 cm',
      discountPct: 35,
      quantity: 10,
      unitCost: 26000,
      coverPrice: 40000,
      sellingPrice: 38000,
      rentalRate: 2500,
      availability: 'BOTH',
      barcodeStart: 8001,
      barcodeEnd: 8010,
      status: 'PENDING_BARCODE',
    }

    setLines((prev) => recomputeBarcodes([...prev, newLine]))
    setQuickSearch('')
    notify.success(`Đã thêm "${newLine.titleName}" vào phiếu nhập.`)
  }

  const handleBatchSeriesImport = (e: React.FormEvent) => {
    e.preventDefault()
    const fromVol = Math.max(1, Number(batchFromVol) || 1)
    const toVol = Math.min(fromVol + 19, Math.max(fromVol, Number(batchToVol) || fromVol))
    const qty = Math.max(1, Number(batchQuantityEach) || 5)
    const cost = Math.max(1000, Number(batchUnitCost) || 25000)
    const cover = Math.max(cost, Number(batchCoverPrice) || 40000)
    const seriesLabel =
      seriesOptions.find((s) => s.value === batchSeriesId)?.label ?? seriesOptions[0]?.label ?? 'Bộ truyện'

    const generated: ReceiptLineItem[] = []
    for (let vol = fromVol; vol <= toVol; vol++) {
      generated.push({
        id: `batch-${Date.now()}-${vol}`,
        titleName: `${seriesLabel} - Tập ${String(vol).padStart(2, '0')}`,
        isbn: `978-604-2-${String(10000 + vol)}`,
        editionInfo: 'Tái bản 2025',
        formatInfo: '11 x 18 cm',
        discountPct: Math.round(((cover - cost) / cover) * 10000) / 100,
        quantity: qty,
        unitCost: cost,
        coverPrice: cover,
        sellingPrice: Math.round(cover * 0.9),
        rentalRate: 2500,
        availability: 'BOTH',
        barcodeStart: 0,
        barcodeEnd: 0,
        status: 'PENDING_BARCODE',
      })
    }

    setLines((prev) => recomputeBarcodes([...prev, ...generated]))
    setIsSeriesModalOpen(false)
    notify.success(`Đã thêm ${generated.length} tập thuộc bộ "${seriesLabel}" vào phiếu nhập.`)
  }

  const handleConfirmGenerateBarcodes = () => {
    for (const line of lines) {
      if (line.sellingPrice <= 0) {
        notify.error(`Vui lòng nhập Giá bán niêm yết hợp lệ cho "${line.titleName}".`)
        return
      }
    }
    setLines((prev) => prev.map((l) => ({ ...l, status: 'BARCODE_GENERATED' })))
    setReceiptStage('BARCODE_READY')
    setStep(2)
    notify.success(`Đã xác nhận phiếu nhập và sinh ${totals.totalCopies} mã CopyBarcode độc bản!`)
  }

  const handleActivateAvailable = () => {
    setLines((prev) => prev.map((l) => ({ ...l, status: 'AVAILABLE' })))
    setReceiptStage('AVAILABLE')
    const supplierLabel =
      SUPPLIER_OPTIONS.find((s) => s.value === supplierId)?.label.split(' - ')[1] ?? 'Nhà cung cấp'
    setRecentReceipts((prev) => [
      {
        id: `rec-${Date.now()}`,
        code: 'INB-20261018-012',
        supplierName: supplierLabel,
        receiptDate: '18/10/2026',
        totalAmount: totals.totalAmount,
        debtAmount: totals.debtAmount,
        status: totals.debtAmount > 0 ? 'IMPORTED_DEBT' : 'COMPLETED',
      },
      ...prev,
    ])
    notify.success(`Đã chuyển toàn bộ ${totals.totalCopies} bản sách sang trạng thái Khả dụng (AVAILABLE)!`)
  }

  return (
    <WarehouseWorkspace
      action={
        <Button
          onClick={() => notify.success('Đã lưu bản nháp phiếu nhập kho INB-20261018-012.')}
          variant="outline"
        >
          Lưu bản nháp
        </Button>
      }
      title="Lập & Quản lý Phiếu nhập kho từ NCC"
    >
      <p className="text-xs font-mono text-slate-500">
        INB-20261018-012 - Người lập: {creatorName} - 18/10/2026
      </p>

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
                onChange={(val) => setSupplierId(val)}
                options={SUPPLIER_OPTIONS}
                placeholder="Chọn nhà cung cấp..."
                searchPlaceholder="Tìm mã hoặc tên NCC..."
                value={supplierId}
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
                Mặc định Grade A, mỗi bản vật lý nhận một Barcode riêng.
              </p>
            </div>

            <form className="flex flex-wrap gap-2" onSubmit={handleQuickAddTitle}>
              <div className="relative flex-1 min-w-60">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  aria-label="Tìm đầu sách hoặc ISBN để thêm vào phiếu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Tìm đầu sách, ISBN để thêm vào phiếu..."
                  type="text"
                  value={quickSearch}
                />
              </div>
              <Button type="submit" variant="secondary">
                + Thêm dòng sách
              </Button>
            </form>

            <div className="space-y-1.5">
              <Button
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
                  {lines.map((line) => (
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

            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
              Tổng cộng <strong>{totals.totalCopies} bản sách</strong> trên{' '}
              <strong>{totals.totalTitles} đầu sách</strong> - Mỗi bản vật lý sẽ được cấp một mã CopyBarcode duy nhất khi xác nhận.
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
                    <th className="px-3 py-3 text-left" scope="col">Dải Barcode dự kiến</th>
                    <th className="px-4 py-3 text-left" scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => (
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
                      <td className="px-3 py-3.5 font-mono text-slate-600">
                        {formatBarcode(line.barcodeStart)} → {formatBarcode(line.barcodeEnd)}
                      </td>
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
                  ))}
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
              <Button onClick={handleConfirmGenerateBarcodes} type="button" variant="primary">
                Xác nhận nhập kho & Sinh Barcode
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
                disabled={receiptStage === 'DRAFT' || receiptStage === 'AVAILABLE'}
                onClick={handleActivateAvailable}
                type="button"
                variant="secondary"
              >
                Xác nhận giá bán → Chuyển Khả dụng
              </Button>
              <p className="text-xs text-slate-500 flex-1">
                Chỉ bật sau khi phiếu được duyệt và đã sinh Barcode. Xác nhận giá bán cho đủ {totals.totalCopies} bản để mở bán / cho thuê.
              </p>
            </div>
          </Card>

          {receiptStage !== 'DRAFT' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-800">Sau duyệt - Trạng thái phiếu nhập</p>
                <p className="mt-1">
                  Phiếu nhập đã duyệt thành công. Đã sinh <strong>{totals.totalCopies} mã CopyBarcode</strong>.
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
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Phiếu nhập gần đây</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-left" scope="col">Mã phiếu / NCC</th>
                    <th className="px-4 py-3 text-left" scope="col">Ngày nhập</th>
                    <th className="px-4 py-3 text-left" scope="col">Giá trị</th>
                    <th className="px-4 py-3 text-left" scope="col">Công nợ</th>
                    <th className="px-5 py-3 text-left" scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReceipts.map((rec) => (
                    <tr className="hover:bg-slate-50/70" key={rec.id}>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{rec.code}</span>
                        <span className="text-slate-600">{rec.supplierName}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{rec.receiptDate}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{formatVnd(rec.totalAmount)}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{formatVnd(rec.debtAmount)}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {rec.status === 'COMPLETED' ? 'Hoàn tất' : 'Đã nhập - Còn nợ'}
                      </td>
                    </tr>
                  ))}
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
                Chờ duyệt nhập kho
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-3">
            <p>Chứng từ: <strong>hoa-don-KD-882.pdf - 240 KB</strong></p>
            <p>Đã đính kèm, chưa quyết toán công nợ.</p>
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
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Giá vốn / cuốn (VNĐ)"
                min={0}
                onChange={(e) => setBatchUnitCost(e.target.value)}
                required
                type="number"
                value={batchUnitCost}
              />
              <TextField
                label="Giá bìa niêm yết (VNĐ)"
                min={0}
                onChange={(e) => setBatchCoverPrice(e.target.value)}
                required
                type="number"
                value={batchCoverPrice}
              />
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống sẽ tự động tách từng tập thành một dòng nhập kho độc lập và cấp dải CopyBarcode riêng cho từng cuốn.
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
              {lines.map((line) => (
                <div
                  className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center shadow-2xs"
                  key={line.id}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    CLOUD BOOKSTORE
                  </p>
                  <p className="mt-1 font-mono text-sm font-black tracking-wider text-slate-900">
                    || ||| || |||| {formatBarcode(line.barcodeStart)}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{line.titleName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-indigo-700">
                    Giá bán: {formatVnd(line.sellingPrice)} ({line.quantity} tem: {formatBarcode(line.barcodeStart)} → {formatBarcode(line.barcodeEnd)})
                  </p>
                </div>
              ))}
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
