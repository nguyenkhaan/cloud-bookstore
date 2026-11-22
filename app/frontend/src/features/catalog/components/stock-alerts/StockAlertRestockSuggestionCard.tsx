import { Button, Card } from '@/components/common'
import type { EditionStockAlertItem } from '../../catalog.type'
import { formatEditionDisplay, getChannelRestockAmounts } from './stock-alerts.utils'

type StockAlertRestockSuggestionCardProps = {
  onNavigateBuyback: () => void
  selectedEdition: EditionStockAlertItem
}

export function StockAlertRestockSuggestionCard({
  onNavigateBuyback,
  selectedEdition,
}: StockAlertRestockSuggestionCardProps) {
  const { saleAdd, rentalAdd } = getChannelRestockAmounts(selectedEdition)

  return (
    <Card bodyClassName="space-y-5" padding="lg">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Đề xuất nhập bổ sung theo kênh</h2>
        <p className="mt-1 text-xs font-bold text-slate-800">
          {formatEditionDisplay(selectedEdition)} ({selectedEdition.rentedCount} cuốn đang cho thuê)
        </p>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
          <div>
            <span className="font-bold text-slate-900 block">Kênh Bán lẻ</span>
            <span className="text-slate-500">
              Khả dụng: {selectedEdition.availableSale} / {selectedEdition.minStockSale} cuốn
            </span>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 font-bold ${
              saleAdd > 0
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {saleAdd > 0 ? `Kênh Bán: +${saleAdd} cuốn` : 'Kênh Bán: Đủ tồn'}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
          <div>
            <span className="font-bold text-slate-900 block">Kênh Cho thuê</span>
            <span className="text-slate-500">
              Khả dụng: {selectedEdition.availableRental} / {selectedEdition.minStockRental} cuốn
            </span>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 font-bold ${
              rentalAdd > 0
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {rentalAdd > 0 ? `Kênh Thuê: +${rentalAdd} cuốn` : 'Kênh Thuê: Đủ tồn'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-950">
        Chuyển đề xuất thành Phiếu nhập NCC theo ISBN của ấn bản. Chỉ tăng khả dụng khi xác nhận giá bán và hoàn tất nhập.
      </div>

      <div>
        <Button onClick={onNavigateBuyback} type="button" variant="outline">
          + Thu mua sách cũ theo Bộ →
        </Button>
      </div>
    </Card>
  )
}
