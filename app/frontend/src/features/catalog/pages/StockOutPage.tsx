import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, Trash2 } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAllBookCopiesQuery } from '@/features/approvals/approvals.hook'
import { approvalsService } from '@/features/approvals/approvals.service'
import { useAuth } from '@/features/auth/auth.hook'
import { CatalogWorkspace } from '../components/CatalogWorkspace'

type StockOutType = 'DISPOSAL_DAMAGED' | 'DISCONTINUED_CIRCULATION' | 'LOST_WRITE_OFF' | 'RETURN_SUPPLIER'

type StockOutBookLine = {
  id: string
  copyBarcode: string
  titleName: string
  conditionText: string
  originalCost: number
  lineReason: string
}

type StockOutHistoryLog = {
  id: string
  timestamp: string
  actor: string
  action: string
  note: string
}

const STOCK_OUT_TYPE_OPTIONS: SelectOption<StockOutType>[] = [
  { value: 'DISPOSAL_DAMAGED', label: 'Xuất hủy sách hư hỏng' },
  { value: 'DISCONTINUED_CIRCULATION', label: 'Ngừng lưu hành / kinh doanh' },
  { value: 'LOST_WRITE_OFF', label: 'Xuất xóa sổ sách thất lạc' },
  { value: 'RETURN_SUPPLIER', label: 'Xuất trả nhà cung cấp' },
]

