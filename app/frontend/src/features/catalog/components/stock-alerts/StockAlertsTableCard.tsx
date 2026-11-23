import { Search } from 'lucide-react'
import { Card, SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common'
import type { EditionStockAlertItem } from '../../catalog.type'
import {
  CHANNEL_FILTER_OPTIONS,
  SEVERITY_OPTIONS,
  formatEditionDisplay,
  getChannelRestockAmounts,
  type AlertSeverity,
  type ChannelFilter,
} from './stock-alerts.utils'

type StockAlertsTableCardProps = {
  channelFilter: ChannelFilter
  filteredItems: EditionStockAlertItem[]
  isLoading: boolean
  onChangeChannelFilter: (value: ChannelFilter) => void
  onChangeSearch: (value: string) => void
  onChangeSeverityFilter: (value: AlertSeverity) => void
  onChangeSupplierFilter: (value: string) => void
  onSelectRow: (item: EditionStockAlertItem) => void
  search: string
  selectedEditionId?: string | null
  severityFilter: AlertSeverity
  supplierFilter: string
  supplierFilterOptions: SelectOption<string>[]
  totalCount: number
}

export function StockAlertsTableCard({
  channelFilter,
  filteredItems,
  isLoading,
  onChangeChannelFilter,
  onChangeSearch,
  onChangeSeverityFilter,
  onChangeSupplierFilter,
  onSelectRow,
  search,
  selectedEditionId,
  severityFilter,
  supplierFilter,
  supplierFilterOptions,
  totalCount,
}: StockAlertsTableCardProps) {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Danh sách cần bổ sung theo Ấn bản</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              aria-label="Tìm ấn bản hoặc ISBN"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Tìm ấn bản / ISBN..."
              type="search"
              value={search}
            />
          </div>

          <SelectBox
            hideLabel
            label="Lọc mức độ ấn bản"
            onChange={(val) => onChangeSeverityFilter(val)}
            options={SEVERITY_OPTIONS}
            searchable={false}
            value={severityFilter}
          />

          <SelectBox
            hideLabel
            label="Lọc nhà cung cấp"
            onChange={(val) => onChangeSupplierFilter(val)}
            options={supplierFilterOptions}
            searchable={false}
            value={supplierFilter}
          />

          <SelectBox
            hideLabel
            label="Lọc theo kênh"
            onChange={(val) => onChangeChannelFilter(val)}
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
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-center text-slate-400" colSpan={7}>
                  Đang tải dữ liệu cảnh báo tồn kho...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>
                  Không có ấn bản nào khớp theo bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedEditionId === item.editionId
                const { saleAdd, rentalAdd } = getChannelRestockAmounts(item)
                return (
                  <tr
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/70'
                    }`}
                    key={item.editionId}
                    onClick={() => onSelectRow(item)}
                  >
                    <td className="px-6 py-4 align-top">
                      <span className="font-bold text-slate-900 block">
                        {formatEditionDisplay(item)}
                      </span>
                      <span className="mt-0.5 font-mono text-[11px] font-semibold text-slate-600 block">
                        ISBN {item.isbn ?? 'Chưa cập nhật'}
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
                      {item.severityLabel}
                    </td>
                    <td className="px-6 py-4 align-top font-medium space-y-0.5">
                      <span
                        className={`block ${
                          saleAdd > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'
                        }`}
                      >
                        {saleAdd > 0 ? `Kênh Bán: +${saleAdd} cuốn` : 'Kênh Bán: Đủ tồn'}
                      </span>
                      <span
                        className={`block ${
                          rentalAdd > 0 ? 'font-semibold text-rose-700' : 'text-slate-500'
                        }`}
                      >
                        {rentalAdd > 0 ? `Kênh Thuê: +${rentalAdd} cuốn` : 'Kênh Thuê: Đủ tồn'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
        <span>
          Hiển thị {filteredItems.length} trong tổng số {totalCount} ấn bản
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
            1
          </span>
        </div>
      </div>
    </Card>
  )
}
