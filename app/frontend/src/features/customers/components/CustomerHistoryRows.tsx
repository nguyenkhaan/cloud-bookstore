import { Link } from 'react-router-dom'
import {
    STATUS_TONE_CLASSES,
    describeViolation,
    formatDateTimeVi,
    formatDateVi,
    formatVnd,
    getBuybackStatus,
    getRentalSlipStatus,
    getSaleStatus,
    getViolationResult,
} from '../customers.presentation'
import type { StatusDescriptor } from '../customers.presentation'
import { sourceDocumentPaths } from '../customers.route'
import type {
    CustomerBuybackItem,
    CustomerRentalItem,
    CustomerSaleItem,
    CustomerViolationItem,
} from '../customers.type'

// Column templates are literal strings so Tailwind can detect them.
export const RENTAL_COLUMNS = 'sm:grid-cols-[1.4fr_1fr_1.2fr_1fr]'
export const SALE_COLUMNS = 'sm:grid-cols-[1fr_1.4fr_1fr_1fr_1fr]'
export const BUYBACK_COLUMNS = 'sm:grid-cols-[1fr_1.4fr_1fr_1fr_1fr]'
export const VIOLATION_COLUMNS = 'sm:grid-cols-[1fr_1.4fr_1fr_1fr]'

const linkClass =
    'font-mono font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600'

