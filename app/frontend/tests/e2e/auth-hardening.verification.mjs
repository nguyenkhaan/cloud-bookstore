import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import {
  auditRows, auth, chromium, client, createActiveEmployee, employee, employeeRow, expectStatus, login, newPassword,
  originalPassword, requireMailLink, sql, sqlLiteral, stack,
} from './auth-fixture.mjs'

const profilePath = `${auth}/profile`
const profileUrl = `${stack.beUrl}${profilePath}`
const desktop = { width: 1440, height: 900 }
const tablet = { width: 768, height: 1024 }
const mobile = { width: 390, height: 844 }
const verifyJwtSecret = 'verify-only-verify-secret-key-at-least-32-chars'
const cloudinaryApiSecret = 'verify-secret'
const picture = {
  name: 'avatar.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'),
}
let browser

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
})
after(() => browser?.close())

async function openPage(testCase, viewport = desktop) {
  const context = await browser.newContext({ baseURL: stack.feUrl, viewport, hasTouch: viewport === mobile })
  testCase.after(() => context.close())
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  return page
}

async function signIn(page, testCase, staff) {
  staff ??= await createActiveEmployee(await client(testCase))
  await page.goto('/login')
  await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
  await page.getByTestId('auth-login-submit').click()
  await page.waitForURL('**/dashboard')
  return staff
}

async function capture(page, name) {
  if (!process.env.AUTH_SCREENSHOTS_DIR) return
  mkdirSync(process.env.AUTH_SCREENSHOTS_DIR, { recursive: true })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(process.env.AUTH_SCREENSHOTS_DIR, `${name}.png`), fullPage: true, animations: 'disabled' })
}

async function assertLogoutWarning(page, text) {
  const warning = page.getByRole('status').filter({ hasText: text })
  await warning.waitFor()
  assert.equal(await page.getByRole('status').count(), 1)
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.equal(await page.getByRole('heading', { name: 'Đăng nhập hệ thống', exact: true }).count(), 1)
  assert.deepEqual(await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => image.getClientRects().length && !image.naturalWidth).length,
  })), { overflow: false, brokenImages: 0 })
}

function responseFor(page, method, pathname) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname === pathname)
}

function profileName(page) {
  return page.getByLabel('Họ và tên', { exact: true })
}

const logoutPath = `${auth}/logout`
const sessionUrl = `${stack.beUrl}${auth}/session`

function browserAuthCookies(context) {
  return context.cookies(sessionUrl).then((cookies) =>
    cookies.filter(({ name }) => name === 'cloudbook_access' || name === 'cloudbook_refresh'))
}

async function waitForBackendReadiness() {
  const url = `${stack.beUrl}/api/health/readiness`
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if ((await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => null))?.ok) return
    await delay(250)
  }
  assert.fail('Backend readiness did not recover after restarting Redis REST')
}

