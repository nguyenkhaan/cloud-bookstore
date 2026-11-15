import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@/components/common/Button'
import {
    useCustomerBuybacks,
    useCustomerRentals,
    useCustomerSales,
    useCustomerViolations,
} from '../customers.hook'
import { CustomerApiError } from '../customers.service'
import type { CustomerHistoryQuery, PagedResult } from '../customers.type'
import {
    BUYBACK_COLUMNS,
    BuybackRowCells,
    RENTAL_COLUMNS,
    RentalRowCells,
    SALE_COLUMNS,
    SaleRowCells,
    VIOLATION_COLUMNS,
    ViolationRowCells,
} from './CustomerHistoryRows'

type HistoryListProps<T> = {
    result: UseQueryResult<PagedResult<T>, Error>
    headers: string[]
    columns: string
    emptyText: string
    getKey: (item: T) => string
    renderItem: (item: T) => ReactNode
    onPage?: (page: number) => void
    hidePager?: boolean
}

function HistoryList<T>({
                            result, headers, columns, emptyText, getKey, renderItem, onPage, hidePager,
                        }: HistoryListProps<T>) {
    const { data, isLoading, isError, error, isFetching } = result

    if (isLoading) {
        return (
            <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-xs text-slate-600" role="status">
                Đang tải lịch sử...
            </p>
        )
    }

    if (isError) {
        const forbidden = error instanceof CustomerApiError && error.status === 403
        return (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 px-4 py-6 text-center text-xs text-rose-800" role="alert">
                {forbidden ? 'Bạn không có quyền xem mục này.' : error.message}
            </div>
        )
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-10 text-center text-xs leading-relaxed text-slate-600">
                {emptyText}
            </div>
        )
    }

    return (
        <div aria-busy={isFetching}>
            <div
                aria-hidden="true"
                className={`hidden rounded-lg bg-indigo-50/50 px-3 py-2.5 text-[11px] font-semibold text-slate-600 sm:grid sm:gap-3 ${columns}`}
            >
                {headers.map((header) => (
                    <div key={header}>{header}</div>
                ))}
            </div>
            <ul className="divide-y divide-slate-100">
                {data.items.map((item) => (
                    <li className={`grid gap-2 px-3 py-3.5 text-xs sm:gap-3 ${columns}`} key={getKey(item)}>
                        {renderItem(item)}
                    </li>
                ))}
            </ul>

            {!hidePager && data.totalPages > 1 && onPage && (
                <nav aria-label="Phân trang lịch sử" className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-600">
                        Trang {data.page}/{data.totalPages} · {data.totalCount} bản ghi
                    </p>
                    <div className="flex gap-2">
                        <Button
                            className="min-h-[44px]"
                            disabled={!data.hasPreviousPage}
                            onClick={() => onPage(data.page - 1)}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            Trước
                        </Button>
                        <Button
                            className="min-h-[44px]"
                            disabled={!data.hasNextPage}
                            onClick={() => onPage(data.page + 1)}
                            size="sm"
                            type="button"
                            variant="outline"
                        >
                            Sau
                        </Button>
                    </div>
                </nav>
            )}
        </div>
    )
}

type ListProps = { customerId: string; query: CustomerHistoryQuery; onPage?: (page: number) => void }

export function RentalList({ customerId, query, onPage }: ListProps) {
    const result = useCustomerRentals(customerId, query)
    return (
        <HistoryList
            columns={RENTAL_COLUMNS}
            emptyText="Chưa có phiếu thuê hoặc trả sách nào khớp với bộ lọc hiện tại."
            getKey={(item) => item.slipId}
            headers={['Phiếu thuê', 'Thuê → Hạn trả', 'Trả thực tế / Gia hạn', 'Cọc hoàn / Trạng thái']}
            onPage={onPage}
            renderItem={(item) => <RentalRowCells item={item} />}
            result={result}
        />
    )
}

export function SaleList({ customerId, query, onPage }: ListProps) {
    const result = useCustomerSales(customerId, query)
    return (
        <HistoryList
            columns={SALE_COLUMNS}
            emptyText="Chưa có hóa đơn mua sách nào khớp với bộ lọc hiện tại."
            getKey={(item) => item.invoiceId}
            headers={['Mã hóa đơn', 'Sách đã mua', 'Ngày giao dịch', 'Giảm giá hạng', 'Tổng tiền']}
            onPage={onPage}
            renderItem={(item) => <SaleRowCells item={item} />}
            result={result}
        />
    )
}

export function BuybackList({ customerId, query, onPage }: ListProps) {
    const result = useCustomerBuybacks(customerId, query)
    return (
        <HistoryList
            columns={BUYBACK_COLUMNS}
            emptyText="Chưa có giao dịch bán sách cũ nào khớp với bộ lọc hiện tại."
            getKey={(item) => item.receiptId}
            headers={['Mã phiếu thu mua', 'Đầu sách & Phân loại', 'Ngày thu mua', 'Giá thỏa thuận', 'Trạng thái']}
            onPage={onPage}
            renderItem={(item) => <BuybackRowCells item={item} />}
            result={result}
        />
    )
}

export function ViolationList({
                                  customerId, query, onPage, hidePager,
                              }: ListProps & { hidePager?: boolean }) {
    const result = useCustomerViolations(customerId, query)
    return (
        <HistoryList
            columns={VIOLATION_COLUMNS}
            emptyText="Chưa có vi phạm hoặc nghĩa vụ tồn đọng nào được ghi nhận."
            getKey={(item) => item.lineId}
            headers={['Ngày / Phiếu', 'Vi phạm', 'Khoản trừ', 'Kết quả']}
            hidePager={hidePager}
            onPage={onPage}
            renderItem={(item) => <ViolationRowCells item={item} />}
            result={result}
        />
    )
}