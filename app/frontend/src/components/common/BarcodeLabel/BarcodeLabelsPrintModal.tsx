import { Download, Printer, X } from 'lucide-react'
import { Button } from '../Button/Button'
import { notify } from '../Toast'
import {
  buildBarcodeLabelsCsvContent,
  escapePrintHtml,
  type PrintableBarcodeLabelItem,
} from './barcode-labels-print'

export type { PrintableBarcodeLabelItem } from './barcode-labels-print'

type BarcodeLabelsPrintModalProps = {
  batchCode: string
  items: PrintableBarcodeLabelItem[]
  onClose: () => void
  title: string
}

const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '*': 'nwnnwnwnn',
}

type BarRect = {
  x: number
  width: number
}

function encodeCode39Bars(rawCode: string): { bars: BarRect[]; totalWidth: number } {
  const sanitized = rawCode
    .toUpperCase()
    .replace(/[^0-9A-Z-]/g, '-')
  const full = `*${sanitized}*`
  const narrow = 1.6
  const wide = 3.8
  const interCharGap = narrow

  const bars: BarRect[] = []
  let cursor = 4

  for (let cIdx = 0; cIdx < full.length; cIdx++) {
    const ch = full[cIdx]
    const pattern = CODE39_PATTERNS[ch] ?? CODE39_PATTERNS['-']
    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] === 'w' ? wide : narrow
      const isBar = i % 2 === 0
      if (isBar) {
        bars.push({ x: cursor, width: w })
      }
      cursor += w
    }
    cursor += interCharGap
  }

  return { bars, totalWidth: cursor + 4 }
}

function buildSvgMarkup(barcode: string): string {
  const { bars, totalWidth } = encodeCode39Bars(barcode)
  const rects = bars
    .map((b) => `<rect x="${b.x.toFixed(1)}" y="2" width="${b.width.toFixed(1)}" height="38" fill="#0f172a" />`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} 42" width="100%" height="42" preserveAspectRatio="none">${rects}</svg>`
}

function BarcodeSvg({ barcode }: { barcode: string }) {
  const { bars, totalWidth } = encodeCode39Bars(barcode)
  return (
    <svg
      aria-label={`Mã vạch ${barcode}`}
      className="mx-auto h-11 w-full max-w-56"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${totalWidth} 42`}
    >
      {bars.map((bar, idx) => (
        <rect
          fill="#0f172a"
          height={38}
          key={`${barcode}-${idx}`}
          width={bar.width}
          x={bar.x}
          y={2}
        />
      ))}
    </svg>
  )
}

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function BarcodeLabelsPrintModal({
  batchCode,
  items,
  onClose,
  title,
}: BarcodeLabelsPrintModalProps) {
  const handleDownloadCsv = () => {
    const blob = new Blob([`\uFEFF${buildBarcodeLabelsCsvContent(items)}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode-labels-${batchCode}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify.success(`Đã tải file danh sách ${items.length} mã CopyBarcode (.csv).`)
  }

  const handlePrintThermalLabels = () => {
    const printWin = window.open('', '_blank', 'width=900,height=700')
    if (!printWin) {
      notify.error('Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép Pop-up để mở bản in.')
      return
    }

    const cardsHtml = items
      .map((item) => {
        const safeBarcode = escapePrintHtml(item.barcode)
        const safeTitleName = escapePrintHtml(item.titleName)
        const safeGrade = item.grade ? ` - Grade ${escapePrintHtml(item.grade)}` : ''
        return `
        <div class="label-card">
          <div class="store-name">CLOUD BOOKSTORE</div>
          <div class="svg-wrap">${buildSvgMarkup(item.barcode)}</div>
          <div class="barcode-code">${safeBarcode}</div>
          <div class="book-title">${safeTitleName}</div>
          <div class="book-price">Giá bán: ${formatVnd(item.sellingPrice)}${safeGrade}</div>
        </div>`
      })
      .join('')
    const safeBatchCode = escapePrintHtml(batchCode)

    printWin.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>In tem CopyBarcode - ${safeBatchCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; background: #f8fafc; color: #0f172a; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .toolbar h1 { font-size: 15px; font-weight: 700; }
    .print-btn { background: #4f46e5; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
    .label-card { background: #fff; border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px 12px; text-align: center; page-break-inside: avoid; }
    .store-name { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: #64748b; margin-bottom: 4px; }
    .svg-wrap { width: 100%; height: 42px; margin: 2px auto; }
    .barcode-code { font-family: monospace; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; margin-top: 2px; }
    .book-title { font-size: 11px; font-weight: 700; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .book-price { font-size: 11px; font-weight: 700; color: #4338ca; margin-top: 2px; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .label-card { border: 1px solid #cbd5e1; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>Bản in tem nhiệt CopyBarcode (${safeBatchCode} - ${items.length} tem)</h1>
    <button class="print-btn" onclick="window.print()">In ngay (Ctrl+P)</button>
  </div>
  <div class="grid">${cardsHtml}</div>
  <script>setTimeout(() => { window.print(); }, 250);</script>
</body>
</html>`)
    printWin.document.close()
  }

  return (
    <div
      aria-labelledby="barcode-print-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs"
      role="dialog"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900" id="barcode-print-modal-title">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Mã chứng từ: <strong className="font-mono text-slate-700">{batchCode}</strong> - Tổng cộng{' '}
              <strong>{items.length} tem nhiệt</strong> (chuẩn Code-39 50mm x 30mm quét được bằng máy quét mã vạch)
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại in Barcode"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
            {items.map((item, idx) => (
              <div
                className="rounded-xl border border-dashed border-slate-300 bg-white p-3.5 text-center shadow-2xs space-y-1"
                key={`${item.barcode}-${idx}`}
              >
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                  CLOUD BOOKSTORE
                </p>
                <div className="py-1">
                  <BarcodeSvg barcode={item.barcode} />
                </div>
                <p className="font-mono text-xs font-black tracking-wider text-slate-900">
                  {item.barcode}
                </p>
                <p className="truncate text-xs font-bold text-slate-800" title={item.titleName}>
                  {item.titleName}
                </p>
                <p className="text-[11px] font-bold text-indigo-700">
                  Giá bán: {formatVnd(item.sellingPrice)}
                  {item.grade ? ` - Grade ${item.grade}` : ''}
                </p>
                {item.subtitle && (
                  <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={handleDownloadCsv}
            type="button"
            variant="outline"
          >
            Xuất file danh sách (.CSV)
          </Button>

          <div className="flex items-center gap-2">
            <Button onClick={onClose} type="button" variant="ghost">
              Đóng
            </Button>
            <Button
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrintThermalLabels}
              type="button"
              variant="primary"
            >
              Mở bản in tem nhiệt ({items.length} tem)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
