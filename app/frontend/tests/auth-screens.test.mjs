import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSrc = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

describe('AUTH screens Figma implementation & contracts', { concurrency: false }, () => {
  let server
  let authApi
  let apiClient
  let strengthBar
  const requests = []

  before(async () => {
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })
    authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
    apiClient = await server.ssrLoadModule('/src/api/client.ts')
    strengthBar = await server.ssrLoadModule('/src/features/auth/components/PasswordStrengthBar.tsx')

    apiClient.publicClient.defaults.adapter = async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        withCredentials: config.withCredentials,
      })
      return {
        config,
        data: undefined,
        headers: {},
        status: 200,
        statusText: 'OK',
      }
    }
  })

  after(async () => {
    await server?.close()
  })

  test('AppRoutes declares all AUTH routes once with proper GuestOnly and RequireSession guards', () => {
    const routes = readSrc('routes', 'AppRoutes.tsx')

    const guestPaths = ['/login', '/register', '/verify-register', '/forgot-password', '/reset-password']
    const protectedPaths = ['/change-password', '/first-change-password', '/profile']

    for (const routePath of guestPaths) {
      const escaped = routePath.replace(/\//g, '\\/')
      assert.equal((routes.match(new RegExp(`path="${escaped}"`, 'g')) ?? []).length, 1, `expected ${routePath} once`)
      assert.match(routes, new RegExp(`path="${escaped}" element=\\{<GuestOnly>`), `expected ${routePath} guarded by GuestOnly`)
    }

    for (const routePath of protectedPaths) {
      const escaped = routePath.replace(/\//g, '\\/')
      assert.equal((routes.match(new RegExp(`path="${escaped}"`, 'g')) ?? []).length, 1, `expected ${routePath} once`)
      assert.match(routes, new RegExp(`path="${escaped}" element=\\{<RequireSession>`), `expected ${routePath} guarded by RequireSession`)
    }
  })

  test('auth.service.register posts RegisterRequest to /auth/register via publicClient', async () => {
    requests.length = 0
    const payload = {
      email: 'nv.phong@nhasachmay.vn',
      fullName: 'Nguyễn Minh Phong',
      phone: '0903123456',
      password: ['MayBook', '2026', '!@'].join(''),
    }

    await authApi.register(payload)

    assert.deepEqual(requests, [
      {
        method: 'post',
        url: '/auth/register',
        data: payload,
        withCredentials: true,
      },
    ])
  })

  test('evaluatePasswordStrength enforces 12-128 char policy aligned with PasswordRules', () => {
    assert.deepEqual(strengthBar.evaluatePasswordStrength(''), {
      score: 0,
      label: '',
      tone: 'neutral',
    })

    // 8-char password with upper/digit/special does NOT reach score 4 (fails 12-char minimum)
    const shortStrong = strengthBar.evaluatePasswordStrength(['Abcd', '123', '!'].join(''))
    assert.equal(shortStrong.score, 3)
    assert.equal(shortStrong.tone, 'info')

    // 12-char password meeting all 4 rules reaches score 4 ('Mạnh')
    const valid12 = strengthBar.evaluatePasswordStrength(['MayBook', '2026', '!'].join(''))
    assert.equal(valid12.score, 4)
    assert.equal(valid12.label, 'Mạnh')
    assert.equal(valid12.tone, 'success')

    // 16+ char password meeting all 4 rules reaches score 4 ('Rất mạnh')
    const valid16 = strengthBar.evaluatePasswordStrength(['MayBookStore', '2026', '!'].join(''))
    assert.equal(valid16.score, 4)
    assert.equal(valid16.label, 'Rất mạnh')
    assert.equal(valid16.tone, 'success')
  })

  test('Header links to /profile using React Router Link without raw anchor tags', () => {
    const header = readSrc('components', 'layout', 'Header', 'Header.tsx')
    assert.match(header, /from 'react-router-dom'/)
    assert.match(header, /<Link[\s\S]*data-testid="header-profile-link"[\s\S]*to="\/profile"/)
    assert.doesNotMatch(header, /<a\s/)
  })

  test('SCR-AUTH-01 enforces user decisions (no 30-day checkbox, straight split, Banner below submit)', () => {
    const loginSource = readSrc('features', 'auth', 'pages', 'LoginPage.tsx')
    const splitSource = readSrc('features', 'auth', 'components', 'SplitLayout.tsx')

    assert.doesNotMatch(loginSource, /Duy trì đăng nhập/i)
    assert.doesNotMatch(loginSource, /type="checkbox"/)
    assert.doesNotMatch(splitSource, /clip-path/)
    assert.doesNotMatch(splitSource, /new Date\(\)/)

    const submitIdx = loginSource.indexOf('data-testid="auth-login-submit"')
    const bannerIdx = loginSource.indexOf('{notice && <Banner')
    assert.ok(submitIdx > 0, 'login submit button must carry data-testid="auth-login-submit"')
    assert.ok(bannerIdx > submitIdx, 'error Banner must render below the login submit button')

    assert.match(loginSource, /data-testid="auth-forgot-link"/)
    assert.match(loginSource, /data-testid="auth-register-link"/)
  })

  test('SCR-AUTH-05 enforces user decisions (no 2FA/OTP row, no IP column, no top-right Save CTA, no emojis)', () => {
    const profileSource = readSrc('features', 'auth', 'pages', 'ProfileSecurityPage.tsx')
    const modalChangeSource = readSrc('features', 'auth', 'components', 'ChangePasswordModal.tsx')
    const modalLogoutSource = readSrc('features', 'auth', 'components', 'LogoutDeviceModal.tsx')

    assert.doesNotMatch(profileSource, /2FA|OTP|Xác thực hai bước/i)
    assert.doesNotMatch(profileSource, /Địa chỉ IP|192\.168\.|IP address/i)
    assert.doesNotMatch(profileSource, /actionButton=/)
    assert.doesNotMatch(profileSource, /(?:👁|🔒)/u)
    assert.doesNotMatch(modalChangeSource, /(?:👁|🔒)/u)

    assert.match(profileSource, /data-testid="profile-save-btn"/)
    assert.match(profileSource, /data-testid="profile-change-password-btn"/)
    assert.match(profileSource, /data-testid=\{`device-logout-btn-\$\{device\.id\}`\}/)
    assert.match(modalChangeSource, /data-testid="change-password-modal"/)
    assert.match(modalLogoutSource, /data-testid="logout-device-modal"/)
  })

  test('SCR-AUTH-03A/B/C/D and SCR-AUTH-04 carry required data-testid anchors and no hardcoded email', () => {
    const registerSource = readSrc('features', 'auth', 'pages', 'RegisterPage.tsx')
    const forgotSource = readSrc('features', 'auth', 'pages', 'ForgotPasswordPage.tsx')
    const resetSource = readSrc('features', 'auth', 'pages', 'ResetPasswordPage.tsx')
    const firstChangeSource = readSrc('features', 'auth', 'pages', 'FirstChangePasswordPage.tsx')

    assert.match(registerSource, /data-testid="auth-register-submit"/)
    assert.match(forgotSource, /data-testid="auth-forgot-submit"/)
    assert.match(resetSource, /data-testid="auth-reset-submit"/)
    assert.match(resetSource, /data-testid="auth-expired-resend"/)
    assert.match(firstChangeSource, /data-testid="auth-first-change-submit"/)

    assert.doesNotMatch(resetSource, /nv\.phong@nhasachmay\.vn/)
    assert.doesNotMatch(resetSource, /(?:👁|🔒)/u)
    assert.doesNotMatch(firstChangeSource, /(?:👁|🔒)/u)
  })
})
