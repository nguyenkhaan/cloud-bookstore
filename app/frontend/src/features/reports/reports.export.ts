import { formatVnDateOnlyFromIso, formatVnDateShort, toNumber } from './reports.presentation'
import type {
  DepositReconciliationReportResponse,
  DepositReconciliationSlipRow,
  RevenueExpenseReportResponse,
  TaxDeclarationReportResponse,
} from './reports.type'

type CellValue = string | number
type ExportSheetSpec = {
  sheetName: string
  headers: string[]
  colWidths: number[]
  currencyColIndices: number[]
  rows: CellValue[][]
}

function sanitizeFormulaCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

function stripDisallowedXmlChars(raw: string): string {
  let result = ''
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i)
    const isAllowed =
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd)
    if (isAllowed) result += raw[i]
  }
  return result
}

function escapeXmlText(raw: string): string {
  return stripDisallowedXmlChars(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnLetter(colIndexZeroBased: number): string {
  let col = colIndexZeroBased + 1
  let result = ''
  while (col > 0) {
    const rem = (col - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    col = Math.floor((col - 1) / 26)
  }
  return result
}

function buildWorksheetXml(spec: ExportSheetSpec): string {
  const colsXml = spec.colWidths
    .map((width, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`)
    .join('')

  const headerCellsXml = spec.headers
    .map((header, colIdx) => {
      const ref = `${columnLetter(colIdx)}1`
      return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXmlText(header)}</t></is></c>`
    })
    .join('')
  const headerRowXml = `<row r="1" ht="22" customHeight="1">${headerCellsXml}</row>`

  const currencyCols = new Set(spec.currencyColIndices)
  const dataRowsXml = spec.rows
    .map((row, rowIdx) => {
      const excelRowNumber = rowIdx + 2
      const cellsXml = row
        .map((cell, colIdx) => {
          const ref = `${columnLetter(colIdx)}${excelRowNumber}`
          if (typeof cell === 'number') {
            const safeNum = Number.isFinite(cell) ? cell : 0
            const styleAttr = currencyCols.has(colIdx) ? ' s="2"' : ''
            return `<c r="${ref}" t="n"${styleAttr}><v>${safeNum}</v></c>`
          }
          const safeText = sanitizeFormulaCell(cell ?? '')
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(safeText)}</t></is></c>`
        })
        .join('')
      return `<row r="${excelRowNumber}">${cellsXml}</row>`
    })
    .join('')

  const lastRow = Math.max(1, spec.rows.length + 1)
  const lastCol = columnLetter(Math.max(0, spec.headers.length - 1))

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:${lastCol}${lastRow}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="18"/>' +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${headerRowXml}${dataRowsXml}</sheetData>` +
    '</worksheet>'
  )
}

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FF1E1B4B"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '</styleSheet>'

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function getDosDateTime(now: Date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, now.getFullYear())
  const month = now.getMonth() + 1
  const day = now.getDate()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = Math.floor(now.getSeconds() / 2)

  const dosTime = (hours << 11) | (minutes << 5) | seconds
  const dosDate = ((year - 1980) << 9) | (month << 5) | day
  return { dosTime, dosDate }
}

function buildZipStore(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const { dosTime, dosDate } = getDosDateTime()

  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, size, true)
    localView.setUint32(22, size, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, entry.data)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, size, true)
    centralView.setUint32(24, size, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    localOffset += localHeader.length + size
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true)
  eocdView.setUint16(6, 0, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, centralDirectorySize, true)
  eocdView.setUint32(16, localOffset, true)
  eocdView.setUint16(20, 0, true)

  const totalLength = localOffset + centralDirectorySize + eocd.length
  const output = new Uint8Array(new ArrayBuffer(totalLength))
  let offset = 0

  for (const part of localParts) {
    output.set(part, offset)
    offset += part.length
  }
  for (const part of centralParts) {
    output.set(part, offset)
    offset += part.length
  }
  output.set(eocd, offset)

  return output
}

function buildXlsxBytesFromSpec(spec: ExportSheetSpec): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const safeSheetName = escapeXmlText(spec.sheetName.slice(0, 31) || 'BaoCao')
  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'

  return buildZipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS_XML) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES_XML) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(buildWorksheetXml(spec)) },
  ])
}

