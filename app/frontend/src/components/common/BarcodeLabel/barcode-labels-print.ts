export type PrintableBarcodeLabelItem = {
  barcode: string
  titleName: string
  sellingPrice: number
  grade?: string | null
  subtitle?: string | null
}

export function escapePrintHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

export function escapeBarcodeLabelCsvCell(value: string | number): string {
  const text = String(value)
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText
}

export function buildBarcodeLabelsCsvContent(items: PrintableBarcodeLabelItem[]): string {
  const header = 'CopyBarcode,TenSach,Grade,GiaBanVND'
  const rows = items.map((item) => [
    item.barcode,
    item.titleName,
    item.grade ?? 'A',
    item.sellingPrice,
  ].map(escapeBarcodeLabelCsvCell).join(','))
  return [header, ...rows].join('\n')
}
