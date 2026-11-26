import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

describe('AUTH screens QA single-fault isolation & entrypoint parity', { concurrency: false }, () => {
  let server
  let authApi
  let apiClient
  let strengthBar
  let passwordRules
  let roles
  const requests = []
  let nextError = null
  let nextData

  before(async () => {
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })
    authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
    apiClient = await server.ssrLoadModule('/src/api/client.ts')
    strengthBar = await server.ssrLoadModule('/src/features/auth/components/PasswordStrengthBar.tsx')
    passwordRules = await server.ssrLoadModule('/src/features/auth/components/PasswordRules.tsx')
    roles = await server.ssrLoadModule('/src/features/auth/role.ts')

    const adapter = async (config) => {
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
          data: nextError.data ?? { message: nextError.message },
        }
        nextError = null
        throw err
      }

      return {
        config,
        data: nextData,
        headers: {},
        status: 204,
        statusText: 'No Content',
      }
    }
    apiClient.publicClient.defaults.adapter = adapter
    apiClient.privateClient.defaults.adapter = adapter
  })

  beforeEach(() => {
    requests.length = 0
    nextError = null
    nextData = undefined
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

  test('registration submits directly to the public register endpoint', async () => {
    await authApi.register({ email: 'nv.phong@nhasachmay.vn', fullName: 'Nguyễn Minh Phong', phone: '0903123456', password: ['MayBook', '2026', '!'].join('') })
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [['post', '/auth/register']])
  })

  test('registration rejects domains outside the configured client allowlist', async () => {
    const registerPage = await server.ssrLoadModule('/src/features/auth/pages/RegisterPage.tsx')

    assert.equal(registerPage.isAllowedRegistrationEmail('staff@cloud.io'), true)
    assert.equal(registerPage.isAllowedRegistrationEmail('staff@cloud.bookstore.io'), true)
    assert.equal(registerPage.isAllowedRegistrationEmail('staff@example.org'), false)
    assert.equal(registerPage.isAllowedRegistrationEmail('staff@cloud.io.example.org'), false)
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

  test('auth service calls authenticated profile, password and device endpoints', async () => {
    const profile = { id: 'profile-id', fullName: 'Nguyễn Minh Phong', phone: '0903123456' }
    nextData = profile
    assert.equal(await authApi.getProfile(), profile)
    assert.equal(await authApi.updateProfile({ fullName: profile.fullName, phone: profile.phone }), profile)
    const receipt = { uploadIntentId: 'intent-id', publicId: 'avatars/id', signature: 'signature', version: 123 }
    assert.equal(await authApi.updateProfileAvatar(receipt), profile)
    await authApi.changePassword({ currentPassword: 'OldAccount1!', newPassword: 'NewAccount2!' })
    nextData = [{ id: 'device-id', isCurrent: false }]
    assert.deepEqual(await authApi.getSessions(), nextData)
    await authApi.revokeSession('device-id')
    nextData = { revokedCount: 2 }
    assert.deepEqual(await authApi.revokeOtherSessions(), { revokedCount: 2 })
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['get', '/auth/profile'], ['put', '/auth/profile'], ['put', '/auth/profile/avatar'],
      ['post', '/auth/change-password'], ['get', '/auth/sessions'],
      ['delete', '/auth/sessions/device-id'], ['post', '/auth/sessions/revoke-others'],
    ])
    assert.ok(requests.every(({ withCredentials }) => withCredentials))
  })

  test('auth service reads and localizes problem details without exposing unrelated errors', async () => {
    nextError = { status: 400, data: { detail: 'Current password is incorrect.' } }
    await assert.rejects(authApi.changePassword({ currentPassword: 'wrong', newPassword: 'NewAccount1!' }), (error) => {
      assert.equal(error.status, 400)
      assert.equal(authApi.localizeAuthError(error, 'Lỗi'), 'Mật khẩu hiện tại không chính xác.')
      return true
    })
    nextError = { status: 400, data: { errors: { Email: ['The Email field is not valid.'] } } }
    await assert.rejects(authApi.register({ email: 'bad', fullName: 'Nguyễn Minh Phong', phone: '0903123456', password: 'AccountPass1!' }),
      (error) => authApi.localizeAuthError(error, 'Lỗi') === 'Địa chỉ email không hợp lệ.')
  })

  test('role labels match canonical role identifiers without profile fixtures', () => {
    assert.equal(roles.getRoleBadgeLabel('ADMIN'), 'Quản trị viên (Admin)')
    assert.equal(roles.getRoleBadgeLabel('CASHIER'), 'Thu ngân (Cashier)')
    assert.equal(roles.getRoleBadgeLabel('INVENTORY_MANAGER'), 'Quản lý kho (Inventory)')
    assert.equal(roles.getRoleBadgeLabel(undefined, 'Khách'), 'Khách')
    assert.equal(roles.getRolePermissionLabel('ADMIN'), 'Quản trị viên (Toàn quyền)')
    assert.equal(roles.getRolePermissionLabel('CASHIER'), 'Thu ngân (Quầy giao dịch)')
    assert.equal(roles.getRolePermissionLabel('INVENTORY_MANAGER'), 'Quản lý kho (Kho & đầu sách)')
    assert.equal(roles.getRolePermissionLabel(undefined), 'Người dùng nội bộ')
  })
})
