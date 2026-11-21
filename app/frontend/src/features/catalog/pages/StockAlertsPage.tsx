import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button, Card, SelectBox, StatCard, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { catalogPaths } from '../catalog.route'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'

type AlertSeverity = 'ALL' | 'OUT_OF_STOCK' | 'BOTH_LOW' | 'RENTAL_LOW' | 'SALE_LOW'
type ChannelFilter = 'ALL' | 'SALE' | 'RENTAL'

type EditionStockAlertItem = {
  id: string
  titleAndEdition: string
  publisherYear: string
  isbn: string
  supplierCode: string
  supplierLabel: string
  minStockSale: number
  minStockRental: number
  availableSale: number
  availableRental: number
  rentedCount: number
  totalPhysical: number
}

const INITIAL_EDITION_ALERTS: EditionStockAlertItem[] = [
  {
    id: 'ed-alert-1',
    titleAndEdition: 'Conan - Tập 10 (Ấn bản KĐ 2024)',
    publisherYear: 'NXB Kim Đồng 2024',
    isbn: '978-604-2-09359-5',
    supplierCode: 'NCC-001',
    supplierLabel: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 2,
    availableRental: 0,
    rentedCount: 6,
    totalPhysical: 8,
  },
  {
    id: 'ed-alert-2',
    titleAndEdition: 'One Piece - Tập 12',
    publisherYear: 'Ấn bản Kim Đồng 2024',
    isbn: '978-604-2-18201-0',
    supplierCode: 'NCC-001',
    supplierLabel: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 1,
    availableRental: 0,
    rentedCount: 6,
    totalPhysical: 7,
  },
  {
    id: 'ed-alert-3',
    titleAndEdition: 'Mắt biếc - Ấn bản Trẻ 2023',
    publisherYear: 'Ấn bản NXB Trẻ 2023',
    isbn: '978-604-1-20881-4',
    supplierCode: 'NCC-002',
    supplierLabel: 'NCC-002 - NXB Trẻ - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 1,
    availableRental: 2,
    rentedCount: 5,
    totalPhysical: 9,
  },
  {
    id: 'ed-alert-4',
    titleAndEdition: 'Doraemon - Tập 05',
    publisherYear: 'Ấn bản Kim Đồng 2024',
    isbn: '978-604-2-22305-3',
    supplierCode: 'NCC-001',
    supplierLabel: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 0,
    availableRental: 0,
    rentedCount: 8,
    totalPhysical: 8,
  },
  {
    id: 'ed-alert-5',
    titleAndEdition: 'Dế Mèn phiêu lưu ký',
    publisherYear: 'Ấn bản Kim Đồng 2024',
    isbn: '978-604-2-11982-8',
    supplierCode: 'NCC-001',
    supplierLabel: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 1,
    availableRental: 1,
    rentedCount: 2,
    totalPhysical: 4,
  },
  {
    id: 'ed-alert-6',
    titleAndEdition: 'Nhà giả kim',
    publisherYear: 'Ấn bản Văn học 2023',
    isbn: '978-604-3-45120-7',
    supplierCode: 'NCC-004',
    supplierLabel: 'NCC-004 - Sách Nhã Nam - ISBN thuộc ấn bản, không thuộc tác phẩm',
    minStockSale: 2,
    minStockRental: 3,
    availableSale: 1,
    availableRental: 0,
    rentedCount: 3,
    totalPhysical: 5,
  },
]

const SEVERITY_OPTIONS: SelectOption<AlertSeverity>[] = [
  { value: 'ALL', label: 'Ấn bản: Tất cả' },
  { value: 'OUT_OF_STOCK', label: 'Hết khả dụng' },
  { value: 'BOTH_LOW', label: 'Thiếu Bán & Thuê' },
  { value: 'RENTAL_LOW', label: 'Thiếu kho thuê' },
  { value: 'SALE_LOW', label: 'Thiếu kho bán' },
]

const SUPPLIER_FILTER_OPTIONS: SelectOption<string>[] = [
  { value: 'ALL', label: 'NCC: Tất cả' },
  { value: 'NCC-001', label: 'NXB Kim Đồng' },
  { value: 'NCC-002', label: 'NXB Trẻ' },
  { value: 'NCC-004', label: 'Sách Nhã Nam' },
]

