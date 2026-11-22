import type { FormEvent } from 'react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import type { EditionStockAlertItem } from '../../catalog.type'
import {
  blockNonDigitKeys,
  formatEditionDisplay,
  sanitizeDigitsOnly,
} from './stock-alerts.utils'

type StockAlertThresholdFormCardProps = {
  displayMinRental: string
  displayMinSale: string
  displayPreferredSupplier: string
  isPending: boolean
  onChangeMinRental: (value: string) => void
  onChangeMinSale: (value: string) => void
  onChangePreferredSupplier: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  preferredSupplierOptions: SelectOption<string>[]
  selectedEdition: EditionStockAlertItem
}

export function StockAlertThresholdFormCard({
  displayMinRental,
  displayMinSale,
  displayPreferredSupplier,
  isPending,
  onChangeMinRental,
  onChangeMinSale,
  onChangePreferredSupplier,
  onSubmit,
  preferredSupplierOptions,
  selectedEdition,
}: StockAlertThresholdFormCardProps) {
  return (
    <Card bodyClassName="space-y-5" padding="lg">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Cấu hình ngưỡng tồn cho ấn bản</h2>
        <p className="mt-1 text-xs font-bold text-slate-900">
          Đang chọn: {formatEditionDisplay(selectedEdition)}
        </p>
        <p className="mt-0.5 font-mono text-xs font-bold text-slate-700">
          ISBN {selectedEdition.isbn ?? 'Chưa cập nhật'}
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            inputMode="numeric"
            label="Tồn an toàn kênh Bán *"
            onChange={(e) => onChangeMinSale(sanitizeDigitsOnly(e.target.value))}
            onKeyDown={blockNonDigitKeys}
            pattern="[0-9]*"
            placeholder="Nhập số nguyên >= 0"
            required
            type="text"
            value={displayMinSale}
          />
          <TextField
            inputMode="numeric"
            label="Tồn an toàn kênh Thuê *"
            onChange={(e) => onChangeMinRental(sanitizeDigitsOnly(e.target.value))}
            onKeyDown={blockNonDigitKeys}
            pattern="[0-9]*"
            placeholder="Nhập số nguyên >= 0"
            required
            type="text"
            value={displayMinRental}
          />
        </div>

        <SelectBox
          label="Nhà cung cấp ưu tiên"
          onChange={(val) => onChangePreferredSupplier(val)}
          options={preferredSupplierOptions}
          searchable={false}
          value={displayPreferredSupplier}
        />

        <div className="pt-1">
          <Button disabled={isPending} type="submit" variant="primary">
            {isPending ? 'Đang lưu...' : 'Lưu ngưỡng tồn'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