test('logout clears browser cookies and revokes the session during a Redis outage on desktop and mobile', async (testCase) => {
  const sessions = []
  for (const [viewport, screenshot] of [
    [desktop, '01-degraded-logout-partial-desktop'],
    [mobile, '02-degraded-logout-partial-mobile'],
  ]) {
    const page = await openPage(testCase, viewport)
    page.setDefaultTimeout(25_000)
    const staff = await signIn(page, testCase)
    const cookies = await browserAuthCookies(page.context())
    assert.equal(cookies.length, 2)
    if (viewport === mobile) await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
    sessions.push({ page, staff, cookies, screenshot })
  }

  const guardClient = await client(testCase)
  const guardStaff = await createActiveEmployee(guardClient)
  const guard = await login(guardClient, guardStaff)
  const revocationCount = (email) => Number(sql(`SELECT count(*) FROM employee_sessions AS session
    JOIN employee ON employee."Id" = session."EmployeeId"
    WHERE employee."Email" = ${sqlLiteral(email)} AND session."RevokedAt" IS NOT NULL`))

  const container = stack.containers.redisRest
  assert.match(container, /^cloudbook-verify-/)
  try {
    execFileSync('docker', ['stop', '--timeout', '2', container], { stdio: 'pipe', timeout: 60_000 })
    for (const [fault, headers, code] of [
      ['missing CSRF', {}, 'CSRF_TOKEN_INVALID'],
      ['invalid CSRF', { 'X-CSRF-Token': 'invalid' }, 'CSRF_TOKEN_INVALID'],
      ['disallowed origin', { ...guard.headers, Origin: 'https://disallowed.example.test' }, undefined],
    ]) {
      const response = await guardClient.post(logoutPath, { headers })
      expectStatus(response, 403, `Logout rejects ${fault}`)
      assert.equal(response.headers()['set-cookie'], undefined)
      if (code) assert.equal((await response.json()).code, code)
      assert.equal(revocationCount(guardStaff.email), 0)
    }
    for (const response of [
      await guardClient.get(sessionUrl),
      await guardClient.post(`${auth}/refresh`, { headers: guard.headers }),
    ]) {
      expectStatus(response, 503)
      assert.equal(response.headers()['set-cookie'], undefined)
    }

    for (const { page, staff, cookies, screenshot } of sessions) {
      const responsePromise = responseFor(page, 'POST', logoutPath)
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
      const response = await responsePromise
      assert.equal(response.status(), 503)
      const { code, cookiesCleared, revocationCompleted, message } = await response.json()
      assert.equal(code, 'LOGOUT_REVOCATION_INCOMPLETE')
      assert.equal(cookiesCleared, true)
      assert.equal(revocationCompleted, false)
      assert.ok(typeof message === 'string' && message.trim().length > 0)
      const expired = (await response.headersArray()).filter(({ name }) => name.toLowerCase() === 'set-cookie')
      for (const { name } of cookies) {
        assert.ok(expired.some(({ value }) => value.startsWith(`${name}=`) && /expires=Thu, 01 Jan 1970/i.test(value)))
      }

      await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('logout') === 'partial')
      await assertLogoutWarning(page, 'Đã xóa cookie đăng nhập')
      assert.deepEqual(await browserAuthCookies(page.context()), [])
      assert.deepEqual(await page.evaluate(() => [
        sessionStorage.getItem('cloud-bookstore.csrf-token'),
        sessionStorage.getItem('cloud-bookstore.user-info'),
      ]), [null, null])
      assert.equal(revocationCount(staff.email), 1)
      await capture(page, screenshot)
    }
  } finally {
    execFileSync('docker', ['start', container], { stdio: 'pipe', timeout: 60_000 })
    await waitForBackendReadiness()
  }

  expectStatus(await guardClient.get(sessionUrl), 200)

  for (const { page, staff, cookies } of sessions) {
    await page.reload()
    await page.getByRole('status').filter({ hasText: 'Đã xóa cookie đăng nhập' }).waitFor()
    await page.goto('/dashboard')
    await page.waitForURL((url) => url.pathname === '/login')

    const replay = await client(testCase)
    const cookieHeader = cookies.map(({ name, value }) => `${name}=${value}`).join('; ')
    expectStatus(await replay.get(sessionUrl, { headers: { Cookie: cookieHeader } }), 401)
    await signIn(page, testCase, staff)
  }
})

test('logout distinguishes unconfirmed cookie removal from a complete sign-out', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const logoutUrl = `${stack.beUrl}${logoutPath}`
  const signOutButton = page.getByRole('button', { name: 'Đăng xuất', exact: true })
  await page.route(logoutUrl, (route) => route.abort())
  await signOutButton.click()
  await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('logout') === 'incomplete')
  await assertLogoutWarning(page, 'Không thể xác nhận đã đăng xuất')
  assert.equal((await browserAuthCookies(page.context())).length, 2)
  await capture(page, '03-degraded-logout-incomplete-desktop')

  const cleanPage = await openPage(testCase)
  await signIn(cleanPage, testCase, staff)
  const complete = responseFor(cleanPage, 'POST', logoutPath)
  await cleanPage.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  const response = await complete
  assert.equal(response.status(), 204)
  const expired = await response.headerValues('set-cookie')
  for (const name of ['cloudbook_access', 'cloudbook_refresh']) {
    assert.ok(expired.some((value) => value.startsWith(`${name}=`) && /expires=Thu, 01 Jan 1970/i.test(value)))
  }
  await cleanPage.waitForURL('**/login')
  assert.equal(await cleanPage.getByRole('status').count(), 0)
  assert.deepEqual(await browserAuthCookies(cleanPage.context()), [])
  await capture(cleanPage, '04-normal-logout-desktop')
})