const INITIAL_BOOK_LINES: StockOutBookLine[] = [
  {
    id: 'out-1',
    copyBarcode: 'BC-8204',
    titleName: 'Nhà giả kim',
    conditionText: 'D - Ướt trang',
    originalCost: 42000,
    lineReason: 'Ẩm mốc, dính 20 trang',
  },
  {
    id: 'out-2',
    copyBarcode: 'BC-8205',
    titleName: 'Mắt biếc',
    conditionText: 'D - Rách nặng',
    originalCost: 48000,
    lineReason: 'Rách gáy, thiếu trang',
  },
  {
    id: 'out-3',
    copyBarcode: 'BC-8206',
    titleName: 'Dế Mèn phiêu lưu ký',
    conditionText: 'C - Mốc bìa',
    originalCost: 30000,
    lineReason: 'Không thể phục hồi',
  },
]

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export default function StockOutPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const actorName = session?.user?.name ?? 'Lê Minh Khoa'
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.roleCode ?? '')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stockOutType, setStockOutType] = useState<StockOutType>('DISPOSAL_DAMAGED')
  const [createdDate, setCreatedDate] = useState('18/10/2026')
  const [warehouseCreator, setWarehouseCreator] = useState(`Kho chính - ${actorName}`)
  const [approverName, setApproverName] = useState('Nguyễn Minh Anh - Quản lý')
  const [businessReason, setBusinessReason] = useState(
    'Sách bị ẩm sau sự cố rò nước kệ B1; không còn đủ điều kiện lưu hành.',
  )
  const [scanBarcodeInput, setScanBarcodeInput] = useState('')
  const [selectedDropdownBarcode, setSelectedDropdownBarcode] = useState('')
  const [lines, setLines] = useState<StockOutBookLine[]>(INITIAL_BOOK_LINES)
  const [approvalStage, setApprovalStage] = useState<'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED'>('DRAFT')
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)

  const [evidenceFileName, setEvidenceFileName] = useState('hien-trang-ke-B1.jpg - 1,2 MB')
  const [evidenceTime, setEvidenceTime] = useState('Ảnh ngày 18/10/2026 - 09:42')
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null)

  const [historyLogs, setHistoryLogs] = useState<StockOutHistoryLog[]>([
    {
      id: 'log-1',
      timestamp: '18/10/2026 - 09:40',
      actor: `${actorName} - Thủ kho`,
      action: 'Tạo phiếu xuất nháp',
      note: 'Kiểm tra kệ B1 sau sự cố',
    },
    {
      id: 'log-2',
      timestamp: '18/10/2026 - 09:44',
      actor: `${actorName} - Thủ kho`,
      action: 'Thêm 3 Barcode và ảnh',
      note: 'Chờ gửi phê duyệt',
    },
  ])

  const { data: allCopies = [] } = useAllBookCopiesQuery(true)

  const selectableCopyOptions = useMemo<SelectOption<string>[]>(() => {
    const blockedStatuses = new Set(['RENTED', 'SOLD', 'INVENTORY_LOCKED'])
    return allCopies
      .filter((c) => !blockedStatuses.has(c.status))
      .map((c) => ({
        value: c.copyBarcode,
        label: `${c.copyBarcode} - ${c.titleName}`,
      }))
  }, [allCopies])

  const totalCost = useMemo(
    () => lines.reduce((sum, item) => sum + item.originalCost, 0),
    [lines],
  )

  const addBarcodeToSlip = (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return

    if (lines.some((l) => l.copyBarcode.toLowerCase() === trimmed.toLowerCase())) {
      notify.error(`Mã vạch ${trimmed} đã có trong danh sách xuất kho.`)
      return
    }

    const foundCopy = allCopies.find((c) => c.copyBarcode.toLowerCase() === trimmed.toLowerCase())
    if (foundCopy && ['RENTED', 'SOLD', 'INVENTORY_LOCKED'].includes(foundCopy.status)) {
      notify.error(`Không thể chọn ${trimmed}: Bản sách đang ở trạng thái ${foundCopy.status}.`)
      return
    }

    const newLine: StockOutBookLine = {
      id: `out-${Date.now()}`,
      copyBarcode: foundCopy?.copyBarcode ?? trimmed.toUpperCase(),
      titleName: foundCopy?.titleName ?? 'Bản sách kho chính',
      conditionText: 'D - Hư hỏng nặng',
      originalCost: foundCopy?.sellingPrice ? Math.round(foundCopy.sellingPrice * 0.7) : 35000,
      lineReason: 'Hư hỏng không đủ điều kiện lưu hành',
    }

    setLines((prev) => [...prev, newLine])
    setHistoryLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: `${actorName} - Thủ kho`,
        action: `Quét thêm ${newLine.copyBarcode}`,
        note: newLine.titleName,
      },
    ])
    notify.success(`Đã thêm bản sách ${newLine.copyBarcode} vào phiếu xuất.`)
  }

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanBarcodeInput.trim()) return
    addBarcodeToSlip(scanBarcodeInput)
    setScanBarcodeInput('')
  }

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) {
      notify.error('Phiếu xuất cần ít nhất 1 bản sách.')
      return
    }
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleFileSelected = (file: File | null) => {
    if (!file) return
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1).replace('.', ',')
    setEvidenceFileName(`${file.name} - ${sizeMb} MB`)
    setEvidenceTime(`Ảnh ngày ${new Date().toLocaleString('vi-VN')}`)
    setEvidencePreviewUrl(URL.createObjectURL(file))
    notify.success(`Đã đính kèm ảnh bằng chứng "${file.name}".`)
  }

  const handleSendForApproval = async () => {
    if (!businessReason.trim()) {
      notify.error('Vui lòng nhập Lý do nghiệp vụ trước khi gửi phê duyệt.')
      return
    }
    if (lines.length === 0) {
      notify.error('Vui lòng chọn ít nhất một bản sách cần xuất.')
      return
    }

    setIsSubmittingApproval(true)
    try {
      const firstRealCopy = allCopies.find((c) =>
        lines.some((l) => l.copyBarcode.toLowerCase() === c.copyBarcode.toLowerCase()),
      )
      if (firstRealCopy) {
        await approvalsService.createDisposalReversal({
          type: 'DISPOSAL',
          copyBarcode: firstRealCopy.copyBarcode,
          reason: `${businessReason.trim()} (Phiếu xuất OUT-20261018-004 - ${lines.length} cuốn)`,
        }).catch(() => null)
      }

      setApprovalStage(isAdmin ? 'APPROVED' : 'PENDING_APPROVAL')
      setHistoryLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN'),
          actor: `${actorName}`,
          action: 'Gửi Quản lý phê duyệt',
          note: `Tổng ${lines.length} bản sách - Giá vốn ${formatVnd(totalCost)}`,
        },
      ])
      notify.success('Đã gửi phiếu xuất kho sang Trung tâm Phê duyệt ngoại lệ!')
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  const handleConfirmStockOut = () => {
    setApprovalStage('COMPLETED')
    setHistoryLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: `${actorName}`,
        action: 'Xác nhận xuất kho hoàn tất',
        note: `Đã chuyển trạng thái ${lines.length} bản sách và ghi nhận nhật ký kiểm toán`,
      },
    ])
    notify.success(`Đã xác nhận xuất kho cho ${lines.length} bản sách!`)
  }

  return (
    <CatalogWorkspace
      action={
        <Button
          onClick={() => notify.success('Đã lưu bản nháp phiếu xuất kho OUT-20261018-004.')}
          variant="outline"
        >
          Lưu nháp
        </Button>
      }
      title="Lập Phiếu xuất kho ngoài bán hàng"
    >
      <p className="-mt-3 text-xs font-mono text-slate-500">
        OUT-20261018-004 - Xuất hủy / Ngừng lưu hành - Không phát sinh doanh thu bán lẻ
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-600 text-[10px] font-bold text-amber-700">
          !
        </span>
        <span>
          Phiếu xuất ngoài bán hàng chỉ cập nhật tồn và giá vốn xuất. Cần Quản lý phê duyệt trước khi chuyển trạng thái bản sách.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="space-y-5">
          <Card className="p-5 space-y-4" padding="none">
            <h2 className="text-sm font-bold text-slate-900">Thông tin phiếu xuất</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectBox
                label="Loại xuất kho *"
                onChange={(val) => setStockOutType(val)}
                options={STOCK_OUT_TYPE_OPTIONS}
                searchable={false}
                value={stockOutType}
              />
              <TextField
                label="Ngày lập"
                onChange={(e) => setCreatedDate(e.target.value)}
                value={createdDate}
              />
              <TextField
                label="Kho / Người lập"
                onChange={(e) => setWarehouseCreator(e.target.value)}
                value={warehouseCreator}
              />
              <TextField
                label="Người phê duyệt"
                onChange={(e) => setApproverName(e.target.value)}
                value={approverName}
              />
            </div>

            <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
              <span className="block text-xs font-semibold text-slate-500">Lý do nghiệp vụ *</span>
              <textarea
                className="mt-1 block w-full resize-y bg-transparent text-xs text-slate-900 outline-hidden"
                onChange={(e) => setBusinessReason(e.target.value)}
                rows={2}
                value={businessReason}
              />
            </label>
          </Card>

          <Card className="p-5 space-y-4" padding="none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Bản sách được chọn</h2>
              {selectableCopyOptions.length > 0 && (
                <div className="w-64">
                  <SelectBox
                    hideLabel
                    label="Chọn nhanh CopyBarcode từ kho"
                    onChange={(barcode) => {
                      setSelectedDropdownBarcode(barcode)
                      addBarcodeToSlip(barcode)
                    }}
                    options={selectableCopyOptions}
                    placeholder="Chọn nhanh CopyBarcode..."
                    searchPlaceholder="Tìm CopyBarcode..."
                    value={selectedDropdownBarcode}
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleScanSubmit}>
              <div className="relative">
                <input
                  aria-label="Quét Barcode độc bản cần xuất"
                  className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/20 py-3 pl-4 pr-20 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  onChange={(e) => setScanBarcodeInput(e.target.value)}
                  placeholder="Quét Barcode độc bản cần xuất..."
                  type="text"
                  value={scanBarcodeInput}
                />
                <button
                  className="absolute right-3 top-2.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  type="submit"
                >
                  Enter ↵
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Máy quét đang lắng nghe - Nhấn Enter để thêm bản sách
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
                  {lines.map((line) => (
                    <tr className="hover:bg-slate-50/60" key={line.id}>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <span className="font-mono text-indigo-700">{line.copyBarcode}</span> - {line.titleName}
                      </td>
                      <td className="px-3 py-3.5 text-slate-600">{line.conditionText}</td>
                      <td className="px-3 py-3.5 text-slate-700 font-medium">{formatVnd(line.originalCost)}</td>
                      <td className="px-3 py-3.5">
                        <input
                          aria-label={`Lý do xuất ${line.copyBarcode}`}
                          className="w-full min-w-40 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.id === line.id ? { ...item, lineReason: e.target.value } : item,
                              ),
                            )
                          }
                          type="text"
                          value={line.lineReason}
                        />
                      </td>
                      <td className="px-2 py-3.5 text-center">
                        <button
                          aria-label={`Xóa ${line.copyBarcode}`}
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

            <div className="space-y-1 pt-1 text-xs">
              <p className="text-slate-600">
                {lines.length} bản sách - Tổng giá vốn xuất{' '}
                <strong className="text-sm font-black text-slate-900 ml-1">{formatVnd(totalCost)}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Không cho chọn bản Đang thuê, Đã bán hoặc Đang khóa kiểm kê.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden" padding="none">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Lịch sử xử lý phiếu</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-left" scope="col">Thời gian</th>
                    <th className="px-4 py-3 text-left" scope="col">Người thực hiện</th>
                    <th className="px-4 py-3 text-left" scope="col">Thao tác</th>
                    <th className="px-5 py-3 text-left" scope="col">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.map((log) => (
                    <tr className="hover:bg-slate-50/70" key={log.id}>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{log.actor}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">{log.action}</td>
                      <td className="px-5 py-3.5 text-slate-500">{log.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 space-y-3.5" padding="none">
            <h2 className="text-sm font-bold text-slate-900">Bằng chứng hiện trạng</h2>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-16/10 flex items-center justify-center">
              {evidencePreviewUrl ? (
                <img
                  alt="Bằng chứng hiện trạng sách xuất kho"
                  className="h-full w-full object-cover"
                  src={evidencePreviewUrl}
                />
              ) : (
                <div className="p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                    IMG
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-700">Ảnh hiện trạng kệ B1</p>
                  <p className="text-[11px] text-slate-500">Bằng chứng sách hư hỏng / ẩm mốc</p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700">{evidenceFileName}</p>
              <p>{evidenceTime}</p>
            </div>

            <input
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              + Đính kèm ảnh / Biên bản
            </Button>
          </Card>

          <Card className="p-5 space-y-4" padding="none">
            <h2 className="text-sm font-bold text-slate-900">Trạng thái phê duyệt</h2>

            <div>
              {approvalStage === 'COMPLETED' ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  Đã hoàn tất xuất kho
                </span>
              ) : approvalStage === 'APPROVED' ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                  Đã được Quản lý duyệt
                </span>
              ) : approvalStage === 'PENDING_APPROVAL' ? (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                  Đang chờ Quản lý duyệt
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  Bản nháp - Chưa xuất
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              Thủ kho lập phiếu → Quản lý xem bằng chứng → Phê duyệt → Kho ghi nhận xuất hủy.
            </p>

            <div className="space-y-2.5">
              <Button
                className="w-full justify-center"
                disabled={approvalStage !== 'DRAFT' || isSubmittingApproval}
                loading={isSubmittingApproval}
                onClick={() => void handleSendForApproval()}
                type="button"
                variant="primary"
              >
                Gửi Quản lý phê duyệt
              </Button>

              <Button
                className="w-full justify-center"
                disabled={approvalStage === 'DRAFT' || approvalStage === 'COMPLETED'}
                onClick={handleConfirmStockOut}
                type="button"
                variant="outline"
              >
                Xác nhận xuất kho
              </Button>

              {approvalStage === 'PENDING_APPROVAL' && (
                <button
                  className="block w-full text-center text-xs font-semibold text-indigo-600 hover:underline pt-1"
                  onClick={() => navigate('/approvals')}
                  type="button"
                >
                  Xem tại Trung tâm Phê duyệt →
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Chỉ được xác nhận sau khi được duyệt. Mọi điều chỉnh lưu nhật ký kiểm toán.
            </p>
          </Card>
        </div>
      </div>
    </CatalogWorkspace>
  )
}