function triggerXlsxDownload(bytes: Uint8Array<ArrayBuffer>, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function buildRevenueExpenseXlsxBytes(
  report: RevenueExpenseReportResponse,
): Uint8Array<ArrayBuffer> {
  const rows: CellValue[][] = report.sources.items.map((row) => [
    `${row.sourceLabel} · ${row.codePattern}`,
    row.quantityLabel,
    row.revenueAmount !== null && row.revenueAmount !== undefined ? toNumber(row.revenueAmount) : '',
    row.expenseAmount !== null && row.expenseAmount !== undefined ? toNumber(row.expenseAmount) : '',
    row.paymentChannelLabel,
    row.statusLabel,
  ])

  rows.push([
    `TỔNG CỘNG (${formatVnDateShort(report.fromDate)} - ${formatVnDateShort(report.toDate)})`,
    'Chênh lệch hoạt động',
    toNumber(report.totalRevenue),
    toNumber(report.totalExpense),
    `Lợi nhuận gộp: ${toNumber(report.netOperatingDifference).toLocaleString('vi-VN')}đ`,
    report.storeScopeLabel,
  ])

  return buildXlsxBytesFromSpec({
    sheetName: 'DoanhThuChiPhi',
    headers: ['Nguồn / Chứng từ', 'Số lượng', 'Doanh thu (VNĐ)', 'Chi phí (VNĐ)', 'Thanh toán', 'Trạng thái'],
    colWidths: [34, 18, 20, 20, 22, 18],
    currencyColIndices: [2, 3],
    rows,
  })
}

export function exportRevenueExpenseExcel(report: RevenueExpenseReportResponse): void {
  const bytes = buildRevenueExpenseXlsxBytes(report)
  triggerXlsxDownload(bytes, `doanh-thu-chi-phi-${report.fromDate}-${report.toDate}.xlsx`)
}

export function buildDepositReconciliationXlsxBytes(
  report: DepositReconciliationReportResponse,
  slips: DepositReconciliationSlipRow[],
  cashActualBalance: number,
  bankActualBalance: number,
): Uint8Array<ArrayBuffer> {
  const cashObligation = toNumber(report.cashObligationAmount)
  const bankObligation = toNumber(report.bankObligationAmount)
  const closing = toNumber(report.closingDepositBalance)
  const totalActual = cashActualBalance + bankActualBalance

  const rows: CellValue[][] = [
    ['--- ĐỐI CHIẾU NGUỒN GIỮ TIỀN ---', '', '', '', '', ''],
    ['Tiền mặt giữ hộ', cashObligation, cashActualBalance, cashActualBalance - cashObligation, '', ''],
    ['Tài khoản ngân hàng', bankObligation, bankActualBalance, bankActualBalance - bankObligation, '', ''],
    ['Tổng cuối kỳ', closing, totalActual, totalActual - closing, '', ''],
    ['', '', '', '', '', ''],
    ['--- CHI TIẾT PHIẾU THUÊ & NGHĨA VỤ CỌC ---', 'Cọc đã thu', 'Khoản trừ đã chốt', 'Cọc đã hoàn', 'Đang giữ', 'Trạng thái / Hạn trả'],
    ...slips.map((slip) => [
      `${slip.slipNo} · ${slip.customerName} (${slip.customerPhone})`,
      toNumber(slip.depositCollected),
      toNumber(slip.settledDeduction),
      toNumber(slip.refundedAmount),
      toNumber(slip.currentlyHeld),
      `${slip.statusLabel}${slip.dueAt ? ` · Hạn ${formatVnDateOnlyFromIso(slip.dueAt)}` : ''}`,
    ]),
  ]

  return buildXlsxBytesFromSpec({
    sheetName: 'DoiSoatTienCoc',
    headers: [
      'Phiếu / Nguồn tiền',
      'Số nghĩa vụ / Cọc thu (VNĐ)',
      'Thực tế / Khoản trừ (VNĐ)',
      'Chênh lệch / Đã hoàn (VNĐ)',
      'Đang giữ (VNĐ)',
      'Ghi chú',
    ],
    colWidths: [38, 24, 24, 24, 18, 28],
    currencyColIndices: [1, 2, 3, 4],
    rows,
  })
}

export function exportDepositReconciliationExcel(
  report: DepositReconciliationReportResponse,
  cashActualBalance: number,
  bankActualBalance: number,
): void {
  const bytes = buildDepositReconciliationXlsxBytes(
    report,
    report.slips.items,
    cashActualBalance,
    bankActualBalance,
  )
  triggerXlsxDownload(bytes, `doi-soat-tien-coc-${report.fromDate}-${report.toDate}.xlsx`)
}

export function buildTaxDeclarationXlsxBytes(
  report: TaxDeclarationReportResponse,
): Uint8Array<ArrayBuffer> {
  const rows: CellValue[][] = [
    ['A. DOANH THU CHỊU THUẾ', 'Điều kiện ghi nhận', 'Nguồn truy nguyên', 'Số tiền (VNĐ)'],
    ...report.revenueItems.map((item) => [
      item.title,
      item.recognitionRule,
      item.sourceTrace,
      toNumber(item.amount),
    ]),
    ['Tổng doanh thu chịu thuế', '', report.periodLabel, toNumber(report.totalTaxableRevenue)],
    ['', '', '', ''],
    ['B. CHI PHÍ ĐẦU VÀO HỢP LỆ', 'Chứng từ bắt buộc', 'Nguồn truy nguyên', 'Số tiền (VNĐ)'],
    ...report.expenseItems.map((item) => [
      item.title,
      item.requiredDocuments,
      item.sourceTrace,
      toNumber(item.amount),
    ]),
    ['Tổng chi phí đầu vào hợp lệ', '', report.hasFullSourceReconciliation ? 'Đã đối chiếu đủ nguồn chứng từ' : 'Cần rà soát chứng từ', toNumber(report.totalEligibleExpense)],
    ['', '', '', ''],
    ['C. KHOẢN LOẠI TRỪ MINH BẠCH (KHÔNG ĐƯA VÀO THUẾ)', 'Cách xử lý', 'Kỳ kê khai', 'Giá trị kỳ này (VNĐ)'],
    ...report.excludedItems.map((item) => [
      item.title,
      item.treatmentNote,
      report.periodLabel,
      toNumber(item.amount),
    ]),
  ]

  return buildXlsxBytesFromSpec({
    sheetName: 'KeKhaiThue',
    headers: ['Mục / Khoản mục', 'Quy tắc / Chứng từ', 'Nguồn / Ghi chú', 'Số tiền (VNĐ)'],
    colWidths: [40, 42, 32, 22],
    currencyColIndices: [3],
    rows,
  })
}

export function exportTaxDeclarationExcel(report: TaxDeclarationReportResponse): void {
  const bytes = buildTaxDeclarationXlsxBytes(report)
  triggerXlsxDownload(bytes, `ke-khai-thue-${report.fromDate}-${report.toDate}.xlsx`)
}