const maximumDtoPassword = `A1!${'x'.repeat(509)}`
const oversizedDtoPassword = `${maximumDtoPassword}x`

async function assertDtoPasswordLimit(send, member) {
  const atLimit = await send(maximumDtoPassword)
  expectStatus(atLimit, 400)
  assert.match((await atLimit.json()).message, /^Password must be 12 to 128 characters/)

  const aboveLimit = await send(oversizedDtoPassword)
  expectStatus(aboveLimit, 400)
  assert.match(aboveLimit.headers()['content-type'], /^application\/problem\+json\b/)
  const { errors } = await aboveLimit.json()
  assert.deepEqual(Object.keys(errors), [member])
  assert.equal(errors[member].length, 1)
  assert.match(errors[member][0], /maximum length of '512'/)
}

test('AUTH-003 register enforces the password DTO limit before service validation', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee()
  await assertDtoPasswordLimit((password) => guest.post(`${auth}/register`, { data: { ...staff, password } }), 'Password')
  assert.equal(employeeRow(staff.email), null)
  expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
})

test('AUTH-004 change password enforces the new password DTO limit with valid cookies and CSRF', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const send = (password) => context.post(`${auth}/change-password`, {
    headers: session.headers, data: { currentPassword: originalPassword, newPassword: password },
  })
  await assertDtoPasswordLimit(send, 'NewPassword')
  expectStatus(await send(newPassword), 204)
})

test('AUTH-004 password reset enforces the new password DTO limit without consuming a valid link', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  expectStatus(await guest.post(`${auth}/password-reset-requests`, { data: { email: staff.email } }), 204)
  const { token } = await requireMailLink(staff.email, '/reset-password')
  const send = (password) => guest.post(`${auth}/password-resets`, { data: { token, newPassword: password } })
  await assertDtoPasswordLimit(send, 'NewPassword')
  expectStatus(await send(newPassword), 204)
})

test('a protected reload during a session outage can retry without signing in again', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  await page.goto('/profile')
  await profileName(page).waitFor()

  const storageSnapshot = () => page.evaluate(() => ({
    csrf: sessionStorage.getItem('cloud-bookstore.csrf-token'),
    user: sessionStorage.getItem('cloud-bookstore.user-info'),
  }))
  const authCookies = async () => (await page.context().cookies(`${stack.beUrl}${auth}/session`))
    .filter(({ name }) => name === 'cloudbook_access' || name === 'cloudbook_refresh')
  const stored = await storageSnapshot()
  const cookies = await authCookies()
  assert.ok(stored.csrf)
  assert.equal(JSON.parse(stored.user).email, staff.email)
  assert.equal(cookies.length, 2)

  const sessionPath = `${auth}/session`
  let unavailable = true
  let loginRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `${auth}/login`) loginRequests++
  })
  await page.route(`${stack.beUrl}${sessionPath}`, (route) =>
    unavailable && route.request().method() === 'GET'
      ? route.fulfill({ status: 503, json: { message: 'Token state is temporarily unavailable.' } })
      : route.fallback())

  const failed = responseFor(page, 'GET', sessionPath)
  await page.reload()
  assert.equal((await failed).status(), 503)
  const retry = page.getByRole('button', { name: 'Thử lại', exact: true })
  await retry.waitFor()
  assert.equal(new URL(page.url()).pathname, '/profile')
  assert.equal(await profileName(page).count(), 0)
  assert.deepEqual(await storageSnapshot(), stored)
  assert.deepEqual(await authCookies(), cookies)
  await capture(page, 'profile-session-unavailable')

  unavailable = false
  const recovered = responseFor(page, 'GET', sessionPath)
  await retry.click()
  assert.equal((await recovered).status(), 200)
  await profileName(page).waitFor()
  assert.equal(new URL(page.url()).pathname, '/profile')
  assert.deepEqual(await authCookies(), cookies)
  assert.equal(loginRequests, 0)
})