const CHANNEL_FILTER_OPTIONS: SelectOption<ChannelFilter>[] = [
  { value: 'ALL', label: 'Kênh: Tất cả' },
  { value: 'SALE', label: 'Kênh Bán lẻ' },
  { value: 'RENTAL', label: 'Kênh Cho thuê' },
]

const PREFERRED_SUPPLIER_OPTIONS: SelectOption<string>[] = [
  {
    value: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
    label: 'NCC-001 - NXB Kim Đồng - ISBN thuộc ấn bản, không thuộc tác phẩm',
  },
  {
    value: 'NCC-002 - NXB Trẻ - ISBN thuộc ấn bản, không thuộc tác phẩm',
    label: 'NCC-002 - NXB Trẻ - ISBN thuộc ấn bản, không thuộc tác phẩm',
  },
  {
    value: 'NCC-004 - Sách Nhã Nam - ISBN thuộc ấn bản, không thuộc tác phẩm',
    label: 'NCC-004 - Sách Nhã Nam - ISBN thuộc ấn bản, không thuộc tác phẩm',
  },
]

function computeAlertDetails(item: EditionStockAlertItem) {
  const saleDeficit = Math.max(0, item.minStockSale - item.availableSale)
  const rentalDeficit = Math.max(0, item.minStockRental - item.availableRental)
  const isOutOfStock = item.availableSale === 0 && item.availableRental === 0
  const isSaleLow = item.availableSale < item.minStockSale
  const isRentalLow = item.availableRental < item.minStockRental

  let severity: Exclude<AlertSeverity, 'ALL'> = 'BOTH_LOW'
  let severityLabel = 'Thiếu Bán & Thuê'

  if (isOutOfStock) {
    severity = 'OUT_OF_STOCK'
    severityLabel = 'Hết khả dụng'
  } else if (isSaleLow && isRentalLow) {
    severity = 'BOTH_LOW'
    severityLabel = 'Thiếu Bán & Thuê'
  } else if (isRentalLow) {
    severity = 'RENTAL_LOW'
    severityLabel = `Thiếu kho thuê (còn ${item.availableRental}/${item.minStockRental})`
  } else if (isSaleLow) {
    severity = 'SALE_LOW'
    severityLabel = `Thiếu kho bán (còn ${item.availableSale}/${item.minStockSale})`
  }

  let suggestionText = ''
  if (!isSaleLow && isRentalLow) {
    suggestionText = `Nhập bổ sung ${Math.max(3, rentalDeficit + 2)} cuốn cho kho thuê`
  } else if (isSaleLow && !isRentalLow) {
    suggestionText = `Nhập bổ sung ${Math.max(2, saleDeficit + 1)} cuốn cho kho bán`
  } else {
    suggestionText = `+ ${Math.max(1, saleDeficit)} Bán - + ${Math.max(1, rentalDeficit)} Thuê`
  }

  return {
    saleDeficit,
    rentalDeficit,
    suggestedCount: Math.max(1, saleDeficit + rentalDeficit + ( !isSaleLow && isRentalLow ? 2 : 0 )),
    severity,
    severityLabel,
    suggestionText,
    isSaleLow,
    isRentalLow,
  }
}

