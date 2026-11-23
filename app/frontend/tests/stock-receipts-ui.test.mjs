import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSource = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('stock receipt steps use the shared flat header tab treatment', () => {
  const page = readSource('features', 'catalog', 'pages', 'StockReceiptsPage.tsx')
  const workspace = readSource('features', 'catalog', 'components', 'WarehouseWorkspace.tsx')

  assert.match(page, /pageHeaderContent=\{<StockReceiptStepTabs onSelect=\{setStep\} step=\{step\} \/>\}/)
  assert.match(page, /aria-label="Các bước lập phiếu nhập kho"/)
  assert.match(page, /border-b-2/)
  assert.match(page, /Nhà cung cấp & Danh mục nhập/)
  assert.match(page, /Giá bán & Sinh Barcode/)
  assert.doesNotMatch(page, /<Check className=/)
  assert.match(workspace, /pageHeaderContent\?: ReactNode/)
  assert.match(workspace, /pageHeaderContent=\{pageHeaderContent\}/)
})