test('AC6 /profile reports a failed bulk sign-out and can retry without ending the current session', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const otherPage = await openPage(testCase)
  await signIn(otherPage, testCase, staff)

  for (const sessionPage of [page, otherPage]) {
    await sessionPage.goto('/profile')
    await sessionPage.getByText('Phiên này', { exact: true }).waitFor()
  }

  const revokePath = `${auth}/sessions/revoke-others`
  const revokeUrl = `${stack.beUrl}${revokePath}`
  const sessionUrl = `${stack.beUrl}${auth}/session`
  await page.route(revokeUrl, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 503,
      headers: { 'access-control-allow-origin': stack.feUrl, 'access-control-allow-credentials': 'true' },
      json: { title: 'Service unavailable' },
    })
  })

  const revoke = page.getByRole('button', { name: 'Đăng xuất tất cả thiết bị khác', exact: true })
  const error = page.getByRole('alert').filter({ hasText: 'Không thể đăng xuất các thiết bị khác.' })
  const failed = responseFor(page, 'POST', revokePath)
  await revoke.click()
  expectStatus(await failed, 503)
  await error.waitFor({ state: 'visible' })
  const sessions = page.getByRole('table', { name: 'Danh sách phiên đăng nhập' })
  assert.equal(await sessions.getByText('Đang hoạt động', { exact: true }).count(), 2)
  expectStatus(await page.context().request.get(sessionUrl), 200)
  expectStatus(await otherPage.context().request.get(sessionUrl), 200)

  await page.unroute(revokeUrl)
  const retried = responseFor(page, 'POST', revokePath)
  await revoke.click()
  expectStatus(await retried, 200)
  await error.waitFor({ state: 'hidden' })
  await sessions.getByText('Đã đăng xuất', { exact: true }).waitFor()
  assert.equal(await sessions.getByText('Đang hoạt động', { exact: true }).count(), 1)
  expectStatus(await page.context().request.get(sessionUrl), 200)
  expectStatus(await otherPage.context().request.get(sessionUrl), 401)
})

test('AC5 /profile renders a skeleton during the real profile request', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const network = await page.context().newCDPSession(page)
  await network.send('Network.enable')
  await network.send('Network.emulateNetworkConditionsByRule', {
    offline: false,
    matchedNetworkConditions: [{
      urlPattern: profileUrl,
      latency: 1800,
      downloadThroughput: -1,
      uploadThroughput: -1,
    }],
  })

  const profileRequest = page.waitForRequest((request) => request.method() === 'GET' && request.url() === profileUrl)
  const profileResponse = responseFor(page, 'GET', profilePath)
  await page.goto('/profile', { waitUntil: 'commit' })
  await profileRequest
  const skeleton = page.locator('main').locator('[aria-busy="true"], [role="progressbar"], .animate-pulse').first()
  await skeleton.waitFor({ state: 'visible', timeout: 1200 })
  assert.equal(await profileName(page).count(), 0, 'Do not render blank or fabricated profile values while loading')
  expectStatus(await profileResponse, 200)
  assert.equal(await profileName(page).inputValue(), staff.fullName)
})

