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

function attachRuntimeMonitors(page: Page, options?: { allow404ForMissingCustomer?: boolean }) {
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

    // Navigate via "Hồ sơ 360°" link on Trần Minh Anh's row
    const silverRow = page.locator('tbody tr', { hasText: 'Trần Minh Anh' })
    await silverRow.getByRole('link', { name: 'Hồ sơ 360°' }).click()
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
})
