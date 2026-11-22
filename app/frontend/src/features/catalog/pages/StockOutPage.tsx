import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAllBookCopiesQuery } from '@/features/approvals/approvals.hook'
import { useAuth } from '@/features/auth/auth.hook'
import {
  useConfirmStockOutMutation,
  useCreateStockOutMutation,
  useStockOutsQuery,
} from '../catalog.hook'
import type { StockOutDetail, StockOutType } from '../catalog.type'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'
import { StockOutApprovalSidebar } from '../components/stock-out/StockOutApprovalSidebar'
import { StockOutBookLinesCard } from '../components/stock-out/StockOutBookLinesCard'
import { StockOutHistoryTableCard } from '../components/stock-out/StockOutHistoryTableCard'
import {
  STOCK_OUT_TYPE_OPTIONS,
  formatDateTimeVi,
  formatVnd,
  type StockOutApprovalStage,
  type StockOutBookLine,
  type StockOutHistoryLog,
} from '../components/stock-out/stock-out.utils'

export default function StockOutPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const actorName = session?.user?.name ?? 'Nhân viên kho'
  const seqRef = useRef(1)

  const { data: allCopies = [] } = useAllBookCopiesQuery(true)
  const stockOutsQuery = useStockOutsQuery({ pageSize: 15 })
  const createStockOutMutation = useCreateStockOutMutation()
  const confirmStockOutMutation = useConfirmStockOutMutation()

  const [activeSlipId, setActiveSlipId] = useState<string | null>(null)
  const [stockOutType, setStockOutType] = useState<StockOutType>('DISPOSAL_DAMAGED')
  const [createdDate, setCreatedDate] = useState(() => new Date().toLocaleDateString('vi-VN'))
  const [warehouseCreator, setWarehouseCreator] = useState(`Kho chính - ${actorName}`)
  const [approverName, setApproverName] = useState('Quản trị viên')
  const [businessReason, setBusinessReason] = useState(
    'Sách bị ẩm sau sự cố rò nước kệ B1; không còn đủ điều kiện lưu hành.',
  )
  const [scanBarcodeInput, setScanBarcodeInput] = useState('')
  const [selectedDropdownBarcode, setSelectedDropdownBarcode] = useState('')
  const [customLines, setCustomLines] = useState<StockOutBookLine[] | null>(null)
  const [approvalStage, setApprovalStage] = useState<StockOutApprovalStage>('DRAFT')

  const [evidenceFileName, setEvidenceFileName] = useState('hien-trang-ke-B1.jpg - 1,2 MB')
  const [evidenceTime, setEvidenceTime] = useState('Đã đính kèm biên bản kiểm tra hiện trạng')
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null)

  const [historyLogs, setHistoryLogs] = useState<StockOutHistoryLog[]>([
    {
      id: 'log-init',
      timestamp: 'Khởi tạo phiếu',
      actor: `${actorName} - Thủ kho`,
      action: 'Tạo phiếu xuất nháp',
      note: 'Chọn bản sách cần xuất ngoài bán hàng',
    },
  ])

  const eligibleCopies = useMemo(() => {
    const blockedStatuses = new Set(['RENTED', 'SOLD', 'DISPOSED', 'INVENTORY_LOCKED'])
    return allCopies.filter((c) => !blockedStatuses.has(c.status))
  }, [allCopies])

  const selectableCopyOptions = useMemo<SelectOption<string>[]>(() => {
    return eligibleCopies.map((c) => ({
      value: c.copyBarcode,
      label: `${c.copyBarcode} - ${c.titleName} (${c.status})`,
    }))
  }, [eligibleCopies])

  const defaultLines = useMemo<StockOutBookLine[]>(() => {
    return eligibleCopies.slice(0, 2).map((c, idx) => ({
      id: `out-init-${idx + 1}`,
      copyBarcode: c.copyBarcode,
      titleName: c.titleName,
      conditionText: 'Hư hỏng / Cần xuất hủy',
      originalCost: c.sellingPrice ? Math.round(c.sellingPrice * 0.65) : 45000,
      lineReason: 'Ẩm mốc / Hư hỏng không đủ điều kiện lưu hành',
    }))
  }, [eligibleCopies])

  const lines = customLines ?? defaultLines
  const recentSlips = useMemo(() => stockOutsQuery.data ?? [], [stockOutsQuery.data])

  const totalCost = useMemo(
    () => lines.reduce((sum, item) => sum + item.originalCost, 0),
    [lines],
  )

  const applySlipDetail = (detail: StockOutDetail) => {
    setActiveSlipId(detail.id)
    setStockOutType(detail.stockOutType)
    setBusinessReason(detail.reason)
    if (detail.evidenceFileName) {
      setEvidenceFileName(detail.evidenceFileName)
    }

    if (detail.status === 'COMPLETED') {
      setApprovalStage('COMPLETED')
    } else if (detail.status === 'APPROVED') {
      setApprovalStage('APPROVED')
    } else {
      setApprovalStage('PENDING_APPROVAL')
    }

    setCustomLines(
      detail.lines.map((l) => ({
        id: l.copyId || l.copyBarcode,
        copyBarcode: l.copyBarcode,
        titleName: l.titleName,
        conditionText: `Grade ${l.conditionGrade} (${l.currentStatus})`,
        originalCost: l.costPrice,
        lineReason: l.lineReason ?? detail.reason,
      })),
    )

    setHistoryLogs(
      detail.history.map((h) => ({
        id: h.id,
        timestamp: formatDateTimeVi(h.occurredAt),
        actor: h.actorName,
        action: h.action,
        note: h.note ?? '-',
      })),
    )
  }

  const handleResetNewDraft = () => {
    setActiveSlipId(null)
    setApprovalStage('DRAFT')
    setCustomLines(defaultLines)
    setHistoryLogs([
      {
        id: 'log-reset',
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: `${actorName} - Thủ kho`,
        action: 'Khởi tạo phiếu xuất nháp mới',
        note: 'Sẵn sàng quét CopyBarcode',
      },
    ])
    notify.success('Đã khởi tạo biểu mẫu phiếu xuất kho mới.')
  }

  const addBarcodeToSlip = (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return

    if (lines.some((l) => l.copyBarcode.toLowerCase() === trimmed.toLowerCase())) {
      notify.error(`Mã vạch ${trimmed} đã có trong danh sách xuất kho.`)
      return
    }

    const foundCopy = allCopies.find((c) => c.copyBarcode.toLowerCase() === trimmed.toLowerCase())
    if (!foundCopy) {
      notify.error(`Không tìm thấy bản sách vật lý có CopyBarcode "${trimmed}".`)
      return
    }

    if (['RENTED', 'SOLD', 'DISPOSED', 'INVENTORY_LOCKED'].includes(foundCopy.status)) {
      notify.error(`Không thể chọn ${foundCopy.copyBarcode}: Bản sách đang ở trạng thái ${foundCopy.status}.`)
      return
    }

    const seq = seqRef.current++
    const newLine: StockOutBookLine = {
      id: `out-${seq}`,
      copyBarcode: foundCopy.copyBarcode,
      titleName: foundCopy.titleName,
      conditionText: `Hiện trạng: ${foundCopy.status}`,
      originalCost: foundCopy.sellingPrice ? Math.round(foundCopy.sellingPrice * 0.65) : 45000,
      lineReason: 'Hư hỏng không đủ điều kiện lưu hành',
    }

    setCustomLines([...lines, newLine])
    setHistoryLogs((prev) => [
      ...prev,
      {
        id: `log-${seq}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actor: `${actorName} - Thủ kho`,
        action: `Quét thêm ${newLine.copyBarcode}`,
        note: newLine.titleName,
      },
    ])
    notify.success(`Đã thêm bản sách ${newLine.copyBarcode} vào phiếu xuất.`)
  }

  const handleScanSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
    setCustomLines(lines.filter((l) => l.id !== id))
  }

  const handleChangeLineReason = (lineId: string, reason: string) => {
    setCustomLines(
      lines.map((item) => (item.id === lineId ? { ...item, lineReason: reason } : item)),
    )
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

    try {
      const created = await createStockOutMutation.mutateAsync({
        stockOutType,
        reason: businessReason.trim(),
        evidenceFileName,
        lines: lines.map((l) => ({
          copyBarcode: l.copyBarcode,
          lineReason: l.lineReason,
        })),
      })

      applySlipDetail(created)
      notify.success(`Đã lập phiếu xuất ${created.code} (${formatVnd(created.totalCost)}) thành công!`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể gửi phiếu xuất kho.')
    }
  }

  const handleConfirmStockOut = async () => {
    if (!activeSlipId) {
      notify.error('Vui lòng gửi phiếu xuất kho trước khi xác nhận xuất kho.')
      return
    }

    try {
      const confirmed = await confirmStockOutMutation.mutateAsync(activeSlipId)
      applySlipDetail(confirmed)
      notify.success(`Đã xác nhận xuất kho hoàn tất cho ${confirmed.copyCount} bản sách (${confirmed.code})!`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể xác nhận xuất kho.')
    }
  }

  return (
    <WarehouseWorkspace
      action={
        <div className="flex items-center gap-2">
          {activeSlipId && (
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
            disabled={approvalStage !== 'DRAFT'}
            onClick={() => notify.success(`Đã lưu tạm cấu hình phiếu xuất (${lines.length} cuốn).`)}
            variant="outline"
          >
            Lưu nháp
          </Button>
        </div>
      }
      title="Lập Phiếu xuất kho ngoài bán hàng"
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-600 text-[10px] font-bold text-amber-700">
          !
        </span>
        <span>
          Phiếu xuất ngoài bán hàng chỉ cập nhật tồn và giá vốn xuất. Cần Quản lý phê duyệt trước khi chuyển trạng thái bản sách.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="space-y-6">
          <Card bodyClassName="space-y-5" padding="lg">
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
                disabled={approvalStage !== 'DRAFT'}
                onChange={(e) => setBusinessReason(e.target.value)}
                rows={2}
                value={businessReason}
              />
            </label>
          </Card>

          <StockOutBookLinesCard
            approvalStage={approvalStage}
            lines={lines}
            onAddBarcode={addBarcodeToSlip}
            onChangeLineReason={handleChangeLineReason}
            onChangeScanInput={setScanBarcodeInput}
            onChangeSelectedDropdownBarcode={setSelectedDropdownBarcode}
            onRemoveLine={handleRemoveLine}
            onScanSubmit={handleScanSubmit}
            scanBarcodeInput={scanBarcodeInput}
            selectableCopyOptions={selectableCopyOptions}
            selectedDropdownBarcode={selectedDropdownBarcode}
            totalCost={totalCost}
          />

          <StockOutHistoryTableCard
            activeSlipId={activeSlipId}
            historyLogs={historyLogs}
            onSelectSlip={applySlipDetail}
            recentSlips={recentSlips}
          />
        </div>

        <StockOutApprovalSidebar
          approvalStage={approvalStage}
          evidenceFileName={evidenceFileName}
          evidencePreviewUrl={evidencePreviewUrl}
          evidenceTime={evidenceTime}
          isConfirming={confirmStockOutMutation.isPending}
          isSubmittingApproval={createStockOutMutation.isPending}
          onConfirmStockOut={() => void handleConfirmStockOut()}
          onFileSelected={handleFileSelected}
          onNavigateApprovals={() => navigate('/approvals')}
          onSendForApproval={() => void handleSendForApproval()}
        />
      </div>
    </WarehouseWorkspace>
  )
}