test('AC5 /profile retries a real profile request after a network failure', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const network = await page.context().newCDPSession(page)
  await network.send('Network.enable')
  await network.send('Network.setBlockedURLs', { urls: [profileUrl] })
  await page.goto('/profile')

  const retry = page.getByRole('button', { name: 'Thử lại', exact: true })
  await retry.waitFor()
  assert.equal(await profileName(page).count(), 0)
  await capture(page, '03-profile-load-error')
  await network.send('Network.setBlockedURLs', { urls: [] })
  const response = responseFor(page, 'GET', profilePath)
  await retry.click()
  expectStatus(await response, 200)
  assert.equal(await profileName(page).inputValue(), staff.fullName)
})

test('AC5 /profile retains valid edits when the save cannot reach the network', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  await page.goto('/profile')
  const phone = page.getByLabel('Số điện thoại', { exact: true })
  const editedName = 'Unsaved Auth Verification Staff'
  const editedPhone = '0980000038'
  await profileName(page).fill(editedName)
  await phone.fill(editedPhone)
  const network = await page.context().newCDPSession(page)
  await network.send('Network.enable')
  await network.send('Network.setBlockedURLs', { urls: [profileUrl] })

  await page.getByTestId('profile-save-btn').click()
  await page.getByText(/không thể (cập nhật|lưu)|thử lại/i).filter({ visible: true }).first().waitFor()
  assert.equal(await profileName(page).inputValue(), editedName)
  assert.equal(await phone.inputValue(), editedPhone)
  assert.equal(await page.locator('header').getByText(staff.fullName, { exact: true }).count(), 1)
  await network.send('Network.setBlockedURLs', { urls: [] })
  await page.reload()
  assert.equal(await profileName(page).inputValue(), staff.fullName)
  assert.equal(await phone.inputValue(), staff.phone)
})

test('AC5 /profile keeps the original avatar after a failed cloud upload', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const profile = responseFor(page, 'GET', profilePath)
  await page.goto('/profile')
  const response = await profile
  expectStatus(response, 200)
  const initial = await response.json()
  await profileName(page).waitFor()
  const main = page.locator('main')
  const avatarSources = () => main.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  const originalImages = await avatarSources()
  const network = await page.context().newCDPSession(page)
  await network.send('Network.enable')
  await network.send('Network.setBlockedURLs', { urls: ['https://api.cloudinary.com/*'] })

  const browserUpload = page.waitForEvent('requestfailed', (request) => new URL(request.url()).hostname === 'api.cloudinary.com')
  const intent = responseFor(page, 'POST', '/api/uploads/signature')
  const profileWrites = []
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url() === `${profileUrl}/avatar`) profileWrites.push(request.url())
  })
  await main.locator('input[type=file]').setInputFiles(picture)
  expectStatus(await intent, 200)
  await browserUpload
  await page.getByText(/không thể (tải|cập nhật).*ảnh|tải ảnh.*thất bại/i).filter({ visible: true }).first().waitFor()
  assert.deepEqual(await avatarSources(), originalImages)
  assert.deepEqual(profileWrites, [], 'Do not submit an avatar receipt when the upload fails')
  const profileAfterFailure = responseFor(page, 'GET', profilePath)
  await page.reload()
  assert.equal((await (await profileAfterFailure).json()).avatarUrl, initial.avatarUrl)
  assert.equal(await profileName(page).inputValue(), staff.fullName)
})

test('AC7 mobile primary auth controls have at least a 44 x 44 touch target', async (testCase) => {
  const page = await openPage(testCase, mobile)
  const selectors = [
    ['/login', 'auth-login-submit'],
    ['/register', 'auth-register-submit'],
    ['/forgot-password', 'auth-forgot-submit'],
  ]
  const dimensions = []
  async function measure(testId) {
    const button = page.getByTestId(testId)
    await button.waitFor()
    const bounds = await button.boundingBox()
    assert.ok(bounds, `${testId} has no bounding box`)
    if (bounds.width < 44 || bounds.height < 44) dimensions.push(`${testId}: ${bounds.width} x ${bounds.height}`)
  }
  for (const [path, testId] of selectors) {
    await page.goto(path)
    await measure(testId)
  }
  await signIn(page, testCase)
  await page.goto('/change-password')
  await measure('auth-first-change-submit')
  await page.goto('/profile')
  await measure('profile-save-btn')
  await measure('profile-change-password-btn')
  assert.deepEqual(dimensions, [], 'Undersized touch targets')
})