export default function StockAlertsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EditionStockAlertItem[]>(INITIAL_EDITION_ALERTS)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity>('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('SALE')
  const [selectedId, setSelectedId] = useState(INITIAL_EDITION_ALERTS[0].id)

  const [formMinSale, setFormMinSale] = useState(`${INITIAL_EDITION_ALERTS[0].minStockSale} cuốn`)
  const [formMinRental, setFormMinRental] = useState(`${INITIAL_EDITION_ALERTS[0].minStockRental} cuốn`)
  const [formPreferredSupplier, setFormPreferredSupplier] = useState(INITIAL_EDITION_ALERTS[0].supplierLabel)

  const selectedEdition = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  )

  const handleSelectRow = (item: EditionStockAlertItem) => {
    setSelectedId(item.id)
    setFormMinSale(`${item.minStockSale} cuốn`)
    setFormMinRental(`${item.minStockRental} cuốn`)
    setFormPreferredSupplier(item.supplierLabel)
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const details = computeAlertDetails(item)
      if (severityFilter !== 'ALL' && details.severity !== severityFilter) return false
      if (supplierFilter !== 'ALL' && item.supplierCode !== supplierFilter) return false
      if (channelFilter === 'SALE' && item.availableSale > item.minStockSale) return false
      if (channelFilter === 'RENTAL' && item.availableRental > item.minStockRental) return false
      if (q) {
        return (
          item.titleAndEdition.toLowerCase().includes(q) ||
          item.isbn.toLowerCase().includes(q) ||
          item.publisherYear.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [items, search, severityFilter, supplierFilter, channelFilter])

  const handleSaveThresholds = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedEdition) return
    const parsedSale = Math.max(0, Number.parseInt(formMinSale.replace(/\D/g, ''), 10) || 0)
    const parsedRental = Math.max(0, Number.parseInt(formMinRental.replace(/\D/g, ''), 10) || 0)

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedEdition.id
          ? {
              ...item,
              minStockSale: parsedSale,
              minStockRental: parsedRental,
              supplierLabel: formPreferredSupplier,
            }
          : item,
      ),
    )
    setFormMinSale(`${parsedSale} cuốn`)
    setFormMinRental(`${parsedRental} cuốn`)
    notify.success(`Đã lưu cấu hình ngưỡng tồn cho "${selectedEdition.titleAndEdition}".`)
  }

  const selectedDetails = selectedEdition ? computeAlertDetails(selectedEdition) : null

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
      <p className="text-xs text-slate-500">
        Ưu tiên bổ sung các ấn bản hết hàng và thiếu kho thuê - Cập nhật 18/10/2026 10:20
      </p>

      <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          description="Theo cấu hình tồn an toàn kênh Bán và Thuê"
          label="Ấn bản chạm min"
          value="18"
          valueColor="amber"
        />
        <StatCard
          description="Cần nhập bổ sung cho kênh Thuê"
          label="Thiếu kho thuê"
          value="6"
          valueColor="rose"
        />
        <StatCard
          description="3 ấn bản - INB-20261018-012"
          label="Đang chờ nhập"
          value="45"
        />
        <StatCard
          description="Theo ngưỡng tồn an toàn kênh Bán và Thuê"
          label="Đề xuất bổ sung"
          value="72"
        />
      </section>

      <Card className="overflow-hidden" padding="none">
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh sách cần bổ sung theo Ấn bản</h2>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Bán lẻ: khả dụng &le; min_stock_sale - Cho thuê: khả dụng &le; min_stock_rental
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_160px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                aria-label="Tìm ấn bản hoặc ISBN"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm ấn bản / ISBN..."
                type="search"
                value={search}
              />
            </div>

            <SelectBox
              hideLabel
              label="Lọc mức độ ấn bản"
              onChange={(val) => setSeverityFilter(val)}
              options={SEVERITY_OPTIONS}
              searchable={false}
              value={severityFilter}
            />

            <SelectBox
              hideLabel
              label="Lọc nhà cung cấp"
              onChange={(val) => setSupplierFilter(val)}
              options={SUPPLIER_FILTER_OPTIONS}
              searchable={false}
              value={supplierFilter}
            />

            <SelectBox
              hideLabel
              label="Lọc theo kênh"
              onChange={(val) => setChannelFilter(val)}
              options={CHANNEL_FILTER_OPTIONS}
              searchable={false}
              value={channelFilter}
            />
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left" scope="col">Ấn bản / ISBN</th>
                <th className="px-4 py-3.5 text-left" scope="col">Tồn an toàn</th>
                <th className="px-4 py-3.5 text-left" scope="col">Khả dụng</th>
                <th className="px-4 py-3.5 text-left" scope="col">Đang thuê</th>
                <th className="px-4 py-3.5 text-left" scope="col">Tổng vật lý</th>
                <th className="px-4 py-3.5 text-left" scope="col">Mức độ</th>
                <th className="px-6 py-3.5 text-left" scope="col">Đề xuất theo kênh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>
                    Không có ấn bản nào chạm ngưỡng theo bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const details = computeAlertDetails(item)
                  const isSelected = selectedEdition?.id === item.id
                  return (
                    <tr
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/70'
                      }`}
                      key={item.id}
                      onClick={() => handleSelectRow(item)}
                    >
                      <td className="px-6 py-4 align-top">
                        <span className="font-bold text-slate-900 block">{item.titleAndEdition}</span>
                        <span className="mt-0.5 font-mono text-[11px] font-semibold text-slate-600 block">
                          ISBN {item.isbn}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600 space-y-0.5">
                        <span className="block">Bán: {item.minStockSale}</span>
                        <span className="block">Thuê: {item.minStockRental}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700 font-medium space-y-0.5">
                        <span className="block">Bán: {item.availableSale}</span>
                        <span className="block">Thuê: {item.availableRental}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{item.rentedCount}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{item.totalPhysical}</td>
                      <td className="px-4 py-4 align-top text-slate-700 font-medium">
                        {details.severityLabel}
                      </td>
                      <td className="px-6 py-4 align-top text-slate-700 font-medium">
                        {details.suggestionText}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
          <span>Hiển thị 1–{filteredItems.length} trong 18 ấn bản cần bổ sung</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
              1
            </span>
          </div>
        </div>
      </Card>

      {selectedEdition && selectedDetails && (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <Card bodyClassName="space-y-5" padding="lg">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cấu hình ngưỡng tồn cho ấn bản</h2>
              <p className="mt-1 text-xs font-bold text-slate-900">
                Đang chọn: {selectedEdition.titleAndEdition}
              </p>
              <p className="mt-0.5 font-mono text-xs font-bold text-slate-700">
                ISBN {selectedEdition.isbn}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSaveThresholds}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Tồn an toàn kênh Bán (min_stock_sale) *"
                  onChange={(e) => setFormMinSale(e.target.value)}
                  required
                  value={formMinSale}
                />
                <TextField
                  label="Tồn an toàn kênh Thuê (min_stock_rental)"
                  onChange={(e) => setFormMinRental(e.target.value)}
                  value={formMinRental}
                />
              </div>

              <SelectBox
                label="Nhà cung cấp ưu tiên"
                onChange={(val) => setFormPreferredSupplier(val)}
                options={PREFERRED_SUPPLIER_OPTIONS}
                searchable={false}
                value={formPreferredSupplier}
              />

              <div className="pt-1">
                <Button type="submit" variant="primary">
                  Lưu ngưỡng tồn
                </Button>
              </div>
            </form>
          </Card>

          <Card bodyClassName="space-y-5" padding="lg">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Đề xuất nhập bổ sung theo kênh</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                {selectedEdition.titleAndEdition}: Bán còn {selectedEdition.availableSale}/{selectedEdition.minStockSale}; Thuê còn {selectedEdition.availableRental}/{selectedEdition.minStockRental} khả dụng, {selectedEdition.rentedCount} cuốn đang thuê. Đề xuất{' '}
                <strong>{selectedDetails.suggestionText.toLowerCase()}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-950 flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-600 text-[10px] font-bold text-indigo-700">
                i
              </span>
              <span className="leading-relaxed">
                Chuyển đề xuất thành Phiếu nhập NCC theo ISBN của ấn bản. Chỉ tăng khả dụng khi xác nhận giá bán và hoàn tất nhập.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate('/pos')}
                type="button"
                variant="outline"
              >
                + Thu mua sách cũ theo Bộ →
              </Button>
              <Button
                onClick={() => navigate(catalogPaths.stockReceipts)}
                type="button"
                variant="secondary"
              >
                + Lập Phiếu Nhập NCC cho ấn bản này
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card bodyClassName="space-y-3" padding="lg">
        <h2 className="text-sm font-bold text-slate-900">Đang cập nhật tồn kho - Trạng thái hỗ trợ</h2>
        <p className="text-xs text-slate-500">
          Đang tải số lượng khả dụng mới nhất... Không gửi đề xuất trùng trong lúc đồng bộ.
        </p>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-slate-200" />
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-slate-200" />
          </div>
        </div>
      </Card>
    </WarehouseWorkspace>
  )
}
