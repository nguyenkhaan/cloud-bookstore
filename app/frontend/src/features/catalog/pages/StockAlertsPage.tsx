import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, StatCard } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { catalogPaths } from '../catalog.route'
import {
  useEditionStockAlertsQuery,
  useSuppliersQuery,
  useUpdateEditionThresholdsMutation,
} from '../catalog.hook'
import type { EditionStockAlertItem } from '../catalog.type'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'
import { StockAlertRestockSuggestionCard } from '../components/stock-alerts/StockAlertRestockSuggestionCard'
import { StockAlertsTableCard } from '../components/stock-alerts/StockAlertsTableCard'
import { StockAlertThresholdFormCard } from '../components/stock-alerts/StockAlertThresholdFormCard'
import {
  formatEditionDisplay,
  formatSupplierOptionLabel,
  type AlertSeverity,
  type ChannelFilter,
} from '../components/stock-alerts/stock-alerts.utils'

export default function StockAlertsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const roleCode = session?.user?.roleCode
  const canConfigureThresholds = roleCode !== 'CASHIER'

  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity>('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL')
  const [selectedId, setSelectedId] = useState<string>('')

  const [formMinSale, setFormMinSale] = useState<string | null>(null)
  const [formMinRental, setFormMinRental] = useState<string | null>(null)
  const [formPreferredSupplier, setFormPreferredSupplier] = useState<string | null>(null)

  const alertsQuery = useEditionStockAlertsQuery()
  const suppliersQuery = useSuppliersQuery({ isActive: true })
  const updateThresholdsMutation = useUpdateEditionThresholdsMutation()

  const dashboard = alertsQuery.data
  const items = useMemo(() => dashboard?.items ?? [], [dashboard?.items])
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data])

  const supplierFilterOptions = useMemo<SelectOption<string>[]>(() => {
    const base: SelectOption<string>[] = [{ value: 'ALL', label: 'NCC: Tất cả' }]
    for (const s of suppliers) {
      base.push({ value: s.id, label: s.name })
    }
    return base
  }, [suppliers])

  const preferredSupplierOptions = useMemo<SelectOption<string>[]>(() => {
    if (suppliers.length === 0) {
      return [
        {
          value: 'Chưa gắn NCC ưu tiên',
          label: 'Chưa gắn NCC ưu tiên',
        },
      ]
    }
    return suppliers.map((s) => {
      const label = formatSupplierOptionLabel(s.code, s.name)
      return { value: label, label }
    })
  }, [suppliers])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false
      if (supplierFilter !== 'ALL' && item.preferredSupplierId !== supplierFilter) return false
      if (channelFilter === 'SALE' && !item.isSaleLow) return false
      if (channelFilter === 'RENTAL' && !item.isRentalLow) return false
      if (q) {
        return (
          item.titleName.toLowerCase().includes(q) ||
          (item.isbn ?? '').toLowerCase().includes(q) ||
          (item.publisher ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [items, search, severityFilter, supplierFilter, channelFilter])

  const selectedEdition = useMemo(
    () => items.find((i) => i.editionId === selectedId) ?? filteredItems[0] ?? items[0] ?? null,
    [items, filteredItems, selectedId],
  )

  const displayMinSale = formMinSale ?? (selectedEdition ? `${selectedEdition.minStockSale}` : '0')
  const displayMinRental = formMinRental ?? (selectedEdition ? `${selectedEdition.minStockRental}` : '0')
  const displayPreferredSupplier =
    formPreferredSupplier ??
    (selectedEdition
      ? formatSupplierOptionLabel(selectedEdition.preferredSupplierCode, selectedEdition.preferredSupplierName)
      : preferredSupplierOptions[0]?.value ?? '')

  const handleSelectRow = (item: EditionStockAlertItem) => {
    setSelectedId(item.editionId)
    setFormMinSale(`${item.minStockSale}`)
    setFormMinRental(`${item.minStockRental}`)
    setFormPreferredSupplier(formatSupplierOptionLabel(item.preferredSupplierCode, item.preferredSupplierName))
  }

  const handleSaveThresholds = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedEdition) return

    const trimmedSale = displayMinSale.trim()
    const trimmedRental = displayMinRental.trim()
    if (!trimmedSale || !trimmedRental) {
      notify.error('Vui lòng nhập đầy đủ cả Tồn an toàn kênh Bán và Tồn an toàn kênh Thuê.')
      return
    }

    const parsedSale = Number.parseInt(trimmedSale, 10)
    const parsedRental = Number.parseInt(trimmedRental, 10)
    if (Number.isNaN(parsedSale) || parsedSale < 0 || Number.isNaN(parsedRental) || parsedRental < 0) {
      notify.error('Ngưỡng tồn an toàn phải là số nguyên không âm.')
      return
    }

    try {
      const updated = await updateThresholdsMutation.mutateAsync({
        editionId: selectedEdition.editionId,
        request: {
          minStockSale: parsedSale,
          minStockRental: parsedRental,
        },
      })
      setFormMinSale(`${updated.minStockSale}`)
      setFormMinRental(`${updated.minStockRental}`)
      notify.success(`Đã lưu cấu hình ngưỡng tồn cho "${formatEditionDisplay(updated)}".`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không thể lưu cấu hình ngưỡng tồn.')
    }
  }

  return (
    <WarehouseWorkspace
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              channelFilter === 'SALE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setChannelFilter(channelFilter === 'SALE' ? 'ALL' : 'SALE')}
            type="button"
          >
            Cảnh báo Kênh Bán lẻ
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              channelFilter === 'RENTAL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setChannelFilter(channelFilter === 'RENTAL' ? 'ALL' : 'RENTAL')}
            type="button"
          >
            Cảnh báo Kênh Cho thuê
          </button>
          <Button onClick={() => navigate(catalogPaths.stockReceipts)} variant="primary">
            + Lập Phiếu Nhập NCC
          </Button>
        </div>
      }
      title="Giám sát Cảnh báo tồn kho chạm min"
    >
      <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          description="Theo cấu hình tồn an toàn kênh Bán và Thuê"
          label="Ấn bản chạm min"
          value={String(dashboard?.alertEditionCount ?? 0)}
          valueColor="amber"
        />
        <StatCard
          description="Cần nhập bổ sung cho kênh Thuê"
          label="Thiếu kho thuê"
          value={String(dashboard?.rentalLowEditionCount ?? 0)}
          valueColor="rose"
        />
        <StatCard
          description={
            dashboard?.latestPendingReceiptCode
              ? `${dashboard.pendingImportEditionCount} ấn bản - ${dashboard.latestPendingReceiptCode}`
              : `${dashboard?.pendingImportEditionCount ?? 0} ấn bản đang ở phiếu nháp`
          }
          label="Đang chờ nhập"
          value={String(dashboard?.pendingImportCopiesCount ?? 0)}
        />
        <StatCard
          description="Theo ngưỡng tồn an toàn kênh Bán và Thuê"
          label="Đề xuất bổ sung"
          value={String(dashboard?.totalSuggestedRestockCount ?? 0)}
        />
      </section>

      <StockAlertsTableCard
        channelFilter={channelFilter}
        filteredItems={filteredItems}
        isLoading={alertsQuery.isLoading}
        onChangeChannelFilter={setChannelFilter}
        onChangeSearch={setSearch}
        onChangeSeverityFilter={setSeverityFilter}
        onChangeSupplierFilter={setSupplierFilter}
        onSelectRow={handleSelectRow}
        search={search}
        selectedEditionId={selectedEdition?.editionId}
        severityFilter={severityFilter}
        supplierFilter={supplierFilter}
        supplierFilterOptions={supplierFilterOptions}
        totalCount={items.length}
      />

      {selectedEdition && (
        <div
          className={`grid gap-6 items-start ${
            canConfigureThresholds ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          }`}
        >
          {canConfigureThresholds && (
            <StockAlertThresholdFormCard
              displayMinRental={displayMinRental}
              displayMinSale={displayMinSale}
              displayPreferredSupplier={displayPreferredSupplier}
              isPending={updateThresholdsMutation.isPending}
              onChangeMinRental={setFormMinRental}
              onChangeMinSale={setFormMinSale}
              onChangePreferredSupplier={setFormPreferredSupplier}
              onSubmit={(e) => void handleSaveThresholds(e)}
              preferredSupplierOptions={preferredSupplierOptions}
              selectedEdition={selectedEdition}
            />
          )}

          <StockAlertRestockSuggestionCard
            onNavigateBuyback={() => navigate('/pos')}
            selectedEdition={selectedEdition}
          />
        </div>
      )}
    </WarehouseWorkspace>
  )
}