function formField(body, name) {
  const match = body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r\\n]+)`))
  assert.ok(match, `Missing multipart field ${name}`)
  return match[1]
}

test('AC2 expired verification JWT scrubs token, leaves account PENDING_OTP, and recovers via resend', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee()
  expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
  const original = await requireMailLink(staff.email, '/verify-register')

  const [rawHeader, rawPayload, rawSig] = original.token.split('.')
  const expectedSig = createHmac('sha256', verifyJwtSecret).update(`${rawHeader}.${rawPayload}`).digest('base64url')
  assert.equal(rawSig, expectedSig, 'Verification JWT signature matches isolated verify secret')
  const claims = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8'))
  const pastExp = Math.floor(Date.now() / 1000) - 300
  const expiredPayload = Buffer.from(JSON.stringify({
    ...claims,
    nbf: pastExp - 600,
    iat: pastExp - 600,
    exp: pastExp,
  })).toString('base64url')
  const expiredSig = createHmac('sha256', verifyJwtSecret).update(`${rawHeader}.${expiredPayload}`).digest('base64url')
  const expiredToken = `${rawHeader}.${expiredPayload}.${expiredSig}`

  const page = await openPage(testCase)
  const rejectedVerify = responseFor(page, 'POST', `${auth}/verify`)
  await page.goto(`/verify-register?token=${encodeURIComponent(expiredToken)}`)
  const verifyRes = await rejectedVerify
  assert.ok([400, 401].includes(verifyRes.status()), `Expected 400/401 for expired JWT, got ${verifyRes.status()}`)
  await page.waitForURL((url) => url.pathname === '/verify-register' && url.search === '')
  assert.equal(new URL(page.url()).search, '')
  assert.equal(employeeRow(staff.email).Status, 'PENDING_OTP')

  const emailInput = page.getByRole('textbox', { name: /email/i })
  await emailInput.fill(staff.email)
  const resendResponse = responseFor(page, 'POST', `${auth}/verification-resends`)
  await page.getByRole('button', { name: /gửi lại/i }).click()
  const resend = await resendResponse
  assert.ok(resend.ok(), `Resend failed with HTTP ${resend.status()}`)

  const replacement = await requireMailLink(staff.email, '/verify-register', { exclude: [original.id] })
  const acceptedVerify = responseFor(page, 'POST', `${auth}/verify`)
  await page.goto(replacement.url)
  expectStatus(await acceptedVerify, 204)
  await page.waitForURL((url) => url.pathname === '/verify-register' && url.search === '')
  await page.getByRole('heading', { name: /xác minh thành công/i }).waitFor()
  assert.equal(employeeRow(staff.email).Status, 'ACTIVE')

  await page.getByRole('link', { name: /đăng nhập ngay/i }).or(page.getByRole('button', { name: /đăng nhập ngay/i })).click()
  await page.waitForURL('**/login?activated=1')
  await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
  await page.getByTestId('auth-login-submit').click()
  await page.waitForURL('**/dashboard')
})

async function assertRenderedAvatar(avatar, avatarUrl) {
  await avatar.waitFor({ state: 'visible' })
  await avatar.evaluate((image) => image.decode())
  assert.equal(await avatar.getAttribute('src'), avatarUrl)
  assert.ok(await avatar.evaluate((image) => image.complete && image.naturalWidth > 0))
}

test('AC5 /profile signed Cloudinary avatar upload updates Header immediately, persists on reload, and audits', async (testCase) => {
  const page = await openPage(testCase)
  const staff = await signIn(page, testCase)
  const staffRow = employeeRow(staff.email)

  await page.route('https://api.cloudinary.com/**', async (route) => {
    const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
    const publicId = formField(body, 'public_id')
    const version = Number(formField(body, 'timestamp'))
    const signature = createHash('sha1').update(`public_id=${publicId}&version=${version}${cloudinaryApiSecret}`).digest('hex')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        public_id: publicId,
        version,
        signature,
        asset_id: `verify-${randomUUID()}`,
        format: 'png',
        bytes: picture.buffer.length,
        secure_url: `https://res.cloudinary.com/verify-cloud/image/upload/v${version}/${publicId}.png`,
      }),
    })
  })
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: picture.buffer,
  }))

  const profileLoad = responseFor(page, 'GET', profilePath)
  await page.goto('/profile')
  expectStatus(await profileLoad, 200)
  await profileName(page).waitFor()

  const intent = responseFor(page, 'POST', '/api/uploads/signature')
  const avatarPut = responseFor(page, 'PUT', `${profilePath}/avatar`)
  await page.locator('main input[type=file]').setInputFiles(picture)
  expectStatus(await intent, 200)
  const putRes = await avatarPut
  expectStatus(putRes, 200)
  const updatedProfile = await putRes.json()
  assert.ok(updatedProfile.avatarUrl, 'PUT /api/auth/profile/avatar returns persisted avatarUrl')

  const persistedImage = `img[src=${JSON.stringify(updatedProfile.avatarUrl)}]`
  const headerAvatar = page.locator(`header ${persistedImage}`)
  const profileAvatar = page.locator(`main ${persistedImage}`)
  await assertRenderedAvatar(headerAvatar, updatedProfile.avatarUrl)
  await assertRenderedAvatar(profileAvatar, updatedProfile.avatarUrl)

  const reloadedProfile = responseFor(page, 'GET', profilePath)
  await page.reload()
  expectStatus(await reloadedProfile, 200)
  await assertRenderedAvatar(headerAvatar, updatedProfile.avatarUrl)
  await assertRenderedAvatar(profileAvatar, updatedProfile.avatarUrl)
  assert.equal(employeeRow(staff.email).AvatarUrl, updatedProfile.avatarUrl)

  const events = auditRows(staffRow.Id, 'UPDATE_PROFILE_AVATAR')
  assert.equal(events.length, 1, 'Exactly one UPDATE_PROFILE_AVATAR audit log row')
  assert.equal(events[0].EntityType, 'Employee')
})

