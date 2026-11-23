import { formatDateVi, formatVnd } from '../customers.presentation'
import type { CustomerHistorySummary } from '../customers.type'
import { ViolationList } from './CustomerHistoryLists'

type CustomerHistorySummaryCardsProps = {
    customerId: string
    summary: CustomerHistorySummary
}

const cardClass = 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs'
const PREVIEW_QUERY = { page: 1, pageSize: 5 }

export function CustomerHistorySummaryCards({ customerId, summary }: CustomerHistorySummaryCardsProps) {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                <section aria-label="Tóm tắt mua sách tại quầy" className={cardClass}>
                    <h3 className="text-sm font-bold text-slate-900">Mua sách tại quầy</h3>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                        Tóm tắt tab · {summary.saleCount} hóa đơn
                    </p>
                    <p className="mt-4 text-xs text-slate-600">
                        Tiền mua hợp lệ{' '}
                        <span className="ml-2 text-base font-bold text-slate-900">{formatVnd(summary.salesSpend)}</span>
                    </p>
                    <div className="mt-3 space-y-0.5 text-[11px] text-slate-600">
                        {summary.latestSale ? (
                            <p>
                                Gần nhất {summary.latestSale.no || '—'} · {formatDateVi(summary.latestSale.at)} ·{' '}
                                {formatVnd(summary.latestSale.amount)}
                            </p>
                        ) : (
                            <p>Chưa có hóa đơn nào.</p>
                        )}
                        <p>Chiết khấu đã nhận: {formatVnd(summary.salesDiscountTotal)}</p>
                    </div>
                </section>

                <section aria-label="Tóm tắt bán sách cũ cho tiệm" className={cardClass}>
                    <h3 className="text-sm font-bold text-slate-900">Bán sách cũ cho tiệm</h3>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                        Tóm tắt tab · {summary.buybackCount} phiếu
                    </p>
                    <p className="mt-4 text-xs text-slate-600">
                        Cửa hàng đã chi{' '}
                        <span className="ml-2 text-base font-bold text-slate-900">{formatVnd(summary.buybackPaidTotal)}</span>
                    </p>
                    <div className="mt-3 space-y-0.5 text-[11px] text-slate-600">
                        {summary.latestBuyback ? (
                            <p>
                                Gần nhất {summary.latestBuyback.no} · {formatDateVi(summary.latestBuyback.at)} ·{' '}
                                {formatVnd(summary.latestBuyback.amount)}
                            </p>
                        ) : (
                            <p>Chưa có phiếu thu mua nào.</p>
                        )}
                        <p>Không cộng vào chi tiêu xét hạng.</p>
                    </div>
                </section>
            </div>

            <section aria-label="Nhật ký vi phạm và quyết toán" className={cardClass}>
                <h3 className="text-sm font-bold text-slate-900">Nhật ký vi phạm &amp; Quyết toán</h3>
                <p className="mt-0.5 text-[11px] text-slate-600">
                    {summary.outstandingAmount > 0
                        ? `Còn nợ tồn đọng ${formatVnd(summary.outstandingAmount)}`
                        : 'Không có nợ tồn đọng'}
                </p>
                <div className="mt-4">
                    <ViolationList customerId={customerId} hidePager query={PREVIEW_QUERY} />
                </div>
                <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-600">
                    Chi tiêu hợp lệ tính từ chứng từ: mua sách {formatVnd(summary.salesSpend)} + thuê và gia hạn đã quyết
                    toán {formatVnd(summary.rentalSpend)} = {formatVnd(summary.computedEligibleSpend)}. Cọc, phạt, bồi thường,
                    thu mua và giao dịch đã đảo không được cộng.
                    {summary.eligibleSpendMismatch && (
                        <span className="ml-1 font-semibold text-amber-800">
              Hồ sơ đang lưu {formatVnd(summary.storedEligibleSpend)}, chưa khớp số tính từ chứng từ.
            </span>
                    )}
                </p>
            </section>
        </>
    )
}