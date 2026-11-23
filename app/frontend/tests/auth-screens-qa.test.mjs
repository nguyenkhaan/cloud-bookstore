import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

describe('AUTH screens QA single-fault isolation & entrypoint parity', { concurrency: false }, () => {
  let server
  let authApi
  let apiClient
  let strengthBar
  let passwordRules
  let authMock
  const requests = []
  let nextError = null

  before(async () => {
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })
    authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
    apiClient = await server.ssrLoadModule('/src/api/client.ts')
    strengthBar = await server.ssrLoadModule('/src/features/auth/components/PasswordStrengthBar.tsx')
    passwordRules = await server.ssrLoadModule('/src/features/auth/components/PasswordRules.tsx')
    authMock = await server.ssrLoadModule('/src/features/auth/auth.mock.ts')

    apiClient.publicClient.defaults.adapter = async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        withCredentials: config.withCredentials,
      })

      if (nextError) {
        const err = new Error(nextError.message)
        err.isAxiosError = true
        err.config = config
        err.response = {
          config,
          status: nextError.status,
          statusText: 'Error',
          headers: {},
          data: { message: nextError.message },
        }
        nextError = null
        throw err
      }

      return {
        config,
        data: undefined,
        headers: {},
        status: 204,
        statusText: 'No Content',
      }
    }
  })

  beforeEach(() => {
    requests.length = 0
    nextError = null
  })

  after(async () => {
    await server?.close()
  })

  test('single-fault isolation on 12-128 char password rules and strength meter', () => {
    // 1. Only length below minimum (11 chars, has upper, digit, special)
    const len11 = ['MayBook', '202', '!'].join('')
    assert.equal(len11.length, 11)
    assert.equal(passwordRules.isPasswordAcceptable(len11), false)
    assert.deepEqual(passwordRules.getPasswordChecks(len11), {
      length: false,
      upper: true,
      digit: true,
      special: true,
    })
    assert.ok(strengthBar.evaluatePasswordStrength(len11).score < 4)

    // 2. Only uppercase missing (12+ chars, lower, digit, special)
    const noUpper = ['maybook', '2026', '!'].join('')
    assert.equal(noUpper.length, 12)
    assert.equal(passwordRules.isPasswordAcceptable(noUpper), false)
    assert.deepEqual(passwordRules.getPasswordChecks(noUpper), {
      length: true,
      upper: false,
      digit: true,
      special: true,
    })
    assert.ok(strengthBar.evaluatePasswordStrength(noUpper).score < 4)

    // 3. Only digit missing (12+ chars, upper, lower, special)
    const noDigit = ['MayBookStore', '!'].join('')
    assert.equal(noDigit.length, 13)
    assert.equal(passwordRules.isPasswordAcceptable(noDigit), false)
    assert.deepEqual(passwordRules.getPasswordChecks(noDigit), {
      length: true,
      upper: true,
      digit: false,
      special: true,
    })
    assert.ok(strengthBar.evaluatePasswordStrength(noDigit).score < 4)

    // 4. Only special char missing (12+ chars, upper, lower, digit)
    const noSpecial = ['MayBook', '2026', 'a'].join('')
    assert.equal(noSpecial.length, 12)
    assert.equal(passwordRules.isPasswordAcceptable(noSpecial), false)
    assert.deepEqual(passwordRules.getPasswordChecks(noSpecial), {
      length: true,
      upper: true,
      digit: true,
      special: false,
    })
    assert.ok(strengthBar.evaluatePasswordStrength(noSpecial).score < 4)

    // 5. Boundary 128 chars valid vs 129 chars invalid (only max-length violated)
    const max128 = `A1!${'x'.repeat(125)}`
    const over129 = `A1!${'x'.repeat(126)}`
    assert.equal(max128.length, 128)
    assert.equal(over129.length, 129)
    assert.equal(passwordRules.isPasswordAcceptable(max128), true)
    assert.equal(passwordRules.isPasswordAcceptable(over129), false)
  })

  test('auth.service covers password reset request, reset submit, and verify entrypoints', async () => {
    await authApi.requestPasswordReset({ email: 'nv.phong@nhasachmay.vn' })
    await authApi.resetPassword({ token: 'reset-tok-1234', newPassword: ['MayBook', '2026', '!'].join('') })
    await authApi.verify({ token: 'verify-tok-1234' })

    assert.deepEqual(requests, [
      {
        method: 'post',
        url: '/auth/password-reset-requests',
        data: { email: 'nv.phong@nhasachmay.vn' },
        withCredentials: true,
      },
      {
        method: 'post',
        url: '/auth/password-resets',
        data: { token: 'reset-tok-1234', newPassword: ['MayBook', '2026', '!'].join('') },
        withCredentials: true,
      },
      {
        method: 'post',
        url: '/auth/verify',
        data: { token: 'verify-tok-1234' },
        withCredentials: true,
      },
    ])
  })

  test('auth.service preserves 401/409 ApiError status for resetPassword and register failures', async () => {
    nextError = { status: 401, message: 'Token expired' }
    await assert.rejects(
      authApi.resetPassword({ token: 'expired', newPassword: ['MayBook', '2026', '!'].join('') }),
      (error) => error.name === 'ApiError' && error.status === 401,
    )

    nextError = { status: 409, message: 'Email already registered' }
    await assert.rejects(
      authApi.register({
        email: 'nv.phong@nhasachmay.vn',
        fullName: 'Nguyễn Minh Phong',
        phone: '0903123456',
        password: ['MayBook', '2026', '!'].join(''),
      }),
      (error) => error.name === 'ApiError' && error.status === 409,
    )
  })

  test('auth.mock provides deterministic role mappings, devices, and notification defaults', () => {
    assert.equal(authMock.getRoleBadgeLabel('ADMIN'), 'Quản trị viên (Admin)')
    assert.equal(authMock.getRoleBadgeLabel('CASHIER'), 'Thu ngân (Cashier)')
    assert.equal(authMock.getRoleBadgeLabel('INVENTORY_MANAGER'), 'Quản lý kho (Inventory)')
    assert.equal(authMock.getRoleBadgeLabel(undefined, 'Khách'), 'Khách')
    assert.equal(authMock.getRoleBadgeLabel(undefined), 'Người dùng nội bộ')

    assert.equal(authMock.getRolePermissionLabel('ADMIN'), 'Quản trị viên (Toàn quyền)')
    assert.equal(authMock.getRolePermissionLabel('CASHIER'), 'Thu ngân (Quầy giao dịch)')
    assert.equal(authMock.getRolePermissionLabel('INVENTORY_MANAGER'), 'Quản lý kho (Kho & đầu sách)')
    assert.equal(authMock.getRolePermissionLabel(undefined), 'Người dùng nội bộ')

    const adminMock = authMock.getMockProfileForUser({
      id: '1',
      email: 'minhanh@nhasachmay.vn',
      name: 'Nguyễn Minh Anh',
      role: 'Quản trị viên',
      roleCode: 'ADMIN',
    })
    assert.equal(adminMock.username, 'admin_minhanh')
    assert.equal(adminMock.employeeCode, 'NV-001')

    assert.equal(authMock.INITIAL_MOCK_DEVICES.length, 3)
    assert.equal(authMock.INITIAL_MOCK_DEVICES.filter((d) => d.isCurrent).length, 1)
    assert.equal(authMock.INITIAL_MOCK_DEVICES.filter((d) => d.status === 'active').length, 2)
    assert.equal(authMock.INITIAL_MOCK_DEVICES.filter((d) => d.status === 'logged_out').length, 1)

    assert.deepEqual(authMock.INITIAL_MOCK_NOTIFICATION_PREFS, {
      systemSecurity: true,
      shiftAndPos: true,
      weeklyEmailDigest: false,
    })
  })
})
