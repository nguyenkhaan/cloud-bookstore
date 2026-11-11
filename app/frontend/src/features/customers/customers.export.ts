import type { Customer } from './customers.type'

export type CustomerExportFormat = 'excel' | 'csv'

const TIER_LABELS: Record<string, string> = {
  REGULAR: 'Thường',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
}

function formatTierLabel(tierName: string): string {
  return TIER_LABELS[tierName.toUpperCase()] ?? 'Thường'
}

function formatExportDate(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatLocalDateStamp(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function sanitizeFormulaCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

function escapeCsvCell(raw: string | number): string {
  const text = typeof raw === 'number' ? String(raw) : sanitizeFormulaCell(raw)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const EXPORT_HEADERS = [
  'STT',
  'Mã khách hàng',
  'Họ và tên',
  'Số điện thoại',
  'Email',
  'CCCD',
  'Địa chỉ',
  'Hạng thành viên',
  'Chi tiêu hợp lệ (VNĐ)',
  'Trạng thái',
  'Lý do theo dõi',
  'Ngày tạo',
] as const

type ExportRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
]

function customerToRow(customer: Customer, index: number): ExportRow {
  return [
    index + 1,
    customer.id,
    customer.fullName,
    customer.phone,
    customer.email ?? '',
    customer.nationalId ?? '',
    customer.address ?? '',
    formatTierLabel(customer.tierName),
    Number.isFinite(customer.eligibleSpend) ? customer.eligibleSpend : 0,
    customer.isFlagged ? 'Cần theo dõi' : 'Bình thường',
    customer.flagReason ?? '',
    formatExportDate(customer.createdAt),
  ]
}

export function buildCustomersCsvContent(customers: Customer[]): string {
  const lines: string[] = [
    EXPORT_HEADERS.map((header) => escapeCsvCell(header)).join(','),
  ]

  customers.forEach((customer, index) => {
    const row = customerToRow(customer, index)
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(','))
  })

  return `\uFEFF${lines.join('\r\n')}`
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
    if (isAllowed) {
      result += raw[i]
    }
  }
  return result
}

function escapeXmlText(raw: string): string {
  const cleaned = stripDisallowedXmlChars(raw)
  return cleaned
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

function buildWorksheetXml(customers: Customer[]): string {
  const colWidths = [6, 38, 26, 15, 28, 16, 32, 16, 22, 16, 28, 14]
  const colsXml = colWidths
    .map((width, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`)
    .join('')

  const headerCellsXml = EXPORT_HEADERS.map((header, colIdx) => {
    const ref = `${columnLetter(colIdx)}1`
    return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXmlText(header)}</t></is></c>`
  }).join('')
  const headerRowXml = `<row r="1" ht="22" customHeight="1">${headerCellsXml}</row>`

  const dataRowsXml = customers
    .map((customer, rowIdx) => {
      const excelRowNumber = rowIdx + 2
      const row = customerToRow(customer, rowIdx)
      const cellsXml = row
        .map((cell, colIdx) => {
          const ref = `${columnLetter(colIdx)}${excelRowNumber}`
          if (typeof cell === 'number') {
            const styleAttr = colIdx === 8 ? ' s="2"' : ''
            return `<c r="${ref}" t="n"${styleAttr}><v>${cell}</v></c>`
          }
          const safeText = sanitizeFormulaCell(cell)
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(safeText)}</t></is></c>`
        })
        .join('')
      return `<row r="${excelRowNumber}">${cellsXml}</row>`
    })
    .join('')

  const lastRow = Math.max(1, customers.length + 1)
  const lastCol = columnLetter(EXPORT_HEADERS.length - 1)

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

const WORKBOOK_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="Khách hàng" sheetId="1" r:id="rId1"/></sheets>' +
  '</workbook>'

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

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true) // version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true) // UTF-8 filename flag
    localView.setUint16(8, 0, true) // compression: Store (0)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, size, true)
    localView.setUint32(22, size, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, entry.data)

    // Central directory file header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true) // version made by
    centralView.setUint16(6, 20, true) // version needed
    centralView.setUint16(8, 0x0800, true) // UTF-8 filename flag
    centralView.setUint16(10, 0, true) // compression: Store
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

export function buildCustomersXlsxBytes(customers: Customer[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const worksheetXml = buildWorksheetXml(customers)

  return buildZipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS_XML) },
    { name: 'xl/workbook.xml', data: encoder.encode(WORKBOOK_XML) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS_XML) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES_XML) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(worksheetXml) },
  ])
}

export function getCustomerExportFilename(format: CustomerExportFormat, now: Date = new Date()): string {
  const stamp = formatLocalDateStamp(now)
  return format === 'excel'
    ? `danh-sach-khach-hang-${stamp}.xlsx`
    : `danh-sach-khach-hang-${stamp}.csv`
}

function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

export function exportCustomersToFile(customers: Customer[], format: CustomerExportFormat): void {
  const filename = getCustomerExportFilename(format)

  if (format === 'csv') {
    const csvContent = buildCustomersCsvContent(customers)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    triggerFileDownload(blob, filename)
    return
  }

  const xlsxBytes = buildCustomersXlsxBytes(customers)
  const blob = new Blob([xlsxBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerFileDownload(blob, filename)
}
