import assert from 'node:assert/strict'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { auth, chromium, client, createActiveEmployee, expectStatus, stack } from './auth-fixture.mjs'

const profilePath = `${auth}/profile`
const profileUrl = `${stack.beUrl}${profilePath}`
const desktop = { width: 1440, height: 900 }
const mobile = { width: 390, height: 844 }
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

async function signIn(page, testCase) {
  const staff = await createActiveEmployee(await client(testCase))
  await page.goto('/login')
  await page.getByLabel('Email nội bộ', { exact: true }).fill(staff.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(staff.password)
  await page.getByTestId('auth-login-submit').click()
  await page.waitForURL('**/dashboard')
  return staff
}

async function capture(page, name) {
  if (!process.env.AUTH_SCREENSHOTS_DIR) return
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(process.env.AUTH_SCREENSHOTS_DIR, `${name}.png`), fullPage: true, animations: 'disabled' })
}

function responseFor(page, method, pathname) {
  return page.waitForResponse((response) => response.request().method() === method && new URL(response.url()).pathname === pathname)
}

function profileName(page) {
  return page.getByLabel('Họ và tên', { exact: true })
}

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
