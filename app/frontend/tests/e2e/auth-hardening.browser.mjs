import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import {
  auth, chromium, client, createActiveEmployee, employee, expectStatus, login, newPassword,
  originalPassword, passwordFaults, requireMailLink, stack,
} from './auth-fixture.mjs'

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}
const screenshots = process.env.AUTH_SCREENSHOTS_DIR
let browser

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
})
after(() => browser?.close())

async function openPage(testCase, viewport = viewports.desktop) {
  const context = await browser.newContext({ viewport, baseURL: stack.feUrl, hasTouch: viewport.width < 768 })
  const page = await context.newPage()
  page.setDefaultTimeout(4000)
  const pageErrors = []
  const consoleErrors = []
  const failedResponses = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/^Failed to load resource: the server responded with a status of (?:400|401|403|409)\b/.test(message.text())) {
      consoleErrors.push(message.text())
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 500) failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`)
  })
  testCase.after(async () => {
    await context.close()
    assert.deepEqual(pageErrors, [], 'Uncaught browser errors')
    assert.deepEqual(consoleErrors, [], 'Unexpected browser console errors')
    assert.deepEqual(failedResponses, [], 'HTTP 5xx responses')
  })
  return page
}

async function checkVisual(page, name) {
  const geometry = await page.evaluate(async () => {
    await document.fonts.ready
    const visibleImages = Array.from(document.images).filter((image) => image.getClientRects().length && image.currentSrc)
    await Promise.allSettled(visibleImages.map((image) => image.decode()))
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      brokenImages: visibleImages.filter((image) => !image.complete || image.naturalWidth === 0).length,
    }
  })
  assert.ok(geometry.scrollWidth <= geometry.clientWidth, `Viewport overflows horizontally: ${JSON.stringify(geometry)}`)
  assert.equal(geometry.brokenImages, 0)
  assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:undefined|NaN|SCR-[\w-]+|MOD-[\w-]+|DRAWER-[\w-]+)\b|\[object Object\]/)
  if (screenshots) {
    mkdirSync(screenshots, { recursive: true })
    await page.screenshot({ path: join(screenshots, `${name}.png`), fullPage: true, animations: 'disabled' })
  }
}

function responseFor(page, path, method) {
  return page.waitForResponse((response) => new URL(response.url()).pathname === path && response.request().method() === method,
    { timeout: 5000 })
}

async function signIn(page, staff) {
  await page.goto('/login')
  await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
  await page.getByTestId('auth-login-submit').click()
  await page.waitForURL('**/dashboard')
}

async function fillRegistration(page, staff) {
  await page.getByLabel('Họ và tên', { exact: true }).fill(staff.fullName)
  await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
  await page.getByLabel('Số điện thoại', { exact: true }).fill(staff.phone)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(staff.password)
}

async function fillChangePassword(scope, current = originalPassword, next = newPassword) {
  await scope.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(current)
  await scope.getByLabel('Mật khẩu mới', { exact: true }).fill(next)
  await scope.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(next)
}

async function expectLocalValidation(page, invalidInput) {
  const validity = await invalidInput.evaluate((input) => ({
    ariaInvalid: input.getAttribute('aria-invalid'),
    nativeValid: input.validity.valid,
  }))
  if (validity.ariaInvalid === 'true' || !validity.nativeValid) {
    const message = await invalidInput.evaluate((input) => {
      const ids = input.getAttribute('aria-describedby')?.split(/\s+/) ?? []
      return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ') || input.validationMessage
    })
    if (/[à-ỹ]/i.test(message)) return
  }
  const alert = page.getByRole('alert').filter({ hasText: /[à-ỹ]/i }).first()
  await alert.waitFor({ state: 'visible' })
}

for (const [size, viewport] of Object.entries(viewports)) {
  test(`AC7 login layout has no overflow at ${size} and works with keyboard`, async (testCase) => {
    const page = await openPage(testCase, viewport)
    await page.goto('/login')
    const loginButton = page.getByRole('button', { name: 'Đăng nhập', exact: true })
    await loginButton.waitFor()
    await checkVisual(page, `01-login-${size}`)
    const email = page.getByLabel('Email nội bộ', { exact: true })
    await email.focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.getByLabel('Mật khẩu', { exact: true }).evaluate((input) => input === document.activeElement), true)
    if (size === 'mobile') {
      const box = await loginButton.boundingBox()
      assert.ok(box.width >= 44 && box.height >= 44)
    }
  })
}

test('AC3 login rejects an incorrect password with a Vietnamese banner below submit', async (testCase) => {
  const page = await openPage(testCase)
  await page.goto('/login')
  await page.getByLabel('Email nội bộ', { exact: true }).fill(stack.accounts.cashier.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('IncorrectBook3!')
  const submit = page.getByTestId('auth-login-submit')
  const rejected = responseFor(page, `${auth}/login`, 'POST')
  await submit.click()
  expectStatus(await rejected, 401)
  const banner = page.getByRole('alert').filter({ hasText: /[à-ỹ]/i }).first()
  await banner.waitFor()
  const [submitBox, bannerBox] = await Promise.all([submit.boundingBox(), banner.boundingBox()])
  assert.ok(bannerBox.y >= submitBox.y + submitBox.height, 'Error banner is below the login submit button')
})

for (const [fault, overrides, inputLabel] of [
  ['outside domain', { email: 'valid@example.org' }, 'Email nội bộ'],
  ['malformed address', { email: 'missing-at.cloud.io' }, 'Email nội bộ'],
  ...passwordFaults.map(([fault, password]) => [fault, { password }, 'Mật khẩu']),
]) {
  test(`AC1 registration UI isolates only ${fault} and preserves valid entries`, async (testCase) => {
    const page = await openPage(testCase)
    const staff = employee(overrides)
    const requests = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === `${auth}/register` && request.method() === 'POST') requests.push(request)
    })
    await page.goto('/register')
    await fillRegistration(page, staff)
    const invalid = page.getByLabel(inputLabel, { exact: true })
    if (fault === '129 characters' && await invalid.inputValue() === staff.password.slice(0, 128)) {
      assert.equal(await page.getByLabel('Xác nhận mật khẩu', { exact: true }).inputValue(), staff.password.slice(0, 128))
      assert.equal(requests.length, 0)
      return
    }
    const submit = page.getByTestId('auth-register-submit')
    if (await submit.isEnabled()) await submit.click()
    else await invalid.blur()
    await expectLocalValidation(page, invalid)
    assert.equal(requests.length, 0, 'Invalid values are rejected before the API call')
    assert.equal(await page.getByLabel('Họ và tên', { exact: true }).inputValue(), staff.fullName)
    assert.equal(await page.getByLabel('Số điện thoại', { exact: true }).inputValue(), staff.phone)
  })
}

test('AC1-2 registration and emailed verification scrub the URL and activate the account', async (testCase) => {
  const page = await openPage(testCase)
  const staff = employee()
  await page.goto('/register')
  await fillRegistration(page, staff)
  const register = responseFor(page, `${auth}/register`, 'POST')
  await page.getByTestId('auth-register-submit').click()
  expectStatus(await register, 201)
  await page.getByRole('heading', { name: /kiểm tra email/i }).waitFor()
  await checkVisual(page, '02-register-sent')
  const mail = await requireMailLink(staff.email, '/verify-register')
  const verify = responseFor(page, `${auth}/verify`, 'POST')
  await page.goto(mail.url)
  expectStatus(await verify, 204)
  await page.waitForURL((url) => url.pathname === '/verify-register' && url.search === '')
  await page.getByRole('heading', { name: /xác minh thành công/i }).waitFor()
  await checkVisual(page, '02-verify-success')
  await page.getByRole('link', { name: /đăng nhập ngay/i }).or(page.getByRole('button', { name: /đăng nhập ngay/i })).click()
  await page.waitForURL('**/login?activated=1')
  await signIn(page, staff)
})

for (const search of ['', '?token=invalid-verification-token']) {
  test(`AC2 ${search ? 'invalid' : 'missing'} verification token offers resend with strict validation`, async (testCase) => {
    const page = await openPage(testCase)
    await page.goto(`/verify-register${search}`)
    const email = page.getByRole('textbox', { name: /email/i })
    await email.fill('missing-at.cloud.io')
    const resend = page.getByRole('button', { name: /gửi lại/i })
    if (await resend.isEnabled()) await resend.click()
    else await email.blur()
    await expectLocalValidation(page, email)
    assert.equal(new URL(page.url()).search, '')
  })
}

test('AC3 forgot, resend, reset, and login banner complete the emailed journey', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const page = await openPage(testCase, viewports.mobile)
  await page.goto('/forgot-password')
  const email = page.getByRole('textbox', { name: /email/i })
  await email.fill('missing-at.cloud.io')
  const forgot = page.getByTestId('auth-forgot-submit')
  if (await forgot.isEnabled()) await forgot.click()
  else await email.blur()
  await expectLocalValidation(page, email)
  await email.fill(staff.email)
  await forgot.click()
  const original = await requireMailLink(staff.email, '/reset-password')
  await checkVisual(page, '06-forgot-confirmation')
  const resend = responseFor(page, `${auth}/password-reset-requests`, 'POST')
  await page.getByRole('button', { name: /gửi lại/i }).click()
  expectStatus(await resend, 204)
  await page.getByRole('status').filter({ hasText: /(?:gửi|email)/i }).waitFor()
  const { url } = await requireMailLink(staff.email, '/reset-password', { exclude: [original.id] })
  await page.goto(url)
  await page.waitForURL((location) => location.pathname === '/reset-password' && location.search === '')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(newPassword)
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(newPassword)
  await checkVisual(page, '06-reset-form')
  const reset = responseFor(page, `${auth}/password-resets`, 'POST')
  await page.getByTestId('auth-reset-submit').click()
  expectStatus(await reset, 204)
  await page.waitForURL('**/login?reset=1')
  await page.getByText(/(?:mật khẩu.*thành công|thành công.*mật khẩu)/i).first().waitFor()
  await checkVisual(page, '06-login-reset-banner')
  await signIn(page, { ...staff, password: newPassword })
})

test('AC3 failed reset offers an accessible link back to recovery', async (testCase) => {
  const page = await openPage(testCase)
  await page.goto('/reset-password')
  await page.getByTestId('auth-expired-resend').click()
  await page.waitForURL('**/forgot-password')
})

test('AC3 reset scrubs an emailed token before form submission', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  expectStatus(await guest.post(`${auth}/password-reset-requests`, { data: { email: staff.email } }), 204)
  const { url } = await requireMailLink(staff.email, '/reset-password')
  const page = await openPage(testCase)
  await page.goto(url)
  await page.getByTestId('auth-reset-submit').waitFor()
  await page.waitForURL((location) => location.pathname === '/reset-password' && location.search === '')
})

for (const route of ['/profile', '/change-password', '/first-change-password']) {
  test(`AC4-6 guest is redirected from ${route}`, async (testCase) => {
    const page = await openPage(testCase)
    await page.goto(route)
    await page.waitForURL((location) => location.pathname === '/login')
    await page.getByTestId('auth-login-submit').waitFor()
  })
}

for (const route of ['/change-password', '/first-change-password']) {
  test(`AC4 ${route} preserves fields on error and offers authenticated success navigation`, async (testCase) => {
    const staff = await createActiveEmployee(await client(testCase))
    const page = await openPage(testCase)
    await signIn(page, staff)
    await page.goto(route)
    await page.getByRole('heading', { name: 'Đổi mật khẩu tài khoản' }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /đổi mật khẩu lần đầu|mật khẩu tạm/i)
    const wrong = 'DifferentBook3!'
    await fillChangePassword(page, wrong)
    const bad = responseFor(page, `${auth}/change-password`, 'POST')
    await page.getByTestId('auth-first-change-submit').click()
    expectStatus(await bad, 400)
    await expectLocalValidation(page, page.getByLabel('Mật khẩu hiện tại', { exact: true }))
    assert.equal(await page.getByLabel('Mật khẩu hiện tại', { exact: true }).inputValue(), wrong)
    assert.equal(await page.getByLabel('Mật khẩu mới', { exact: true }).inputValue(), newPassword)
    if (route === '/change-password') await checkVisual(page, '05-change-form-error')
    await fillChangePassword(page)
    const good = responseFor(page, `${auth}/change-password`, 'POST')
    await page.getByTestId('auth-first-change-submit').click()
    expectStatus(await good, 204)
    for (const path of ['/profile', '/dashboard']) await page.locator(`main a[href="${path}"]`).first().waitFor()
    if (route === '/change-password') await checkVisual(page, '05-change-success')
  })
}

for (const [size, viewport] of Object.entries(viewports)) {
  test(`AC5-7 profile displays persisted identity without mock fields on ${size}`, async (testCase) => {
    const staff = await createActiveEmployee(await client(testCase))
    const page = await openPage(testCase, viewport)
    await signIn(page, staff)
    const response = responseFor(page, `${auth}/profile`, 'GET')
    await page.goto('/profile')
    expectStatus(await response, 200)
    await page.getByLabel('Họ và tên', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Họ và tên', { exact: true }).inputValue(), staff.fullName)
    assert.equal(await page.getByLabel('Số điện thoại', { exact: true }).inputValue(), staff.phone)
    const copy = await page.locator('main').innerText()
    assert.doesNotMatch(copy, /Tên đăng nhập|Cơ sở|Ca làm việc mặc định|Tùy chọn thông báo|NV-001|\b(?:2FA|OTP|IP)\b|\p{Emoji_Presentation}/u)
    await page.getByText('Phiên này', { exact: true }).first().waitFor()
    await checkVisual(page, `03-profile-${size}`)
  })
}

test('AC5 profile save updates the header and survives a full reload', async (testCase) => {
  const staff = await createActiveEmployee(await client(testCase))
  const page = await openPage(testCase)
  await signIn(page, staff)
  await page.goto('/profile')
  const name = 'Updated Browser Staff'
  await page.getByLabel('Họ và tên', { exact: true }).fill(name)
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0980000058')
  const save = responseFor(page, `${auth}/profile`, 'PUT')
  await page.getByTestId('profile-save-btn').click()
  expectStatus(await save, 200)
  await page.locator('header').getByText(name, { exact: true }).first().waitFor()
  await page.reload()
  assert.equal(await page.getByLabel('Họ và tên', { exact: true }).inputValue(), name)
  assert.equal(await page.getByLabel('Số điện thoại', { exact: true }).inputValue(), '0980000058')
})

test('AC4 password modal keeps edits on error and closes with success feedback', async (testCase) => {
  const staff = await createActiveEmployee(await client(testCase))
  const page = await openPage(testCase)
  await signIn(page, staff)
  await page.goto('/profile')
  await page.getByTestId('profile-change-password-btn').click()
  const dialog = page.getByRole('dialog', { name: 'Đổi mật khẩu tài khoản' }).and(page.getByTestId('change-password-modal'))
  await fillChangePassword(dialog, 'DifferentBook3!')
  const rejected = responseFor(page, `${auth}/change-password`, 'POST')
  const submit = dialog.getByRole('button', { name: /cập nhật|đổi mật khẩu/i })
  await submit.click()
  expectStatus(await rejected, 400)
  await expectLocalValidation(page, dialog.getByLabel('Mật khẩu hiện tại', { exact: true }))
  assert.equal(await dialog.getByLabel('Mật khẩu mới', { exact: true }).inputValue(), newPassword)
  await checkVisual(page, '04-change-modal-error')
  await fillChangePassword(dialog)
  const changed = responseFor(page, `${auth}/change-password`, 'POST')
  await submit.click()
  expectStatus(await changed, 204)
  await dialog.waitFor({ state: 'hidden' })
  await page.getByText(/(?:mật khẩu.*thành công|thành công.*mật khẩu)/i).first().waitFor()
  await checkVisual(page, '04-change-modal-success')
})

test('AC6 device modal revokes the selected session and preserves the current browser', async (testCase) => {
  const staff = await createActiveEmployee(await client(testCase))
  const other = await login(await client(testCase, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'), staff)
  const page = await openPage(testCase)
  await signIn(page, staff)
  const sessions = responseFor(page, `${auth}/sessions`, 'GET')
  await page.goto('/profile')
  const list = await sessions
  expectStatus(list, 200)
  const device = (await list.json()).find(({ isCurrent, deviceName }) => !isCurrent && /Firefox/i.test(deviceName))
  assert.ok(device)
  await page.getByTestId(`device-logout-btn-${device.id}`).click()
  const dialog = page.getByRole('dialog', { name: 'Đăng xuất khỏi thiết bị này?' }).and(page.getByTestId('logout-device-modal'))
  await dialog.waitFor()
  await checkVisual(page, '04-device-modal')
  const revoked = responseFor(page, `${auth}/sessions/${device.id}`, 'DELETE')
  await dialog.getByRole('button', { name: /đăng xuất/i }).click()
  expectStatus(await revoked, 204)
  await dialog.waitFor({ state: 'hidden' })
  expectStatus(await other.context.get(`${auth}/session`), 401)
  expectStatus(await page.context().request.get(`${stack.beUrl}${auth}/session`), 200)
})

test('AC6 profile bulk logout leaves only the current browser active', async (testCase) => {
  const staff = await createActiveEmployee(await client(testCase))
  const other = await login(await client(testCase), staff)
  const extra = await login(await client(testCase), staff)
  const page = await openPage(testCase)
  await signIn(page, staff)
  await page.goto('/profile')
  const pending = responseFor(page, `${auth}/sessions/revoke-others`, 'POST')
  await page.getByRole('button', { name: 'Đăng xuất tất cả thiết bị khác', exact: true }).click()
  const confirmation = page.getByRole('dialog').getByRole('button', { name: /đăng xuất/i })
  if (await confirmation.isVisible()) await confirmation.click()
  const revoked = await pending
  expectStatus(revoked, 200)
  assert.equal((await revoked.json()).revokedCount, 2)
  expectStatus(await other.context.get(`${auth}/session`), 401)
  expectStatus(await extra.context.get(`${auth}/session`), 401)
  expectStatus(await page.context().request.get(`${stack.beUrl}${auth}/session`), 200)
})
