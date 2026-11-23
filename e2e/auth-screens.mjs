import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const frontendDir = path.join(repoRoot, 'app', 'frontend')
const screenshotsDir =
  process.env.SCREENSHOTS_DIR ??
  '/home/phamhoangthai/Documents/project/cloud-bookstore/.pipeline/auth-screens-figma/screenshots'

const require = createRequire(import.meta.url)

function resolvePlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    'playwright',
    '/home/phamhoangthai/.npm/_npx/e41f203b7505f1fb/node_modules/playwright',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      return require(candidate)
    } catch {
      // try next candidate
    }
  }
  throw new Error('Playwright module not found. Set PLAYWRIGHT_MODULE or install playwright.')
}

function resolveChromiumExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/home/phamhoangthai/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',
    '/home/phamhoangthai/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome',
  ].filter(Boolean)

  return candidates.find((p) => existsSync(p))
}

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Timed out waiting for frontend server at ${url}`)
}

async function assertDomGeometry(page, label) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const overflowX = doc.scrollWidth > doc.clientWidth
    const brokenImages = Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src)
    const bodyText = document.body.innerText ?? ''
    const rawLeaks = ['undefined', 'NaN', '[object Object]'].filter((token) =>
      new RegExp(`\\b${token.replace(/[[\]]/g, '\\$&')}\\b`).test(bodyText),
    )

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX,
      brokenImages,
      rawLeaks,
    }
  })

  assert.equal(
    metrics.overflowX,
    false,
    `${label}: horizontal overflow detected (scrollWidth=${metrics.scrollWidth} > clientWidth=${metrics.clientWidth})`,
  )
  assert.deepEqual(metrics.brokenImages, [], `${label}: broken images detected`)
  assert.deepEqual(metrics.rawLeaks, [], `${label}: raw state leaks in body text`)
}

async function capture(page, fileName, options = { fullPage: true }) {
  mkdirSync(screenshotsDir, { recursive: true })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(screenshotsDir, fileName), fullPage: options.fullPage })
}

describe('AUTH screens E2E, DOM geometry & visual verification (SCR-AUTH-01 to 05)', { concurrency: false }, () => {
  const port = 4179
  const baseUrl = `http://127.0.0.1:${port}`
  let serverProc
  let browser

  before(async () => {
    serverProc = spawn(
      'bunx',
      ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: frontendDir,
        env: { ...process.env, VITE_BASE_URL: '' },
        stdio: 'ignore',
      },
    )

    await waitForServer(`${baseUrl}/login`)

    const { chromium } = resolvePlaywright()
    const executablePath = resolveChromiumExecutable()
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    })
  })

  after(async () => {
    await browser?.close()
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGTERM')
    }
  })

  function setupMockState() {
    return {
      authenticated: false,
      loginMode: 'ok', // 'ok' | 'invalid' | 'locked'
      registerConflict: false,
      verifyOk: true,
      resetOk: true,
      calls: [],
    }
  }

  async function createAppContext(mockState, viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []

    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('401') && !text.includes('403') && !text.includes('409')) {
          consoleErrors.push(text)
        }
      }
    })

    await page.route('**/api/**', async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const apiPath = url.pathname
      const method = req.method()
      let body = null
      try {
        body = req.postDataJSON()
      } catch {
        body = null
      }
      mockState.calls.push({ method, path: apiPath, body })

      if (apiPath === '/api/auth/session' && method === 'GET') {
        if (!mockState.authenticated) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'No active session' }),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            csrfToken: 'e2e-csrf-token',
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'minhanh@nhasachmay.vn',
              fullName: 'Nguyễn Minh Anh',
              role: 'ADMIN',
              avatarUrl: null,
            },
          }),
        })
      }

      if (apiPath === '/api/auth/login' && method === 'POST') {
        if (mockState.loginMode === 'invalid') {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid credentials' }),
          })
        }
        if (mockState.loginMode === 'locked') {
          return route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Account locked' }),
          })
        }
        mockState.authenticated = true
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            csrfToken: 'e2e-csrf-token',
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'minhanh@nhasachmay.vn',
              fullName: 'Nguyễn Minh Anh',
              role: 'ADMIN',
              avatarUrl: null,
            },
          }),
        })
      }

      if (apiPath === '/api/auth/logout' && method === 'POST') {
        mockState.authenticated = false
        return route.fulfill({ status: 204, body: '' })
      }

      if (apiPath === '/api/auth/register' && method === 'POST') {
        if (mockState.registerConflict) {
          return route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Email đã được đăng ký trước đó.' }),
          })
        }
        return route.fulfill({ status: 200, body: '' })
      }

      if (apiPath === '/api/auth/verification-resends' && method === 'POST') {
        return route.fulfill({ status: 204, body: '' })
      }

      if (apiPath === '/api/auth/verify' && method === 'POST') {
        if (!mockState.verifyOk) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Token expired' }),
          })
        }
        return route.fulfill({ status: 204, body: '' })
      }

      if (apiPath === '/api/auth/password-reset-requests' && method === 'POST') {
        return route.fulfill({ status: 204, body: '' })
      }

      if (apiPath === '/api/auth/password-resets' && method === 'POST') {
        if (!mockState.resetOk) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Token expired' }),
          })
        }
        return route.fulfill({ status: 204, body: '' })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    return { context, page, pageErrors, consoleErrors }
  }

  test('SCR-AUTH-01 Login desktop & mobile layout, error placement, eye toggle & navigation', async () => {
    const state = setupMockState()
    const { context, page, pageErrors, consoleErrors } = await createAppContext(state)

    try {
      await page.goto(`${baseUrl}/login`)
      await page.getByRole('heading', { name: 'Đăng nhập hệ thống' }).waitFor()
      await assertDomGeometry(page, 'login-desktop')

      // AC 1.1: No 30-day checkbox, expected branding & copy
      assert.equal(await page.locator('input[type="checkbox"]').count(), 0)
      assert.equal(await page.getByText('Mây Portal').isVisible(), true)
      assert.equal(await page.getByText('© 2026 Nhà Sách Mây').isVisible(), true)

      // Password eye toggle
      const passwordInput = page.getByLabel(/^Mật khẩu/i)
      await passwordInput.fill('MayBook2026!')
      await page.getByRole('button', { name: /Hiện mật khẩu/i }).click()
      assert.equal(await passwordInput.getAttribute('type'), 'text')
      await page.getByRole('button', { name: /Ẩn mật khẩu/i }).click()
      assert.equal(await passwordInput.getAttribute('type'), 'password')

      await capture(page, '01-login-desktop-1440x900.png')

      // AC 1.2: Failed login renders error Banner BELOW submit button, clears password, keeps email
      state.loginMode = 'invalid'
      await page.getByLabel(/Email nội bộ/i).fill('nv.phong@nhasachmay.vn')
      await passwordInput.fill('WrongPass123!')
      await page.getByTestId('auth-login-submit').click()

      const banner = page.locator('[role="alert"], [role="status"]').filter({
        hasText: 'Email hoặc mật khẩu không đúng',
      })
      await banner.waitFor()
      const submitBox = await page.getByTestId('auth-login-submit').boundingBox()
      const bannerBox = await banner.boundingBox()
      assert.ok(submitBox && bannerBox)
      assert.ok(bannerBox.y > submitBox.y + submitBox.height - 1, 'Error banner must appear below submit button')
      assert.equal(await page.getByLabel(/Email nội bộ/i).inputValue(), 'nv.phong@nhasachmay.vn')
      assert.equal(await passwordInput.inputValue(), '')

      // Locked account error
      state.loginMode = 'locked'
      await passwordInput.fill('WrongPass123!')
      await page.getByTestId('auth-login-submit').click()
      await page.getByText(/tạm khóa do nhập sai nhiều lần/i).waitFor()

      // Mobile 390x844
      await page.setViewportSize({ width: 390, height: 844 })
      await assertDomGeometry(page, 'login-mobile')
      await capture(page, '02-login-mobile-390x844.png')

      // AC 1.3: Links to /forgot-password and /register
      await page.getByTestId('auth-forgot-link').click()
      assert.ok(page.url().endsWith('/forgot-password'))
      await page.goto(`${baseUrl}/login`)
      await page.getByTestId('auth-register-link').click()
      assert.ok(page.url().endsWith('/register'))

      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleErrors, [])
    } finally {
      await context.close()
    }
  })

  test('SCR-AUTH-02 Register single-fault validation, API submit & VerifyRegister flow', async () => {
    const state = setupMockState()
    const { context, page, pageErrors, consoleErrors } = await createAppContext(state)

    try {
      await page.goto(`${baseUrl}/register`)
      await page.getByTestId('auth-register-submit').waitFor()
      await assertDomGeometry(page, 'register-desktop')
      await capture(page, '03-register-desktop-1440x900.png')

      const fillValidRegister = async () => {
        await page.getByLabel(/Họ và tên/i).fill('Nguyễn Minh Phong')
        await page.getByLabel(/Email nội bộ/i).fill('nv.phong@nhasachmay.vn')
        await page.getByLabel(/Số điện thoại/i).fill('0903123456')
        await page.getByLabel(/^Mật khẩu/i).fill('MayBook2026!')
        await page.getByLabel(/Xác nhận mật khẩu/i).fill('MayBook2026!')
      }

      // Single-fault 1: invalid phone only
      await fillValidRegister()
      await page.getByLabel(/Số điện thoại/i).fill('1234567890')
      await page.getByTestId('auth-register-submit').click()
      assert.equal(state.calls.some((c) => c.path === '/api/auth/register'), false)
      assert.equal(await page.getByLabel(/Email nội bộ/i).inputValue(), 'nv.phong@nhasachmay.vn')

      // Single-fault 2: weak 11-char password only
      await fillValidRegister()
      await page.getByLabel(/^Mật khẩu/i).fill('MayBook202!')
      await page.getByLabel(/Xác nhận mật khẩu/i).fill('MayBook202!')
      await page.getByTestId('auth-register-submit').click()
      assert.equal(state.calls.some((c) => c.path === '/api/auth/register'), false)

      // Single-fault 3: mismatched confirmPassword only
      await fillValidRegister()
      await page.getByLabel(/Xác nhận mật khẩu/i).fill('MayBook2026?diff')
      await page.getByTestId('auth-register-submit').click()
      assert.equal(state.calls.some((c) => c.path === '/api/auth/register'), false)

      // BE 409 conflict displays an error Banner and preserves valid inputs
      state.registerConflict = true
      await fillValidRegister()
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/register') && res.status() === 409),
        page.getByTestId('auth-register-submit').click(),
      ])
      const conflictBanner = page.locator('[role="alert"], [role="status"]').first()
      await conflictBanner.waitFor()
      const conflictText = await conflictBanner.innerText()
      assert.ok(conflictText.trim().length > 0, 'Expected non-empty 409 error banner on register')
      assert.equal(await page.getByLabel(/Họ và tên/i).inputValue(), 'Nguyễn Minh Phong')
      assert.equal(await page.getByLabel(/Email nội bộ/i).inputValue(), 'nv.phong@nhasachmay.vn')

      // Valid submit -> sent verification view + resend
      state.registerConflict = false
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/register') && res.status() === 200),
        page.getByTestId('auth-register-submit').click(),
      ])
      await page.getByText('Kiểm tra email để xác minh tài khoản').waitFor()
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/verification-resends')),
        page.getByRole('button', { name: /Gửi lại email xác minh/i }).click(),
      ])
      assert.ok(state.calls.some((c) => c.path === '/api/auth/verification-resends'))

      // AC 2.3: VerifyRegisterPage success and failure
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/verify')),
        page.goto(`${baseUrl}/verify-register?token=aaa.bbb-1.ccc_2`),
      ])
      await page.getByRole('heading').first().waitFor()
      const verifySuccessText = await page.locator('main, [role="main"], body').first().innerText()
      assert.match(verifySuccessText, /xác minh|kích hoạt|thành công|đăng nhập/i)
      await assertDomGeometry(page, 'verify-register-success')

      state.verifyOk = false
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/verify')),
        page.goto(`${baseUrl}/verify-register?token=expired.bbb-1.ccc_2`),
      ])
      await page.getByRole('heading', { name: /không hợp lệ|hết hạn/i }).waitFor()
      await assertDomGeometry(page, 'verify-register-failed')

      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleErrors, [])
    } finally {
      await context.close()
    }
  })

  test('SCR-AUTH-03A/B/C/D Forgot & Reset Password flows + expired state', async () => {
    const state = setupMockState()
    const { context, page, pageErrors, consoleErrors } = await createAppContext(state)

    try {
      // SCR-AUTH-03A
      await page.goto(`${baseUrl}/forgot-password`)
      await page.getByRole('heading', { name: 'Quên mật khẩu?' }).waitFor()
      await assertDomGeometry(page, 'forgot-password-email')
      await capture(page, '04-forgot-email-1440x900.png')

      await page.getByLabel(/Email/i).fill('nv.phong@nhasachmay.vn')
      await page.getByTestId('auth-forgot-submit').click()
      await page.getByRole('heading', { name: 'Đã gửi email khôi phục' }).waitFor()
      await assertDomGeometry(page, 'forgot-password-sent')
      await capture(page, '05-forgot-sent-1440x900.png')

      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/auth/password-reset-requests')),
        page.getByRole('button', { name: /Gửi lại email khôi phục/i }).click(),
      ])
      assert.equal(state.calls.filter((c) => c.path === '/api/auth/password-reset-requests').length, 2)

      // SCR-AUTH-03B
      await page.goto(`${baseUrl}/reset-password?token=valid.reset-token_123`)
      await page.getByRole('heading', { name: 'Đặt lại mật khẩu mới' }).waitFor()
      assert.equal(await page.getByText('nv.phong@nhasachmay.vn').count(), 0, 'Must not hardcode email')
      await page.getByLabel(/^Mật khẩu mới/i).fill('MayBook2026!')
      await page.getByLabel(/Xác nhận mật khẩu mới/i).fill('MayBook2026!')
      await assertDomGeometry(page, 'reset-password-form')
      await capture(page, '06-reset-form-1440x900.png')

      // SCR-AUTH-03C
      await page.getByTestId('auth-reset-submit').click()
      await page.getByRole('heading', { name: 'Đặt lại mật khẩu thành công!' }).waitFor()
      await assertDomGeometry(page, 'reset-password-success')
      await capture(page, '07-reset-success-1440x900.png')

      await page.getByRole('button', { name: 'Đăng nhập ngay' }).click()
      assert.ok(page.url().endsWith('/login'))

      // SCR-AUTH-03D (missing token)
      await page.goto(`${baseUrl}/reset-password`)
      await page.getByRole('heading', { name: 'Liên kết đã hết hạn hoặc không hợp lệ' }).waitFor()
      await assertDomGeometry(page, 'reset-password-expired')
      await capture(page, '08-reset-expired-1440x900.png')

      // SCR-AUTH-03D (401 from API)
      state.resetOk = false
      await page.goto(`${baseUrl}/reset-password?token=expired.reset-token_123`)
      await page.getByLabel(/^Mật khẩu mới/i).fill('MayBook2026!')
      await page.getByLabel(/Xác nhận mật khẩu mới/i).fill('MayBook2026!')
      await page.getByTestId('auth-reset-submit').click()
      await page.getByRole('heading', { name: 'Liên kết đã hết hạn hoặc không hợp lệ' }).waitFor()

      await page.getByTestId('auth-expired-resend').click()
      assert.ok(page.url().endsWith('/forgot-password'))

      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleErrors, [])
    } finally {
      await context.close()
    }
  })

  test('SCR-AUTH-04 & SCR-AUTH-05/05A/05B Authenticated flows, Profile, Modals & Responsive checks', async () => {
    const state = setupMockState()
    const { context, page, pageErrors, consoleErrors } = await createAppContext(state)

    try {
      // Protected route guard redirect
      await page.goto(`${baseUrl}/profile`)
      await page.waitForURL('**/login?next=%2Fprofile')

      // Real login flow into protected area
      await page.getByLabel(/Email nội bộ/i).fill('minhanh@nhasachmay.vn')
      await page.getByLabel(/^Mật khẩu/i).fill('MayBook2026!')
      await page.getByTestId('auth-login-submit').click()
      await page.waitForURL('**/profile')

      // Navigate to SCR-AUTH-04 (/change-password and /first-change-password alias)
      await page.goto(`${baseUrl}/change-password`)
      await page.getByRole('heading', { name: 'Đổi mật khẩu lần đầu' }).waitFor()
      await page.getByLabel(/^Mật khẩu mới/i).fill('MayBook2026!')
      await page.getByLabel(/Xác nhận mật khẩu mới/i).fill('MayBook2026!')
      await assertDomGeometry(page, 'first-change-password')
      await capture(page, '09-first-change-password-1440x900.png')

      await page.goto(`${baseUrl}/first-change-password`)
      await page.getByRole('heading', { name: 'Đổi mật khẩu lần đầu' }).waitFor()
      await page.getByLabel(/^Mật khẩu mới/i).fill('MayBook2026!')
      await page.getByLabel(/Xác nhận mật khẩu mới/i).fill('MayBook2026!')
      await page.getByTestId('auth-first-change-submit').click()
      await page.waitForURL('**/dashboard')

      // AC 5.1: Header profile link -> /profile
      await page.getByTestId('header-profile-link').click()
      await page.waitForURL('**/profile')
      await page.getByRole('heading', { name: 'Hồ sơ cá nhân & Bảo mật' }).waitFor()
      await assertDomGeometry(page, 'profile-desktop')

      // AC 5.2: Anti-bloat assertions
      assert.equal(await page.getByText(/2FA|OTP|Xác thực hai bước/i).count(), 0)
      assert.equal(await page.getByText(/Địa chỉ IP/i).count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Lưu thay đổi' }).count(), 0)
      await capture(page, '10-profile-desktop-1440x900.png')

      const beforeLastChanged = await page.getByText(/Lần đổi gần nhất:/i).innerText()
      assert.match(beforeLastChanged, /02\/10\/2026/)

      // AC 5.3: SCR-AUTH-05A Change Password Modal
      await page.getByTestId('profile-change-password-btn').click()
      const changeModal = page.getByTestId('change-password-modal')
      await changeModal.waitFor()
      assert.equal(await changeModal.getAttribute('role'), 'dialog')
      assert.equal(await changeModal.getAttribute('aria-modal'), 'true')

      await changeModal.getByLabel(/Mật khẩu hiện tại/i).fill('OldPassword123!')
      await changeModal.getByLabel(/^Mật khẩu mới/i).fill('MayBook@2026!')
      await changeModal.getByLabel(/Xác nhận mật khẩu mới/i).fill('MayBook@2026!')
      await capture(page, '12-profile-modal-change-password-1440x900.png', { fullPage: false })

      await changeModal.getByRole('button', { name: 'Cập nhật mật khẩu' }).click()
      await changeModal.waitFor({ state: 'detached' })
      const afterLastChanged = await page.getByText(/Lần đổi gần nhất:/i).innerText()
      assert.notEqual(afterLastChanged, beforeLastChanged, 'Last password changed timestamp must update')

      // Escape key closes modal
      await page.getByTestId('profile-change-password-btn').click()
      await changeModal.waitFor()
      await page.keyboard.press('Escape')
      await changeModal.waitFor({ state: 'detached' })

      // AC 5.4: SCR-AUTH-05B Logout Device Modal
      await page.getByTestId('device-logout-btn-dev-iphone15').click()
      const logoutModal = page.getByTestId('logout-device-modal')
      await logoutModal.waitFor()
      assert.equal(await logoutModal.getAttribute('role'), 'dialog')
      assert.equal(await logoutModal.getAttribute('aria-modal'), 'true')
      await capture(page, '13-profile-modal-logout-device-1440x900.png', { fullPage: false })

      await logoutModal.getByRole('button', { name: 'Đăng xuất thiết bị', exact: true }).click()
      await logoutModal.waitFor({ state: 'detached' })
      assert.equal(await page.getByTestId('device-logout-btn-dev-iphone15').count(), 0)

      // Profile edit + save + notifications switches
      await page.getByLabel(/Họ và tên/i).fill('Nguyễn Minh Anh QA')
      await page.getByTestId('profile-save-btn').click()
      const switches = page.locator('button[role="switch"]')
      assert.equal(await switches.count(), 3)
      assert.equal(await switches.nth(0).isDisabled(), true)
      const initialSecond = await switches.nth(1).getAttribute('aria-checked')
      await switches.nth(1).click()
      assert.notEqual(await switches.nth(1).getAttribute('aria-checked'), initialSecond)

      // Tablet 768x1024 check
      await page.setViewportSize({ width: 768, height: 1024 })
      await assertDomGeometry(page, 'profile-tablet')

      assert.deepEqual(pageErrors, [])
      assert.deepEqual(consoleErrors, [])
    } finally {
      await context.close()
    }

    // Fresh mobile 390x844 session for /profile to verify responsive mobile shell & stacking
    const mobileState = setupMockState()
    mobileState.authenticated = true
    const mobileCtx = await createAppContext(mobileState, { width: 390, height: 844 })
    try {
      await mobileCtx.page.goto(`${baseUrl}/profile`)
      await mobileCtx.page.getByRole('heading', { name: 'Hồ sơ cá nhân & Bảo mật' }).waitFor()
      await assertDomGeometry(mobileCtx.page, 'profile-mobile')
      await capture(mobileCtx.page, '11-profile-mobile-390x844.png')
      assert.deepEqual(mobileCtx.pageErrors, [])
      assert.deepEqual(mobileCtx.consoleErrors, [])
    } finally {
      await mobileCtx.context.close()
    }
  })
})