for (const [size, viewport] of [['mobile', mobile], ['tablet', tablet]]) {
  test(`AC5-7 /profile wraps long email cleanly without clipping on ${size}`, async (testCase) => {
    const longEmail = `nhan.vien.kiem.thu.ho.so.dia.chi.email.rat.dai.${randomUUID().slice(0, 8)}@cloud.bookstore.io`
    const guest = await client(testCase)
    const staff = employee({ email: longEmail })
    expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
    const { token } = await requireMailLink(staff.email, '/verify-register')
    expectStatus(await guest.post(`${auth}/verify`, { data: { token } }), 204)

    const page = await openPage(testCase, viewport)
    await page.goto('/login')
    await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
    await page.getByTestId('auth-login-submit').click()
    await page.waitForURL('**/dashboard')

    const profileRes = responseFor(page, 'GET', profilePath)
    await page.goto('/profile')
    expectStatus(await profileRes, 200)
    await profileName(page).waitFor()
    await page.getByText('Phiên này', { exact: true }).first().waitFor()

    const emailDisplay = page.locator('[aria-labelledby="profile-email-label"] [role="textbox"]')
    await emailDisplay.waitFor({ state: 'visible' })
    assert.equal((await emailDisplay.innerText()).trim(), longEmail)
    const metrics = await emailDisplay.evaluate((el) => ({
      elScrollWidth: el.scrollWidth,
      elClientWidth: el.clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
    }))
    assert.ok(metrics.elScrollWidth <= metrics.elClientWidth, `Long email clipped on ${size}: ${JSON.stringify(metrics)}`)
    assert.ok(metrics.docScrollWidth <= metrics.docClientWidth, `Viewport overflow on ${size}: ${JSON.stringify(metrics)}`)
    await capture(page, `03-profile-${size}`)
  })
}
