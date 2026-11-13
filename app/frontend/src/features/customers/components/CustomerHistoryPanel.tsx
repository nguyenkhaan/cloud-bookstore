import { useState } from 'react'
import { HISTORY_STATUS_OPTIONS } from '../customers.presentation'
import type { CustomerHistoryQuery, CustomerHistoryTab } from '../customers.type'
import { CustomerHistoryFilters } from './CustomerHistoryFilters'
import type { HistoryFilterValue } from './CustomerHistoryFilters'
import { BuybackList, RentalList, SaleList, ViolationList } from './CustomerHistoryLists'

type CustomerHistoryPanelProps = {
    customerId: string
    tab: CustomerHistoryTab
}

const PAGE_SIZE = 10

/** Render với `key={tab}` ở trang cha để bộ lọc/trang tự reset khi đổi tab. */
export function CustomerHistoryPanel({ customerId, tab }: CustomerHistoryPanelProps) {
    const [filters, setFilters] = useState<HistoryFilterValue>({ status: '', from: '', to: '' })
    const [page, setPage] = useState(1)

    const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to)
    const query: CustomerHistoryQuery = {
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
        from: !rangeInvalid && filters.from ? filters.from : undefined,
        to: !rangeInvalid && filters.to ? filters.to : undefined,
    }

    const listProps = { customerId, query, onPage: setPage }

    return (
        <div>
            <CustomerHistoryFilters
                onChange={(next) => {
                    setFilters(next)
                    setPage(1)
                }}
                statusOptions={HISTORY_STATUS_OPTIONS[tab]}
                value={filters}
            />
            {tab === 'rentals' && <RentalList {...listProps} />}
            {tab === 'sales' && <SaleList {...listProps} />}
            {tab === 'buybacks' && <BuybackList {...listProps} />}
            {tab === 'violations' && <ViolationList {...listProps} />}
        </div>
    )
}