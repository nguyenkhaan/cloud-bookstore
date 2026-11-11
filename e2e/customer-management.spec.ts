import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5179'
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4011'
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'

const SEEDED_SILVER_ID = '00000000-0000-0000-0000-000000000202'
const SEEDED_GOLD_ID = '00000000-0000-0000-0000-000000000204'
const MISSING_CUSTOMER_ID = '00000000-0000-0000-0000-999999999999'

interface E2ECredentials {
  email: string
  password: string
}

let cachedCredentials: E2ECredentials | null = null

async function ensureTestCredentials(request: APIRequestContext): Promise<E2ECredentials> {
  if (cachedCredentials) return cachedCredentials

  const envEmail = process.env.E2E_EMAIL?.trim()
  const envPassword = process.env.E2E_PASSWORD
  if (envEmail && envPassword) {
    cachedCredentials = { email: envEmail, password: envPassword }
    return cachedCredentials
  }

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const email = `qa.e2e.${suffix}@cloud.io`
  const password = 'QaVerify!Pass12345'
  const phone = `09${String(Math.floor(10000000 + Math.random() * 89999999))}`

  const registerRes = await request.post(`${API_URL}/api/auth/register`, {
    headers: { Origin: BASE_URL },
    data: {
      email,
      fullName: 'QA E2E Cashier',
      password,
      phone,
    },
  })
  expect(registerRes.status()).toBe(201)

  const listRes = await request.get(`${MAILPIT_URL}/api/v1/messages`)
  expect(listRes.ok()).toBeTruthy()
  const listJson = (await listRes.json()) as {
    messages?: Array<{ ID: string; To?: Array<{ Address?: string }> }>
  }

  const matchedMessage = listJson.messages?.find((msg) =>
    msg.To?.some((recipient) => recipient.Address?.toLowerCase() === email.toLowerCase()),
  )
  expect(matchedMessage, `Expected verification email in Mailpit for ${email}`).toBeTruthy()

  const detailRes = await request.get(`${MAILPIT_URL}/api/v1/message/${matchedMessage!.ID}`)
  expect(detailRes.ok()).toBeTruthy()
  const detailJson = (await detailRes.json()) as { HTML?: string; Text?: string }
  const body = `${detailJson.HTML ?? ''}\n${detailJson.Text ?? ''}`
  const tokenMatch = body.match(/[?&]token=([^&"'\s<>]+)/)
  expect(tokenMatch, 'Expected verification token inside Mailpit email body').toBeTruthy()
  const token = decodeURIComponent(tokenMatch![1])

  const verifyRes = await request.post(`${API_URL}/api/auth/verify`, {
    headers: { Origin: BASE_URL },
    data: { token },
  })
  expect(verifyRes.status()).toBe(204)

  // Clean up only the ephemeral verification email created by this test.
  await request.delete(`${MAILPIT_URL}/api/v1/messages`, {
    data: { IDs: [matchedMessage!.ID] },
  })

  cachedCredentials = { email, password }
  return cachedCredentials
}

function attachRuntimeMonitors(
  page: Page,
  options?: {
    allow404ForMissingCustomer?: boolean
    allow422ForAddCustomerError?: boolean
    allow409ForCustomerConflict?: boolean
  },
) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const serverErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      const locUrl = msg.location()?.url ?? ''
      // AuthProvider checks GET /api/auth/session on unauthenticated mount (401 before login).
      if (text.includes('status of 401') && locUrl.includes('/api/auth/session')) {
        return
      }
      if (
        options?.allow404ForMissingCustomer &&
        text.includes('status of 404') &&
        locUrl.includes(`/api/customers/${MISSING_CUSTOMER_ID}`)
      ) {
        return
      }
      if (
        options?.allow422ForAddCustomerError &&
        text.includes('status of 422') &&
        locUrl.includes('/api/customers')
      ) {
        return
      }
      if (
        options?.allow409ForCustomerConflict &&
        text.includes('status of 409') &&
        locUrl.includes('/api/customers')
      ) {
        return
      }
      consoleErrors.push(`${text} (${locUrl || 'unknown'})`)
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  page.on('response', (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`)
    }
  })

  return {
    assertClean() {
      expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([])
      expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([])
      expect(serverErrors, `HTTP >= 500 errors: ${serverErrors.join(' | ')}`).toEqual([])
    },
  }
}

async function loginViaUi(page: Page, creds: E2ECredentials): Promise<void> {
  await page.goto(`${BASE_URL}/login`)
  await expect(page.getByRole('heading', { name: 'ĐĂNG NHẬP' })).toBeVisible()
  await page.locator('input[name="email"]').fill(creds.email)
  await page.locator('input[name="password"]').fill(creds.password)
  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  const loginRes = await loginResponsePromise
  expect(loginRes.status()).toBe(200)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

function crc32(buffer: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function extractZipStoreFiles(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocdOffset = -1
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset
      break
    }
  }
  expect(eocdOffset).toBeGreaterThan(-1)

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralOffset = view.getUint32(eocdOffset + 16, true)
  const files = new Map<string, Uint8Array>()

  let cursor = centralOffset
  for (let i = 0; i < totalEntries; i += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50)
    const compression = view.getUint16(cursor + 10, true)
    const expectedCrc = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const nameLen = view.getUint16(cursor + 28, true)
    const extraLen = view.getUint16(cursor + 30, true)
    const commentLen = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const filename = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen))

    expect(compression).toBe(0)
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const payload = bytes.subarray(dataStart, dataStart + compressedSize)
    expect(crc32(payload)).toBe(expectedCrc)
    files.set(filename, payload)

    cursor += 46 + nameLen + extraLen + commentLen
  }
  return files
}

test.describe('Customer Management Refinement & 360 Profile (E2E)', () => {
  test('redirects unauthenticated requests from /customers and /customers/:id to /login', async ({ page }) => {
    const monitor = attachRuntimeMonitors(page)

    await page.goto(`${BASE_URL}/customers`)
    await page.waitForURL((url) => url.pathname === '/login')
    expect(new URL(page.url()).searchParams.get('next')).toBe('/customers')
    await expect(page.getByRole('heading', { name: 'ĐĂNG NHẬP' })).toBeVisible()
    await expect(page.getByText('Danh bạ khách hàng')).toHaveCount(0)

    await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
    await page.waitForURL((url) => url.pathname === '/login')
    expect(new URL(page.url()).searchParams.get('next')).toBe(`/customers/${SEEDED_SILVER_ID}`)

    monitor.assertClean()
  })

  test('AC2 & AC4: enforces primary button WCAG contrast, removes mock artifacts, and keeps layout legible', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByRole('heading', { name: 'Danh sách Khách hàng & Hạng thành viên' })).toBeVisible()
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    // AC 4: Removed debug codes, tagline, mock +24 count, and bottom calculation disclaimer
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('SCR-CRM-01')
    expect(bodyText).not.toContain('Hiểu khách hàng hơn qua từng lượt đọc')
    expect(bodyText).not.toContain('+24 khách trong tháng')
    expect(bodyText).not.toContain('Chi tiêu hợp lệ = tiền mua sách')

    // AC 2: Primary button unhovered computed colors & WCAG contrast (> 4.5:1)
    const addButton = page.getByRole('button', { name: '+ Thêm mới khách hàng' })
    await expect(addButton).toBeVisible()
    const contrastReport = await addButton.evaluate((el) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      function parseCssColor(css: string): [number, number, number, number] {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'
        ctx.fillStyle = css
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return [d[0], d[1], d[2], d[3] / 255]
      }
      function effectiveBg(node: Element | null): [number, number, number] {
        const layers: Array<[number, number, number, number]> = []
        let cur: Element | null = node
        while (cur) {
          const parsed = parseCssColor(getComputedStyle(cur).backgroundColor)
          if (parsed[3] > 0) layers.unshift(parsed)
          cur = cur.parentElement
        }
        let r = 255
        let g = 255
        let b = 255
        for (const [lr, lg, lb, la] of layers) {
          r = lr * la + r * (1 - la)
          g = lg * la + g * (1 - la)
          b = lb * la + b * (1 - la)
        }
        return [Math.round(r), Math.round(g), Math.round(b)]
      }
      function luminance(rgb: [number, number, number]): number {
        const [r, g, b] = rgb.map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const style = getComputedStyle(el)
      const fg = parseCssColor(style.color)
      const bg = effectiveBg(el)
      const l1 = Math.max(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
      const l2 = Math.min(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
      const rect = el.getBoundingClientRect()
      return {
        color: style.color,
        fgRgb: [fg[0], fg[1], fg[2]],
        backgroundColor: style.backgroundColor,
        effectiveBg: bg,
        contrast: +((l1 + 0.05) / (l2 + 0.05)).toFixed(2),
        width: rect.width,
        height: rect.height,
      }
    })

    expect(contrastReport.fgRgb).toEqual([255, 255, 255])
    expect(contrastReport.effectiveBg).not.toEqual([255, 255, 255])
    expect(contrastReport.contrast).toBeGreaterThanOrEqual(4.5)
    expect(contrastReport.height).toBeGreaterThanOrEqual(40)

    monitor.assertClean()
  })

  test('AC3: streamlined SelectBox filters omit top label, search box, and helper footer while supporting keyboard navigation', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    const tierTrigger = page.getByRole('button', { name: 'Hạng thành viên' })
    const statusTrigger = page.getByRole('button', { name: 'Trạng thái' })
    await expect(tierTrigger).toContainText('Hạng: Tất cả')
    await expect(statusTrigger).toContainText('Trạng thái: Tất cả')

    // No visible top label above the two streamlined SelectBoxes (neither <label> nor <span>)
    await expect(page.locator('label, span', { hasText: /^Hạng thành viên$/ })).toHaveCount(0)
    await expect(page.locator('label, span', { hasText: /^Trạng thái$/ })).toHaveCount(0)

    // Open Tier SelectBox and test keyboard navigation + absence of search/footer
    await tierTrigger.focus()
    await page.keyboard.press('Enter')
    const listbox = page.getByRole('listbox', { name: 'Hạng thành viên' })
    await expect(listbox).toBeVisible()
    await expect(listbox.locator('input')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('kết quả · ↑↓ chọn')

    // Navigate to "Hạng: Bạc" (index 2: Tất cả -> Thường -> Bạc)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(listbox).toHaveCount(0)
    await expect(tierTrigger).toContainText('Hạng: Bạc')
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()
    await expect(page.getByText('Phạm Gia Hân')).toHaveCount(0)

    // Open Status SelectBox and verify Escape closes cleanly without search or footer
    await statusTrigger.click()
    const statusListbox = page.getByRole('listbox', { name: 'Trạng thái' })
    await expect(statusListbox).toBeVisible()
    await expect(statusListbox.locator('input')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(statusListbox).toHaveCount(0)

    // Select "Trạng thái: Cần theo dõi" -> empty state + reset button restores customers
    await statusTrigger.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await expect(statusTrigger).toContainText('Trạng thái: Cần theo dõi')
    await expect(page.getByText('Chưa tìm thấy khách hàng')).toBeVisible()

    await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await expect(page.getByText('Phạm Gia Hân')).toBeVisible()
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    monitor.assertClean()
  })

  test('AC1: ExportCustomerDialog validates empty states and downloads valid UTF-8 BOM CSV and OpenXML XLSX files', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    // Filter to Gold so exported count matches filtered subset (1 record)
    await page.getByRole('button', { name: 'Hạng thành viên' }).click()
    await page.getByRole('option', { name: 'Hạng: Vàng' }).click()
    await expect(page.getByText('Phạm Gia Hân')).toBeVisible()
    await expect(page.getByText('Trần Minh Anh')).toHaveCount(0)

    // Open Export Dialog and verify format options
    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const exportDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
    await expect(exportDialog).toBeVisible()
    await expect(exportDialog).toContainText('1 khách hàng theo bộ lọc hiện tại')
    await expect(exportDialog.getByRole('button', { name: /Xuất Excel/ })).toBeVisible()
    await expect(exportDialog.getByRole('button', { name: /Xuất CSV/ })).toBeVisible()

    // Download CSV and verify UTF-8 BOM + CRLF + filtered row
    const csvDownloadPromise = page.waitForEvent('download')
    await exportDialog.getByRole('button', { name: /Xuất CSV/ }).click()
    const csvDownload = await csvDownloadPromise
    expect(csvDownload.suggestedFilename()).toMatch(/^danh-sach-khach-hang-\d{8}\.csv$/)
    const csvPath = await csvDownload.path()
    expect(csvPath).toBeTruthy()
    const csvBytes = readFileSync(csvPath!)
    expect(Array.from(csvBytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const csvText = csvBytes.toString('utf8')
    expect(csvText).toContain('\r\n')
    expect(csvText).toContain('Họ và tên')
    expect(csvText).toContain('Phạm Gia Hân')
    expect(csvText).not.toContain('Trần Minh Anh')
    await expect(page.getByText('Đã xuất 1 khách hàng ra tệp CSV (.csv)')).toBeVisible()

    // Reset filter and download XLSX -> verify real ZIP & OpenXML sheet contents
    await page.getByRole('button', { name: 'Hạng thành viên' }).click()
    await page.getByRole('option', { name: 'Hạng: Tất cả' }).click()
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const xlsxDownloadPromise = page.waitForEvent('download')
    await page.getByRole('dialog').getByRole('button', { name: /Xuất Excel/ }).click()
    const xlsxDownload = await xlsxDownloadPromise
    expect(xlsxDownload.suggestedFilename()).toMatch(/^danh-sach-khach-hang-\d{8}\.xlsx$/)
    const xlsxPath = await xlsxDownload.path()
    expect(xlsxPath).toBeTruthy()
    const xlsxBytes = new Uint8Array(readFileSync(xlsxPath!))
    const zipFiles = extractZipStoreFiles(xlsxBytes)
    expect(zipFiles.has('[Content_Types].xml')).toBe(true)
    expect(zipFiles.has('xl/workbook.xml')).toBe(true)
    expect(zipFiles.has('xl/worksheets/sheet1.xml')).toBe(true)
    const sheetXml = new TextDecoder().decode(zipFiles.get('xl/worksheets/sheet1.xml'))
    expect(sheetXml).toContain('Trần Minh Anh')
    expect(sheetXml).toContain('Phạm Gia Hân')
    expect(sheetXml).toContain('<v>3500000</v>')

    // Verify zero-record filter guard inside ExportCustomerDialog + Escape close
    await page.locator('input[placeholder*="Tìm SĐT"]').fill('ZZZ-NONEXISTENT-99999')
    await expect(page.getByText('Chưa tìm thấy khách hàng')).toBeVisible()
    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const emptyDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
    await expect(emptyDialog).toContainText('0 khách hàng theo bộ lọc hiện tại')
    await expect(emptyDialog.getByRole('button', { name: /Xuất Excel/ })).toBeDisabled()
    await expect(emptyDialog.getByRole('button', { name: /Xuất CSV/ })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(emptyDialog).toHaveCount(0)

    monitor.assertClean()
  })

  test('AC5: navigates to /customers/:id, toggles CCCD, tests keyboard tabs, edits customer, toggles rental lock, and verifies 404 fallback', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page, { allow404ForMissingCustomer: true })

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    // Navigate via "Xem chi tiết" link on Trần Minh Anh's row
    const silverRow = page.locator('tbody tr', { hasText: 'Trần Minh Anh' })
    await silverRow.getByRole('link', { name: /Xem chi tiết|Hồ sơ 360°/ }).click()
    await page.waitForURL((url) => url.pathname === `/customers/${SEEDED_SILVER_ID}`)

    // Verify Customer 360° profile elements, breadcrumbs, PDR-003 progress & privileges
    await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Danh sách khách hàng' })).toHaveAttribute('href', '/customers')
    await expect(page.getByText('Hạng Bạc', { exact: true })).toBeVisible()
    await expect(page.getByText('0900 000 005')).toBeVisible()
    await expect(page.getByText('tran.minh.anh@example.com')).toBeVisible()

    const progressbar = page.getByRole('progressbar', { name: 'Tiến độ nâng hạng thành viên' })
    await expect(progressbar).toHaveAttribute('aria-valuenow', '50')
    await expect(page.getByText(/Còn\s*1\.500\.000\s*đ\s*lên Hạng\s*Vàng/)).toBeVisible()
    await expect(page.getByText(/Thuê tối đa\s*5 cuốn/)).toBeVisible()
    await expect(page.getByText('Hạn mức 5 cuốn · 21 ngày')).toBeVisible()
    await expect(page.getByText('Giảm 5% phí thuê & 5% giá mua sách')).toBeVisible()
    await expect(page.getByText('Không áp dụng điểm tích lũy')).toBeVisible()
    await expect(page.getByText(/Hồ sơ đủ điều kiện thuê mới/)).toBeVisible()

    // CCCD reveal / hide toggle
    await expect(page.getByText('•••• •••• 7891')).toBeVisible()
    const revealBtn = page.getByRole('button', { name: 'Hiện số CCCD' })
    await expect(revealBtn).toHaveAttribute('aria-pressed', 'false')
    await revealBtn.click()
    await expect(page.getByText('001234567891')).toBeVisible()
    const hideBtn = page.getByRole('button', { name: 'Ẩn số CCCD' })
    await expect(hideBtn).toHaveAttribute('aria-pressed', 'true')
    await hideBtn.click()
    await expect(page.getByText('•••• •••• 7891')).toBeVisible()

    // Transaction history tabs & WAI-ARIA keyboard roving tabindex
    const rentalsTab = page.getByRole('tab', { name: /Thuê & Trả/ })
    const salesTab = page.getByRole('tab', { name: /Mua sách/ })
    const buybacksTab = page.getByRole('tab', { name: /Bán sách cũ/ })
    const violationsTab = page.getByRole('tab', { name: /Vi phạm & Ghi chú/ })
    await expect(rentalsTab).toHaveAttribute('aria-selected', 'true')

    await rentalsTab.focus()
    await page.keyboard.press('ArrowRight')
    await expect(salesTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('Chưa có hóa đơn mua sách')

    await page.keyboard.press('End')
    await expect(violationsTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('Chưa có vi phạm hoặc ghi chú đặc biệt')

    await page.keyboard.press('ArrowLeft')
    await expect(buybacksTab).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('Home')
    await expect(rentalsTab).toHaveAttribute('aria-selected', 'true')

    // EditCustomerDialog: validation + duplicate phone exclusion + real PUT persistence + cleanup restore
    await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
    await expect(editDialog).toBeVisible()

    const nameInput = editDialog.getByLabel('Họ và tên *')
    await nameInput.fill('   ')
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await expect(editDialog.getByText('Họ và tên không được để trống')).toBeVisible()

    await nameInput.fill('Trần Minh Anh')
    const phoneInput = editDialog.getByLabel('Số điện thoại *')
    const originalPhone = await phoneInput.inputValue()
    // Entering another customer's phone triggers duplicate warning; restoring own phone clears it
    await phoneInput.fill('0900000006')
    await expect(editDialog.getByText('Phát hiện số điện thoại đã tồn tại!')).toBeVisible()
    await expect(editDialog.getByText(/Lê Quốc Bảo/)).toBeVisible()
    await phoneInput.fill(originalPhone)
    await expect(editDialog.getByText('Phát hiện số điện thoại đã tồn tại!')).toHaveCount(0)

    const addressInput = editDialog.getByLabel('Địa chỉ (tùy chọn)')
    const originalAddress = await addressInput.inputValue()
    const updatedAddress = '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh'
    await addressInput.fill(updatedAddress)

    const putEditPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    const putEditRes = await putEditPromise
    expect(putEditRes.status()).toBe(200)
    await expect(editDialog).toHaveCount(0)
    await expect(page.getByText(updatedAddress)).toBeVisible()

    // Reload to confirm persistence in PostgreSQL
    await page.reload()
    await expect(page.getByText(updatedAddress)).toBeVisible()

    // Toggle rental lock on & off and verify persistence across reload
    const blockPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Chặn quyền thuê sách' }).click()
    expect((await blockPromise).status()).toBe(200)
    await expect(page.getByText('Đang chặn thuê', { exact: true })).toBeVisible()
    await expect(page.getByText('Đang áp dụng chặn thuê sách')).toBeVisible()
    await expect(page.getByText(/tạm chặn quyền thuê sách mới/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mở quyền thuê sách' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Vi phạm & Ghi chú/ })).toContainText('1')

    await page.reload()
    await expect(page.getByText('Đang chặn thuê', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: /Vi phạm & Ghi chú/ }).click()
    await expect(page.getByRole('tabpanel')).toContainText('Hạn chế quyền thuê sách mới')

    const unblockPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Mở quyền thuê sách' }).click()
    expect((await unblockPromise).status()).toBe(200)
    await expect(page.getByText(/Hồ sơ đủ điều kiện thuê mới/)).toBeVisible()
    await expect(page.getByRole('tab', { name: /Vi phạm & Ghi chú/ })).toContainText('0')

    // Restore original address to leave seeded customer clean
    await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click()
    const restoreDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
    await restoreDialog.getByLabel('Địa chỉ (tùy chọn)').fill(originalAddress)
    const restorePromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await restoreDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    expect((await restorePromise).status()).toBe(200)
    await expect(restoreDialog).toHaveCount(0)

    // Gold tier customer verification
    await page.goto(`${BASE_URL}/customers/${SEEDED_GOLD_ID}`)
    await expect(page.getByRole('heading', { name: 'Phạm Gia Hân', level: 1 })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Tiến độ nâng hạng thành viên' })).toHaveAttribute('aria-valuenow', '100')
    await expect(page.getByText(/Đã đạt hạng thành viên cao nhất/)).toBeVisible()
    await expect(page.getByText('Giảm 10% phí thuê & 10% giá mua sách')).toBeVisible()

    // Non-existent customer UUID -> error state alert with working back link
    // Note: default TanStack Query retry=3 delays 404 transition by ~7s exponential backoff
    await page.goto(`${BASE_URL}/customers/${MISSING_CUSTOMER_ID}`)
    const alertBox = page.getByRole('alert')
    await expect(alertBox).toBeVisible({ timeout: 15_000 })
    await alertBox.getByRole('link', { name: 'Danh sách khách hàng' }).click()
    await page.waitForURL((url) => url.pathname === '/customers')

    monitor.assertClean()
  })

  test('responsive layouts at 1440x900, 768x1024, and 390x844 have zero horizontal overflow and fold sidebar on mobile', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)

    const viewports = [
      { width: 1440, height: 900, sidebarExpectedInView: true },
      { width: 768, height: 1024, sidebarExpectedInView: false },
      { width: 390, height: 844, sidebarExpectedInView: false },
    ]

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      for (const routePath of ['/customers', `/customers/${SEEDED_SILVER_ID}`]) {
        await page.goto(`${BASE_URL}${routePath}`)
        await page.waitForLoadState('networkidle')

        const layoutStats = await page.evaluate(() => {
          const doc = document.documentElement
          const aside = document.querySelector('aside')
          const asideRect = aside?.getBoundingClientRect()
          return {
            scrollWidth: doc.scrollWidth,
            innerWidth: window.innerWidth,
            asideRight: asideRect ? asideRect.right : -1,
          }
        })

        expect(
          layoutStats.scrollWidth,
          `Horizontal overflow on ${routePath} at ${vp.width}x${vp.height}`,
        ).toBeLessThanOrEqual(layoutStats.innerWidth)

        if (vp.sidebarExpectedInView) {
          expect(layoutStats.asideRight).toBeGreaterThan(0)
        } else {
          expect(layoutStats.asideRight).toBeLessThanOrEqual(0)
        }
      }
    }

    monitor.assertClean()
  })

  test('regression: EditCustomerDialog displays custom inline validation without native HTML5 popup blocking empty name or invalid email', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
    await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
    await expect(editDialog).toBeVisible()

    const nameInput = editDialog.getByLabel('Họ và tên *')
    await nameInput.fill('')
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await expect(editDialog.getByText('Họ và tên không được để trống')).toBeVisible()
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true')

    await nameInput.fill('Trần Minh Anh')
    const emailInput = editDialog.getByLabel('Email (tùy chọn)')
    await emailInput.fill('not-an-email')
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await expect(editDialog.getByText('Email không đúng định dạng')).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    await editDialog.getByRole('button', { name: 'Hủy bỏ' }).click()
    await expect(editDialog).toHaveCount(0)

    monitor.assertClean()
  })

  test('regression: SelectBox padded container activates trigger, mobile touch targets meet >= 44px, and mobile empty-state text is not clipped', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    const tierTrigger = page.getByRole('button', { name: 'Hạng thành viên' })
    const wrapperBox = await tierTrigger.locator('..').boundingBox()
    expect(wrapperBox).toBeTruthy()
    await page.mouse.click(wrapperBox!.x + 20, wrapperBox!.y + 4)
    await expect(page.getByRole('listbox', { name: 'Hạng thành viên' })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    const mobileTierBtn = await page.getByRole('button', { name: 'Hạng thành viên' }).boundingBox()
    expect(mobileTierBtn?.height ?? 0).toBeGreaterThanOrEqual(44)
    const mobileDetailLink = await page.getByRole('link', { name: /Xem chi tiết|Hồ sơ 360°/ }).first().boundingBox()
    expect(mobileDetailLink?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(mobileDetailLink?.height ?? 0).toBeGreaterThanOrEqual(44)

    await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
    await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()

    const cccdToggleBox = await page.getByRole('button', { name: 'Hiện số CCCD' }).boundingBox()
    expect(cccdToggleBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(cccdToggleBox?.height ?? 0).toBeGreaterThanOrEqual(44)

    const emptyStateContainerOverflow = await page.locator('[role="tabpanel"] .overflow-x-auto').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(emptyStateContainerOverflow.scrollWidth).toBeLessThanOrEqual(emptyStateContainerOverflow.clientWidth)

    monitor.assertClean()
  })

  test('regression: /customers tier privileges match PDR-003 (5% / 10%) and normal text meets >= 4.5:1 WCAG contrast', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Trần Minh Anh')).toBeVisible()

    const listBody = await page.locator('main').innerText()
    expect(listBody).not.toContain('Giảm 10% thuê · 5% mua')
    expect(listBody).not.toContain('Giảm 20% thuê · 10% mua')

    await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
    await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()

    const minContrast = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      function parseCssColor(css: string): [number, number, number, number] {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'
        ctx.fillStyle = css
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return [d[0], d[1], d[2], d[3] / 255]
      }
      function effectiveBg(node: Element | null): [number, number, number] {
        const layers: Array<[number, number, number, number]> = []
        let cur: Element | null = node
        while (cur) {
          const parsed = parseCssColor(getComputedStyle(cur).backgroundColor)
          if (parsed[3] > 0) layers.unshift(parsed)
          cur = cur.parentElement
        }
        let r = 255
        let g = 255
        let b = 255
        for (const [lr, lg, lb, la] of layers) {
          r = lr * la + r * (1 - la)
          g = lg * la + g * (1 - la)
          b = lb * la + b * (1 - la)
        }
        return [Math.round(r), Math.round(g), Math.round(b)]
      }
      function luminance(rgb: [number, number, number]): number {
        const [r, g, b] = rgb.map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      function contrastOf(el: Element): number {
        const fg = parseCssColor(getComputedStyle(el).color)
        const bg = effectiveBg(el)
        const l1 = Math.max(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
        const l2 = Math.min(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
        return Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2))
      }

      const targets = Array.from(document.querySelectorAll('main p, main span, main th')).filter((el) => {
        const t = el.textContent?.trim() ?? ''
        return (
          t === 'Chi tiêu hợp lệ tích lũy' ||
          t === 'Không áp dụng điểm tích lũy' ||
          t === 'Mã phiếu'
        )
      })
      return targets.map((el) => ({ text: el.textContent?.trim(), contrast: contrastOf(el) }))
    })

    expect(minContrast.length).toBeGreaterThanOrEqual(3)
    for (const item of minContrast) {
      expect(item.contrast, `Contrast too low for "${item.text}"`).toBeGreaterThanOrEqual(4.5)
    }

    monitor.assertClean()
  })

  test('regression: multi-page tier filter finds Gold customer across pages and ExportCustomerDialog displays matching count', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.getByText('Phạm Gia Hân')).toBeVisible()

    const csrfToken = await page.evaluate(() => sessionStorage.getItem('cloud-bookstore.csrf-token'))
    expect(csrfToken).toBeTruthy()

    const uniquePrefix = String(Date.now()).slice(-6)
    for (let i = 1; i <= 10; i += 1) {
      await page.evaluate(
        async ({ apiUrl, csrf, prefix, idx }) => {
          const res = await fetch(`${apiUrl}/api/customers`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrf,
            },
            body: JSON.stringify({
              fullName: `Khách E2E ${prefix}-${idx}`,
              phone: `09${prefix}${String(idx).padStart(2, '0')}`,
            }),
          })
          if (!res.ok) {
            throw new Error(`Create customer ${idx} failed with ${res.status}`)
          }
        },
        { apiUrl: API_URL, csrf: csrfToken!, prefix: uniquePrefix, idx: i },
      )
    }

    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await page.getByRole('button', { name: 'Hạng thành viên' }).click()
    await page.getByRole('option', { name: 'Hạng: Vàng' }).click()

    await expect(page.getByText('Phạm Gia Hân')).toBeVisible()
    await expect(page.getByText('Chưa tìm thấy khách hàng')).toHaveCount(0)

    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const exportDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
    await expect(exportDialog).toBeVisible()
    await expect(exportDialog).toContainText('1 khách hàng theo bộ lọc hiện tại')

    monitor.assertClean()
  })

  test('covers CSRF enforcement, AddCustomerDialog validation/creation, combined filters, Page 2 export, and mobile drawer interaction', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    const csrfToken = await page.evaluate(() => sessionStorage.getItem('cloud-bookstore.csrf-token'))
    expect(csrfToken).toBeTruthy()

    // CSRF enforcement on authenticated write endpoints (using browser session cookies via page.request)
    const postNoCsrfRes = await page.request.post(`${API_URL}/api/customers`, {
      headers: { Origin: BASE_URL },
      data: { fullName: 'CSRF Probe', phone: '0901234999' },
    })
    expect(postNoCsrfRes.status()).toBe(403)
    expect((await postNoCsrfRes.json()).code).toBe('CSRF_TOKEN_INVALID')

    const putNoCsrfRes = await page.request.put(`${API_URL}/api/customers/${SEEDED_SILVER_ID}`, {
      headers: { Origin: BASE_URL },
      data: { fullName: 'CSRF Probe', phone: '0900000005' },
    })
    expect(putNoCsrfRes.status()).toBe(403)
    expect((await putNoCsrfRes.json()).code).toBe('CSRF_TOKEN_INVALID')

    const postBadPhoneRes = await page.request.post(`${API_URL}/api/customers`, {
      headers: { Origin: BASE_URL, 'X-CSRF-Token': csrfToken! },
      data: { fullName: 'Valid Token Bad Phone', phone: '0123456789' },
    })
    expect(postBadPhoneRes.status()).toBe(400)

    // AddCustomerDialog: simultaneous noValidate inline errors + duplicate warning + creation
    await page.getByRole('button', { name: '+ Thêm mới khách hàng' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Tạo nhanh khách hàng' })
    await expect(addDialog).toBeVisible()

    const nameInput = addDialog.getByLabel('Họ và tên *')
    const phoneInput = addDialog.getByLabel('Số điện thoại *')
    const emailInput = addDialog.getByLabel('Email (tùy chọn)')

    await nameInput.fill('   ')
    await phoneInput.fill('0123456789')
    await emailInput.fill('invalid-email')
    await addDialog.locator('button[type="submit"]').click()

    await expect(addDialog.getByText('Họ và tên không được để trống')).toBeVisible()
    await expect(addDialog.getByText(/Số điện thoại không hợp lệ/)).toBeVisible()
    await expect(addDialog.getByText('Email không đúng định dạng')).toBeVisible()
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    await expect(phoneInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    // Duplicate phone alert banner triggers for existing seeded Silver customer phone
    await phoneInput.fill('0900000005')
    await expect(addDialog.getByText('Phát hiện số điện thoại đã tồn tại!')).toBeVisible()
    await expect(addDialog.getByText(/Trần Minh Anh/)).toBeVisible()

    const uniqueSuffix = String(Date.now()).slice(-6)
    const createdName = `Khách QA ${uniqueSuffix}`
    const createdPhone = `093${uniqueSuffix}1`
    await nameInput.fill(createdName)
    await phoneInput.fill(createdPhone)
    await emailInput.fill(`qa.${uniqueSuffix}@example.com`)
    await expect(addDialog.getByText('Phát hiện số điện thoại đã tồn tại!')).toHaveCount(0)

    const createPromise = page.waitForResponse(
      (res) => res.url().endsWith('/api/customers') && res.request().method() === 'POST',
    )
    await addDialog.locator('button[type="submit"]').click()
    const createRes = await createPromise
    expect(createRes.status()).toBe(201)
    const createdBody = (await createRes.json()) as { id: string }

    await expect(addDialog).toHaveCount(0)
    await expect(page.getByText('Thêm khách hàng thành công')).toBeVisible()
    await expect(page.getByText(createdName)).toBeVisible()

    // Flag newly created customer on /customers/:id and test combined Search + TierName + IsFlagged
    const createdRow = page.locator('tbody tr', { hasText: createdName })
    await createdRow.getByRole('link', { name: /Xem chi tiết|Hồ sơ 360°/ }).click()
    await page.waitForURL((url) => url.pathname === `/customers/${createdBody.id}`)

    const blockPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${createdBody.id}`) && res.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Chặn quyền thuê sách' }).click()
    expect((await blockPromise).status()).toBe(200)
    await expect(page.getByText('Đang chặn thuê', { exact: true })).toBeVisible()

    await page.goto(`${BASE_URL}/customers`)
    await page.locator('input[placeholder*="Tìm SĐT"]').fill(createdName)
    await page.getByRole('button', { name: 'Hạng thành viên' }).click()
    await page.getByRole('option', { name: 'Hạng: Thường' }).click()
    await page.getByRole('button', { name: 'Trạng thái' }).click()
    await page.getByRole('option', { name: 'Trạng thái: Cần theo dõi' }).click()

    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.getByText(createdName)).toBeVisible()

    await page.getByRole('button', { name: 'Trạng thái' }).click()
    await page.getByRole('option', { name: 'Trạng thái: Bình thường' }).click()
    await expect(page.getByText('Chưa tìm thấy khách hàng')).toBeVisible()

    await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
    await expect(page.locator('tbody tr').first()).toBeVisible()

    // Ensure at least 11 REGULAR customers exist so Page 2 exists even with Hạng: Thường filter active
    const initialRegularSummary = await page.evaluate(async ({ apiUrl }) => {
      const res = await fetch(`${apiUrl}/api/customers?TierName=REGULAR&Page=1&PageSize=1`, { credentials: 'include' })
      return (await res.json()) as { totalCount: number }
    }, { apiUrl: API_URL })

    if (initialRegularSummary.totalCount < 11) {
      const needed = 11 - initialRegularSummary.totalCount
      const phoneSeed = uniqueSuffix.slice(-5)
      for (let i = 1; i <= needed; i += 1) {
        await page.evaluate(
          async ({ apiUrl, csrf, suffix, seed, idx }) => {
            const res = await fetch(`${apiUrl}/api/customers`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
              body: JSON.stringify({
                fullName: `Khách Phân Trang ${suffix}-${idx}`,
                phone: `094${seed}${String(idx).padStart(2, '0')}`,
              }),
            })
            if (!res.ok) {
              throw new Error(`Pagination fixture customer ${idx} failed with ${res.status}`)
            }
          },
          { apiUrl: API_URL, csrf: csrfToken!, suffix: uniqueSuffix, seed: phoneSeed, idx: i },
        )
      }
      await page.reload()
    }

    const regularSummary = await page.evaluate(async ({ apiUrl }) => {
      const res = await fetch(`${apiUrl}/api/customers?TierName=REGULAR&Page=1&PageSize=1`, { credentials: 'include' })
      return (await res.json()) as { totalCount: number }
    }, { apiUrl: API_URL })
    expect(regularSummary.totalCount).toBeGreaterThanOrEqual(11)

    await page.getByRole('button', { name: 'Hạng thành viên' }).click()
    await page.getByRole('option', { name: 'Hạng: Thường' }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await expect(page.getByText(new RegExp(`Hiển thị 11–.*trong ${regularSummary.totalCount} khách hàng`))).toBeVisible()

    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const page2ExportDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
    await expect(page2ExportDialog).toContainText(`${regularSummary.totalCount} khách hàng theo bộ lọc hiện tại`)

    const csvDownloadPromise = page.waitForEvent('download')
    await page2ExportDialog.getByRole('button', { name: /Xuất CSV/ }).click()
    const csvDownload = await csvDownloadPromise
    const csvBytes = readFileSync((await csvDownload.path())!)
    expect(Array.from(csvBytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const csvRows = csvBytes.toString('utf8').slice(1).split('\r\n')
    expect(csvRows.length).toBe(regularSummary.totalCount + 1)

    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const xlsxDownloadPromise = page.waitForEvent('download')
    await page.getByRole('dialog').getByRole('button', { name: /Xuất Excel/ }).click()
    const xlsxDownload = await xlsxDownloadPromise
    const xlsxZip = extractZipStoreFiles(new Uint8Array(readFileSync((await xlsxDownload.path())!)))
    expect(xlsxZip.has('xl/worksheets/sheet1.xml')).toBe(true)

    // Mobile drawer toggle & backdrop dismissal at 390x844
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
    await expect.poll(async () => (await page.locator('aside').boundingBox())?.x ?? -999).toBe(0)

    await page.locator('.fixed.inset-0.z-30').click({ position: { x: 350, y: 120 } })
    await expect(page.locator('.fixed.inset-0.z-30')).toHaveCount(0)
    await expect.poll(async () => {
      const box = await page.locator('aside').boundingBox()
      return box ? box.x + box.width : 999
    }).toBeLessThanOrEqual(0)

    monitor.assertClean()
  })

  test('regression: mobile and tablet Header sidebar toggle keeps >= 44x44px touch target without horizontal compression', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    const failures: string[] = []

    for (const check of [
      { width: 390, height: 844, path: '/customers' },
      { width: 390, height: 844, path: `/customers/${SEEDED_SILVER_ID}` },
      { width: 768, height: 1024, path: '/customers' },
    ]) {
      await page.setViewportSize({ width: check.width, height: check.height })
      await page.goto(`${BASE_URL}${check.path}`)
      await page.waitForLoadState('networkidle')

      const toggleBox = await page.getByRole('button', { name: 'Toggle Sidebar' }).boundingBox()
      if (!toggleBox) {
        failures.push(`Missing Toggle Sidebar on ${check.path} at ${check.width}x${check.height}`)
        continue
      }
      if (toggleBox.width < 44 || toggleBox.height < 44) {
        failures.push(
          `Toggle Sidebar box=${toggleBox.width.toFixed(2)}x${toggleBox.height.toFixed(2)}px (< 44x44px) on ${check.path} at ${check.width}x${check.height}`,
        )
      }
    }

    expect(failures).toEqual([])
    monitor.assertClean()
  })

  test('regression: customer dialog footer CTAs and empty-state/note buttons meet >= 44px height and AddCustomerDialog submit uses primary indigo styling', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    const failures: string[] = []

    for (const vp of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp)
      await page.goto(`${BASE_URL}/customers`)
      await expect(page.locator('tbody tr').first()).toBeVisible()

      // Empty-state recovery CTA >= 44px height
      await page.locator('input[placeholder*="Tìm SĐT"]').fill('ZZZ-EMPTY-TOUCH-CHECK')
      const clearFilterBtn = page.getByRole('button', { name: 'Xóa bộ lọc' })
      await expect(clearFilterBtn).toBeVisible()
      const clearFilterBox = await clearFilterBtn.boundingBox()
      if ((clearFilterBox?.height ?? 0) < 44) {
        failures.push(`Xóa bộ lọc height=${clearFilterBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      await clearFilterBtn.click()

      // AddCustomerDialog submit uses primary indigo background (not white secondary) & both footer buttons >= 44px
      await page.getByRole('button', { name: '+ Thêm mới khách hàng' }).click()
      const addDialog = page.getByRole('dialog', { name: 'Tạo nhanh khách hàng' })
      const addCancelBox = await addDialog.getByRole('button', { name: 'Hủy bỏ' }).boundingBox()
      const addSubmit = addDialog.locator('button[type="submit"]')
      const addSubmitBox = await addSubmit.boundingBox()
      const addSubmitBg = await addSubmit.evaluate((el) => getComputedStyle(el).backgroundColor)

      if (addSubmitBg === 'rgb(255, 255, 255)') {
        failures.push(`AddCustomerDialog submit uses secondary white background (${addSubmitBg}) instead of primary indigo at ${vp.width}x${vp.height}`)
      }
      if ((addCancelBox?.height ?? 0) < 44) {
        failures.push(`AddCustomerDialog Hủy bỏ height=${addCancelBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      if ((addSubmitBox?.height ?? 0) < 44) {
        failures.push(`AddCustomerDialog submit height=${addSubmitBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      await addDialog.getByRole('button', { name: 'Hủy bỏ' }).click()

      // ExportCustomerDialog footer close CTA >= 44px
      await page.getByRole('button', { name: 'Xuất danh sách' }).click()
      const exportDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
      const exportCloseBox = await exportDialog.getByRole('button', { name: 'Đóng', exact: true }).boundingBox()
      if ((exportCloseBox?.height ?? 0) < 44) {
        failures.push(`ExportCustomerDialog Đóng height=${exportCloseBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      await exportDialog.getByRole('button', { name: 'Đóng', exact: true }).click()

      // EditCustomerDialog footer CTAs >= 44px
      await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
      await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click()
      const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
      const editCancelBox = await editDialog.getByRole('button', { name: 'Hủy bỏ' }).boundingBox()
      const editSubmitBox = await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).boundingBox()
      if ((editCancelBox?.height ?? 0) < 44) {
        failures.push(`EditCustomerDialog Hủy bỏ height=${editCancelBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      if ((editSubmitBox?.height ?? 0) < 44) {
        failures.push(`EditCustomerDialog Lưu thay đổi height=${editSubmitBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
      await editDialog.getByRole('button', { name: 'Hủy bỏ' }).click()

      // CustomerDetailPage "Cập nhật ghi chú" button in Violations tab >= 44px (restore customer before asserting)
      await page.getByRole('button', { name: 'Chặn quyền thuê sách' }).click()
      await expect(page.getByRole('button', { name: 'Mở quyền thuê sách' })).toBeVisible()
      await page.getByRole('tab', { name: /Vi phạm & Ghi chú/ }).click()
      const noteBtnBox = await page.getByRole('button', { name: 'Cập nhật ghi chú' }).boundingBox()
      await page.getByRole('button', { name: 'Mở quyền thuê sách' }).click()
      await expect(page.getByRole('button', { name: 'Chặn quyền thuê sách' })).toBeVisible()
      if ((noteBtnBox?.height ?? 0) < 44) {
        failures.push(`Cập nhật ghi chú height=${noteBtnBox?.height ?? 0}px < 44px at ${vp.width}x${vp.height}`)
      }
    }

    expect(failures).toEqual([])
    monitor.assertClean()
  })

  test('regression: AddCustomerDialog resets unsaved state when reopened and announces generalError with role="alert"', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page, { allow422ForAddCustomerError: true })

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    const failures: string[] = []

    // 1. Trigger validation + dirty inputs, close dialog, and verify reopen starts clean
    await page.getByRole('button', { name: '+ Thêm mới khách hàng' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Tạo nhanh khách hàng' })
    await addDialog.getByLabel('Họ và tên *').fill('Khách Chưa Lưu')
    await addDialog.getByLabel('Email (tùy chọn)').fill('bad-email')
    await addDialog.locator('button[type="submit"]').click()
    await expect(addDialog.getByText('Email không đúng định dạng')).toBeVisible()

    await addDialog.getByRole('button', { name: 'Hủy bỏ' }).click()
    await expect(addDialog).toHaveCount(0)

    await page.getByRole('button', { name: '+ Thêm mới khách hàng' }).click()
    const reopenedDialog = page.getByRole('dialog', { name: 'Tạo nhanh khách hàng' })
    const persistedName = await reopenedDialog.getByLabel('Họ và tên *').inputValue()
    const persistedEmail = await reopenedDialog.getByLabel('Email (tùy chọn)').inputValue()
    const persistedErrorCount = await reopenedDialog.getByText('Email không đúng định dạng').count()
    if (persistedName !== '' || persistedEmail !== '' || persistedErrorCount > 0) {
      failures.push(
        `AddCustomerDialog retained stale state after close/reopen (fullName=${JSON.stringify(persistedName)}, email=${JSON.stringify(persistedEmail)}, emailErrorCount=${persistedErrorCount})`,
      )
    }

    // 2. Backend generalError must render inside an accessible role="alert" live region
    await page.route('**/api/customers', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Không thể lưu khách hàng vào lúc này' }),
        })
        return
      }
      await route.continue()
    })

    await reopenedDialog.getByLabel('Họ và tên *').fill('Khách Lỗi Hệ Thống')
    await reopenedDialog.getByLabel('Số điện thoại *').fill('0907778889')
    await reopenedDialog.getByLabel('Email (tùy chọn)').fill('')
    await reopenedDialog.locator('button[type="submit"]').click()
    const errorBanner = reopenedDialog.getByText('Không thể lưu khách hàng vào lúc này')
    await expect(errorBanner).toBeVisible()
    const alertRoleCount = await reopenedDialog
      .locator('[role="alert"]', { hasText: 'Không thể lưu khách hàng vào lúc này' })
      .count()
    if (alertRoleCount === 0) {
      failures.push('AddCustomerDialog generalError banner is missing role="alert"')
    }

    await page.unroute('**/api/customers')
    expect(failures).toEqual([])
    monitor.assertClean()
  })

  test('regression: all rendered visible text including Brand Logo tagline meets >= 4.5:1 WCAG contrast', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page)

    await loginViaUi(page, creds)
    const lowContrastByRoute: Array<{ route: string; text: string; contrast: number; fontSize: number }> = []

    for (const routePath of ['/customers', `/customers/${SEEDED_SILVER_ID}`]) {
      await page.goto(`${BASE_URL}${routePath}`)
      await page.waitForLoadState('networkidle')

      const lowContrastItems = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d')!
        function parseCssColor(css: string): [number, number, number, number] {
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = 'rgba(0, 0, 0, 0)'
          ctx.fillStyle = css
          ctx.fillRect(0, 0, 1, 1)
          const d = ctx.getImageData(0, 0, 1, 1).data
          return [d[0], d[1], d[2], d[3] / 255]
        }
        function effectiveBg(node: Element | null): [number, number, number] {
          const layers: Array<[number, number, number, number]> = []
          let cur: Element | null = node
          while (cur) {
            const parsed = parseCssColor(getComputedStyle(cur).backgroundColor)
            if (parsed[3] > 0) layers.unshift(parsed)
            cur = cur.parentElement
          }
          let r = 255
          let g = 255
          let b = 255
          for (const [lr, lg, lb, la] of layers) {
            r = lr * la + r * (1 - la)
            g = lg * la + g * (1 - la)
            b = lb * la + b * (1 - la)
          }
          return [Math.round(r), Math.round(g), Math.round(b)]
        }
        function luminance(rgb: [number, number, number]): number {
          const [r, g, b] = rgb.map((v) => {
            const s = v / 255
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
          })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        const failures: Array<{ text: string; contrast: number; fontSize: number }> = []
        for (const el of document.querySelectorAll('body *')) {
          if (el.closest('svg')) continue
          const hasTextNode = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() ?? '').length > 0,
          )
          if (!hasTextNode) continue
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) continue

          const fg = parseCssColor(style.color)
          const bg = effectiveBg(el)
          const l1 = Math.max(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
          const l2 = Math.min(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
          const ratio = Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2))
          const fontSize = Number.parseFloat(style.fontSize)
          const weight = Number.parseInt(style.fontWeight, 10) || 400
          const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && weight >= 700)
          const threshold = isLargeText ? 3 : 4.5
          if (ratio < threshold) {
            failures.push({
              text: (el.textContent ?? '').trim().slice(0, 60),
              contrast: ratio,
              fontSize,
            })
          }
        }
        return failures
      })

      for (const item of lowContrastItems) {
        lowContrastByRoute.push({ route: routePath, ...item })
      }
    }

    expect(lowContrastByRoute, 'Low-contrast text across customer routes').toEqual([])

    monitor.assertClean()
  })

  test('QA: live API enforces auth, RBAC, CORS origin policy, and rejects comma-separated/numeric TierName on PostgreSQL', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page, { allow404ForMissingCustomer: false })

    // Unauthenticated API access must return 401
    const unauthRes = await request.get(`${API_URL}/api/customers`)
    expect(unauthRes.status()).toBe(401)

    // CORS preflight: allowed origin receives ACAO; disallowed origin must not
    const allowedPreflight = await request.fetch(`${API_URL}/api/customers`, {
      method: 'OPTIONS',
      headers: {
        Origin: BASE_URL,
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect([200, 204]).toContain(allowedPreflight.status())
    expect(allowedPreflight.headers()['access-control-allow-origin']).toBe(BASE_URL)

    const evilPreflight = await request.fetch(`${API_URL}/api/customers`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(evilPreflight.headers()['access-control-allow-origin']).toBeUndefined()

    await loginViaUi(page, creds)
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    const csrfToken = await page.evaluate(() => sessionStorage.getItem('cloud-bookstore.csrf-token'))
    expect(csrfToken).toBeTruthy()

    // Live PostgreSQL TierName filter rejection for comma-separated & numeric strings
    for (const invalidTier of ['REGULAR,SILVER', '0,2', '2', 'UNKNOWN']) {
      const res = await page.request.get(
        `${API_URL}/api/customers?TierName=${encodeURIComponent(invalidTier)}`,
      )
      expect(res.status()).toBe(200)
      const body = (await res.json()) as { totalCount: number; items: unknown[] }
      expect(body.totalCount, `TierName=${invalidTier} must return 0 records`).toBe(0)
      expect(body.items).toEqual([])
    }

    // RBAC check: Cashier role cannot delete customer records (ADMIN or INVENTORY_MANAGER only)
    const deleteRes = await page.request.delete(`${API_URL}/api/customers/${SEEDED_SILVER_ID}`, {
      headers: { Origin: BASE_URL, 'X-CSRF-Token': csrfToken! },
    })
    expect(deleteRes.status()).toBe(403)

    monitor.assertClean()
  })

  test('QA: checks broken images, dialog mobile geometry & WCAG contrast inside open modals, 409 conflicts, and clearing flagReason via EditCustomerDialog', async ({ page, request }) => {
    const creds = await ensureTestCredentials(request)
    const monitor = attachRuntimeMonitors(page, { allow409ForCustomerConflict: true })

    async function scanVisibleContrastInside(selector: string) {
      return page.evaluate((rootSelector) => {
        const root = document.querySelector(rootSelector)
        if (!root) return [{ text: `Missing root ${rootSelector}`, contrast: 0, fontSize: 0 }]
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d')!
        function parseCssColor(css: string): [number, number, number, number] {
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = 'rgba(0, 0, 0, 0)'
          ctx.fillStyle = css
          ctx.fillRect(0, 0, 1, 1)
          const d = ctx.getImageData(0, 0, 1, 1).data
          return [d[0], d[1], d[2], d[3] / 255]
        }
        function effectiveBg(node: Element | null): [number, number, number] {
          const layers: Array<[number, number, number, number]> = []
          let cur: Element | null = node
          while (cur) {
            const parsed = parseCssColor(getComputedStyle(cur).backgroundColor)
            if (parsed[3] > 0) layers.unshift(parsed)
            cur = cur.parentElement
          }
          let r = 255
          let g = 255
          let b = 255
          for (const [lr, lg, lb, la] of layers) {
            r = lr * la + r * (1 - la)
            g = lg * la + g * (1 - la)
            b = lb * la + b * (1 - la)
          }
          return [Math.round(r), Math.round(g), Math.round(b)]
        }
        function luminance(rgb: [number, number, number]): number {
          const [r, g, b] = rgb.map((v) => {
            const s = v / 255
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
          })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }

        const failures: Array<{ text: string; contrast: number; fontSize: number }> = []
        for (const el of root.querySelectorAll('*')) {
          if (el.closest('svg')) continue
          const hasTextNode = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() ?? '').length > 0,
          )
          if (!hasTextNode) continue
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) continue

          const fg = parseCssColor(style.color)
          const bg = effectiveBg(el)
          const l1 = Math.max(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
          const l2 = Math.min(luminance([fg[0], fg[1], fg[2]]), luminance(bg))
          const ratio = Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2))
          const fontSize = Number.parseFloat(style.fontSize)
          const weight = Number.parseInt(style.fontWeight, 10) || 400
          const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && weight >= 700)
          const threshold = isLargeText ? 3 : 4.5
          if (ratio < threshold) {
            failures.push({
              text: (el.textContent ?? '').trim().slice(0, 60),
              contrast: ratio,
              fontSize,
            })
          }
        }
        return failures
      }, selector)
    }

    await loginViaUi(page, creds)

    // Verify zero broken images across customers/detail routes
    for (const routePath of ['/customers', `/customers/${SEEDED_SILVER_ID}`]) {
      await page.goto(`${BASE_URL}${routePath}`)
      await page.waitForLoadState('networkidle')
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.getAttribute('src') ?? img.alt ?? 'unknown-img'),
      )
      expect(brokenImgs, `Broken images on ${routePath}`).toEqual([])
    }

    // Mobile 390x844 check for open AddCustomerDialog & ExportCustomerDialog bounds (no horizontal overflow)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/customers`)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await page.getByRole('button', { name: 'Xuất danh sách' }).click()
    const mobileExportDialog = page.getByRole('dialog', { name: 'Xuất danh sách khách hàng' })
    await expect(mobileExportDialog).toBeVisible()
    const mobileExportGeometry = await mobileExportDialog.evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect()
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        dialogLeft: rect.left,
        dialogRight: rect.right,
        dialogScrollWidth: dialog.scrollWidth,
        dialogClientWidth: dialog.clientWidth,
      }
    })
    expect(mobileExportGeometry.docScrollWidth).toBeLessThanOrEqual(mobileExportGeometry.innerWidth)
    expect(mobileExportGeometry.dialogLeft).toBeGreaterThanOrEqual(0)
    expect(mobileExportGeometry.dialogRight).toBeLessThanOrEqual(mobileExportGeometry.innerWidth)
    expect(mobileExportGeometry.dialogScrollWidth).toBeLessThanOrEqual(mobileExportGeometry.dialogClientWidth)
    expect(await scanVisibleContrastInside('[role="dialog"]')).toEqual([])
    await mobileExportDialog.getByRole('button', { name: 'Đóng', exact: true }).click()

    await page.getByRole('button', { name: '+ Thêm mới khách hàng' }).click()
    const mobileAddDialog = page.getByRole('dialog', { name: 'Tạo nhanh khách hàng' })
    await expect(mobileAddDialog).toBeVisible()
    const mobileAddGeometry = await mobileAddDialog.evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect()
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        dialogLeft: rect.left,
        dialogRight: rect.right,
        dialogScrollWidth: dialog.scrollWidth,
        dialogClientWidth: dialog.clientWidth,
      }
    })
    expect(mobileAddGeometry.docScrollWidth).toBeLessThanOrEqual(mobileAddGeometry.innerWidth)
    expect(mobileAddGeometry.dialogLeft).toBeGreaterThanOrEqual(0)
    expect(mobileAddGeometry.dialogRight).toBeLessThanOrEqual(mobileAddGeometry.innerWidth)
    expect(mobileAddGeometry.dialogScrollWidth).toBeLessThanOrEqual(mobileAddGeometry.dialogClientWidth)

    // Submit duplicate phone in AddCustomerDialog -> real backend 409 Conflict preserves user inputs
    await mobileAddDialog.getByLabel('Họ và tên *').fill('Khách Trùng SĐT QA')
    await mobileAddDialog.getByLabel('Số điện thoại *').fill('0900000005')
    const dupPostPromise = page.waitForResponse(
      (res) => res.url().endsWith('/api/customers') && res.request().method() === 'POST',
    )
    await mobileAddDialog.locator('button[type="submit"]').click()
    expect((await dupPostPromise).status()).toBe(409)
    await expect(mobileAddDialog.getByText(/Số điện thoại đã tồn tại/)).toBeVisible()
    expect(await mobileAddDialog.getByLabel('Họ và tên *').inputValue()).toBe('Khách Trùng SĐT QA')
    expect(await scanVisibleContrastInside('[role="dialog"]')).toEqual([])
    await mobileAddDialog.getByRole('button', { name: 'Hủy bỏ' }).click()

    // Desktop check for "Cập nhật ghi chú" -> EditCustomerDialog 409 conflict & clearing flagReason across reload
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/customers/${SEEDED_SILVER_ID}`)
    await expect(page.getByRole('heading', { name: 'Trần Minh Anh', level: 1 })).toBeVisible()

    const lockPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await page.getByRole('button', { name: 'Chặn quyền thuê sách' }).click()
    expect((await lockPromise).status()).toBe(200)

    await page.getByRole('tab', { name: /Vi phạm & Ghi chú/ }).click()
    await page.getByRole('button', { name: 'Cập nhật ghi chú' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
    await expect(editDialog).toBeVisible()

    // Submit duplicate phone (0900000006 belongs to Lê Quốc Bảo) -> real backend 409 inline phoneError
    const editPhoneInput = editDialog.getByLabel('Số điện thoại *')
    const ownPhone = await editPhoneInput.inputValue()
    await editPhoneInput.fill('0900000006')
    const edit409Promise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    expect((await edit409Promise).status()).toBe(409)
    await expect(editDialog.getByText(/Số điện thoại đã tồn tại/)).toBeVisible()
    await expect(editPhoneInput).toHaveAttribute('aria-invalid', 'true')
    expect(await scanVisibleContrastInside('[role="dialog"]')).toEqual([])

    // Restore own phone, update flagReason, save, and verify across reload
    await editPhoneInput.fill(ownPhone)
    const reasonInput = editDialog.getByLabel('Lý do theo dõi / ghi chú (tùy chọn)')
    await reasonInput.fill('Trả trễ 5 ngày - cần đối soát')
    const updateReasonPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await editDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    expect((await updateReasonPromise).status()).toBe(200)
    await expect(editDialog).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Trả trễ 5 ngày - cần đối soát').first()).toBeVisible()

    // Unflag & clear flagReason via EditCustomerDialog -> confirm FlagReason cleared in DB across reload
    await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click()
    const clearDialog = page.getByRole('dialog', { name: 'Chỉnh sửa thông tin khách hàng' })
    await clearDialog.getByRole('checkbox').uncheck()
    await clearDialog.getByLabel('Lý do theo dõi / ghi chú (tùy chọn)').fill('')
    const clearPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/customers/${SEEDED_SILVER_ID}`) && res.request().method() === 'PUT',
    )
    await clearDialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    expect((await clearPromise).status()).toBe(200)
    await expect(clearDialog).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Bình thường', { exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Vi phạm & Ghi chú/ })).toContainText('0')
    await expect(page.getByText('Trả trễ 5 ngày - cần đối soát')).toHaveCount(0)

    monitor.assertClean()
  })
})