export function StatusPill({ status }: { status: StatusDescriptor }) {
    return (
        <span
            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE_CLASSES[status.tone]}`}
        >
      {status.label}
    </span>
    )
}

/** Số chứng từ: có link khi đã có trang đích, ngược lại hiển thị mã để tra cứu. */
function SourceCode({ code, path }: { code: string; path: string | null }) {
    if (!path) return <span className="break-all font-mono font-bold text-slate-900">{code}</span>
    return (
        <Link className={`${linkClass} break-all`} to={path}>
            {code}
        </Link>
    )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <span className="mr-1 font-semibold text-slate-600 sm:hidden">{label}:</span>
            {children}
        </div>
    )
}

function titleLabel(titleName: string, volumeLabel: string | null) {
    return volumeLabel ? `${titleName} ${volumeLabel}` : titleName
}

export function RentalRowCells({ item }: { item: CustomerRentalItem }) {
    const status = getRentalSlipStatus(item.status, item.isOverdue)
    const refundText =
        item.refundTotal > 0
            ? `${formatVnd(item.refundTotal)} đã hoàn`
            : item.status === 'ACTIVE'
                ? `${formatVnd(item.depositTotal)} đang giữ`
                : `Cọc ${formatVnd(item.depositTotal)}`

    return (
        <>
            <div className="min-w-0">
                <SourceCode code={item.slipNo} path={sourceDocumentPaths.rentalSlip(item.slipId)} />
                <ul className="mt-1 space-y-0.5">
                    {item.lines.map((line) => (
                        <li className="break-words text-slate-700" key={line.lineId}>
                            {titleLabel(line.titleName, line.volumeLabel)} ·{' '}
                            <Link className={linkClass} to={sourceDocumentPaths.copy(line.copyId)}>
                                {line.copyBarcode}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            <Cell label="Thuê → Hạn trả">
        <span className="text-slate-600">
          {formatDateVi(item.rentDate)} → {formatDateVi(item.dueAt)}
        </span>
            </Cell>
            <Cell label="Trả thực tế / Gia hạn">
                <p className="text-slate-700">
                    {item.returnedAt ? `Trả ${formatDateTimeVi(item.returnedAt)}` : 'Chưa trả'}
                </p>
                <p className="text-slate-600">
                    {item.extensionCount}/2 lần gia hạn
                    {item.lateDays > 0 ? ` · Trễ ${item.lateDays} ngày` : ''}
                </p>
                {item.returnNo && (
                    <p className="font-mono text-[11px] text-slate-600">Biên nhận {item.returnNo}</p>
                )}
            </Cell>
            <Cell label="Cọc hoàn / Trạng thái">
                <p className="text-slate-700">{refundText}</p>
                {item.outstandingAmount > 0 && (
                    <p className="font-semibold text-rose-700">Còn nợ {formatVnd(item.outstandingAmount)}</p>
                )}
                <div className="mt-1">
                    <StatusPill status={status} />
                </div>
            </Cell>
        </>
    )
}

export function SaleRowCells({ item }: { item: CustomerSaleItem }) {
    const status = getSaleStatus(item.status, item.isFullyReversed)
    return (
        <>
            <Cell label="Mã hóa đơn">
                <SourceCode
                    code={item.invoiceNo ?? 'Chưa cấp số'}
                    path={sourceDocumentPaths.saleInvoice(item.invoiceId)}
                />
            </Cell>
            <div className="min-w-0">
                <ul className="space-y-0.5">
                    {item.lines.map((line) => (
                        <li
                            className={`break-words ${line.status === 'REVERSED' ? 'text-slate-600 line-through' : 'text-slate-700'}`}
                            key={line.lineId}
                        >
                            {titleLabel(line.titleName, line.volumeLabel)} ·{' '}
                            <Link className={linkClass} to={sourceDocumentPaths.copy(line.copyId)}>
                                {line.copyBarcode}
                            </Link>
                            {line.status === 'REVERSED' ? ' (đã đảo)' : ''}
                        </li>
                    ))}
                </ul>
            </div>
            <Cell label="Ngày giao dịch">
                <span className="text-slate-600">{formatDateTimeVi(item.occurredAt)}</span>
            </Cell>
            <Cell label="Giảm giá hạng">
                <span className="text-slate-700">{formatVnd(item.discountTotal)}</span>
            </Cell>
            <Cell label="Tổng tiền">
                <p className="font-semibold text-slate-900">{formatVnd(item.totalPayable)}</p>
                {item.hasReversedLines && (
                    <p className="text-[11px] text-slate-600">Tính chi tiêu: {formatVnd(item.countedAmount)}</p>
                )}
                <div className="mt-1">
                    <StatusPill status={status} />
                </div>
            </Cell>
        </>
    )
}

export function BuybackRowCells({ item }: { item: CustomerBuybackItem }) {
    const status = getBuybackStatus(item.status, item.isPaidOut)
    return (
        <>
            <Cell label="Mã phiếu thu mua">
                <SourceCode code={item.code} path={sourceDocumentPaths.stockReceipt(item.receiptId)} />
            </Cell>
            <div className="min-w-0">
                <ul className="space-y-0.5">
                    {item.lines.map((line, index) => (
                        <li className="break-words text-slate-700" key={`${line.titleName}-${index}`}>
                            {titleLabel(line.titleName, line.volumeLabel)} · Loại {line.conditionGrade}
                            {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                        </li>
                    ))}
                </ul>
            </div>
            <Cell label="Ngày thu mua">
                <span className="text-slate-600">{formatDateTimeVi(item.occurredAt)}</span>
            </Cell>
            <Cell label="Giá thỏa thuận">
                <span className="font-semibold text-slate-900">{formatVnd(item.totalAmount)}</span>
            </Cell>
            <Cell label="Trạng thái">
                <StatusPill status={status} />
                <p className="mt-1 text-[11px] text-slate-600">Không cộng vào chi tiêu xét hạng</p>
            </Cell>
        </>
    )
}

export function ViolationRowCells({ item }: { item: CustomerViolationItem }) {
    const result = getViolationResult(item.result)
    const reasons = describeViolation(item)
    const deduction = item.latePenalty + item.damagePenalty
    return (
        <>
            <Cell label="Ngày / Phiếu">
                <p className="text-slate-700">{formatDateVi(item.occurredAt)}</p>
                <SourceCode code={item.slipNo} path={sourceDocumentPaths.rentalSlip(item.slipId)} />
            </Cell>
            <Cell label="Vi phạm">
                <p className="break-words text-slate-800">
                    {titleLabel(item.titleName, item.volumeLabel)} ·{' '}
                    <Link className={linkClass} to={sourceDocumentPaths.copy(item.copyId)}>
                        {item.copyBarcode}
                    </Link>
                </p>
                <p className="text-slate-600">{reasons.join(' · ') || '—'}</p>
            </Cell>
            <Cell label="Khoản trừ">
                <p className="text-slate-800">{formatVnd(deduction)}</p>
                {item.lostRetainedAmount > 0 && (
                    <p className="text-[11px] text-slate-600">Cọc giữ do mất: {formatVnd(item.lostRetainedAmount)}</p>
                )}
                {item.outstandingAmount > 0 && (
                    <p className="text-[11px] font-semibold text-rose-700">Còn nợ: {formatVnd(item.outstandingAmount)}</p>
                )}
            </Cell>
            <Cell label="Kết quả">
                <StatusPill status={result} />
            </Cell>
        </>
    )
}