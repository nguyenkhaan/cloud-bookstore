import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

const requests = []

let apiClient
let authApi
let activationPage
let failures
let loginPage
let onSessionExpiredCalls
let server

const responseData = {
  '/auth/login': { csrfToken: 'csrf-token' },
  '/auth/refresh': { csrfToken: 'refreshed-csrf-token' },
  '/auth/register': { email: 'reader@example.com', fullName: 'Reader' },
  '/auth/session': { csrfToken: 'session-csrf-token' },
}

function recordRequest(client) {
  return async (config) => {
    requests.push({
      authorization: config.headers?.get?.('Authorization'),
      client,
      csrfToken: config.headers?.get?.('X-CSRF-Token'),
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      method: config.method,
      url: config.url,
      withCredentials: config.withCredentials,
    })

    const failure = failures.shift()
    if (failure) {
      const error = new Error('Request failed')
      error.config = config
      error.isAxiosError = true
      if (failure.status !== undefined) {
        error.response = {
          config,
          data: { message: failure.message },
          headers: {},
          status: failure.status,
          statusText: 'Error',
        }
      }
      throw error
    }

    return {
      config,
      data: responseData[config.url],
      headers: {},
      status: 200,
      statusText: 'OK',
    }
  }
}

describe('auth service', { concurrency: false }, () => {
  before(async () => {
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })

    authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
    loginPage = await server.ssrLoadModule('/src/features/auth/pages/LoginPage.tsx')
    activationPage = await server.ssrLoadModule('/src/features/auth/pages/ActivateAccountPage.tsx')
    apiClient = await server.ssrLoadModule('/src/api/client.ts')
    apiClient.publicClient.defaults.adapter = recordRequest('public')
    apiClient.privateClient.defaults.adapter = recordRequest('private')
  })

  beforeEach(() => {
    requests.length = 0
    failures = []
    onSessionExpiredCalls = 0
    responseData['/auth/login'] = { csrfToken: 'csrf-token' }
    responseData['/auth/refresh'] = { csrfToken: 'refreshed-csrf-token' }
    responseData['/auth/session'] = { csrfToken: 'session-csrf-token' }
    apiClient.clearCsrfToken()
    apiClient.setSessionExpiredHandler(() => {
      onSessionExpiredCalls += 1
    })
  })

  after(async () => {
    await server?.close()
  })

  test('register exchanges the generated request and response at the auth endpoint', async () => {
    const request = {
      email: 'reader@example.com',
      fullName: 'Reader',
      password: 'password-123',
      phone: '0123456789',
    }

    const result = await authApi.register(request)

    assert.deepEqual(result, { email: 'reader@example.com', fullName: 'Reader' })
    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'public',
        csrfToken: undefined,
        data: request,
        method: 'post',
        url: '/auth/register',
        withCredentials: true,
      },
    ])
  })

  test('login accepts only an in-memory CSRF response and never reads a JWT', async () => {
    const request = { email: 'reader@example.com', password: 'password-123' }

    const result = await authApi.login(request)

    assert.deepEqual(result, { csrfToken: 'csrf-token' })
    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'public',
        csrfToken: undefined,
        data: request,
        method: 'post',
        url: '/auth/login',
        withCredentials: true,
      },
    ])
  })

  test('logout sends CSRF but never a refresh token request body', async () => {
    await authApi.login({ email: 'reader@example.com', password: 'password-123' })
    requests.length = 0

    await authApi.logout()

    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'public',
        csrfToken: 'csrf-token',
        data: undefined,
        method: 'post',
        url: '/auth/logout',
        withCredentials: true,
      },
    ])
  })

  test('session check sends cookies without an Authorization header', async () => {
    await authApi.getSession()

    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'private',
        csrfToken: undefined,
        data: undefined,
        method: 'get',
        url: '/auth/session',
        withCredentials: true,
      },
    ])
  })

  test('a 401 refreshes once and retries the original request with the new CSRF token', async () => {
    await authApi.login({ email: 'reader@example.com', password: 'password-123' })
    requests.length = 0
    failures = [{ status: 401, message: 'Expired access token' }]

    await authApi.getSession()

    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'private',
        csrfToken: undefined,
        data: undefined,
        method: 'get',
        url: '/auth/session',
        withCredentials: true,
      },
      {
        authorization: undefined,
        client: 'public',
        csrfToken: 'csrf-token',
        data: undefined,
        method: 'post',
        url: '/auth/refresh',
        withCredentials: true,
      },
      {
        authorization: undefined,
        client: 'private',
        csrfToken: undefined,
        data: undefined,
        method: 'get',
        url: '/auth/session',
        withCredentials: true,
      },
    ])
    assert.equal(onSessionExpiredCalls, 0)
  })

  test('failed refresh clears the memory-only session and does not retry recursively', async () => {
    await authApi.login({ email: 'reader@example.com', password: 'password-123' })
    requests.length = 0
    failures = [
      { status: 401, message: 'Expired access token' },
      { status: 401, message: 'Invalid refresh token' },
    ]

    await assert.rejects(authApi.getSession(), (error) => {
      assert.equal(error.constructor.name, 'ApiError')
      assert.equal(error.status, 401)
      return true
    })

    assert.equal(onSessionExpiredCalls, 1)
    assert.equal(requests.filter((request) => request.url === '/auth/refresh').length, 1)
    assert.equal(apiClient.getCsrfToken(), null)
  })

  test('HTTP failures keep the backend status and message in ApiError', async () => {
    failures = [{ status: 409, message: 'User has been registered' }]

    await assert.rejects(
      authApi.register({
        email: 'reader@example.com',
        fullName: 'Reader',
        password: 'password-123',
        phone: '0123456789',
      }),
      (error) => {
        assert.equal(error.constructor.name, 'ApiError')
        assert.equal(error.status, 409)
        assert.equal(error.message, 'User has been registered')
        return true
      },
    )
  })

  test('network failures use status zero in ApiError', async () => {
    failures = [{}]

    await assert.rejects(authApi.verify({ token: 'verify-token' }), (error) => {
      assert.equal(error.constructor.name, 'ApiError')
      assert.equal(error.status, 0)
      return true
    })
  })

  test('login rejects a malformed session response', async () => {
    responseData['/auth/login'] = { accessToken: 'must-not-be-accepted' }

    await assert.rejects(
      authApi.login({ email: 'reader@example.com', password: 'password-123' }),
      (error) => {
        assert.equal(error.constructor.name, 'ApiError')
        assert.equal(error.status, 502)
        return true
      },
    )
  })

  test('unknown errors use the common unexpected-error notice', () => {
    const expected = { tone: 'error', message: 'Có lỗi không mong muốn. Hãy thử lại sau.' }

    assert.deepEqual(loginPage.describeLoginError(new Error()), expected)
    assert.deepEqual(activationPage.describeRegisterError(new Error()), expected)
    assert.deepEqual(activationPage.describeVerifyError(new Error()), expected)
  })

  test('network API errors use the common connection notice', () => {
    const expected = { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }

    assert.deepEqual(loginPage.describeLoginError(new authApi.ApiError(0, '')), expected)
    assert.deepEqual(activationPage.describeRegisterError(new authApi.ApiError(0, '')), expected)
    assert.deepEqual(activationPage.describeVerifyError(new authApi.ApiError(0, '')), expected)
  })

  test('login errors distinguish invalid credentials and locked accounts', () => {
    assert.deepEqual(loginPage.describeLoginError(new authApi.ApiError(401, '')), {
      tone: 'warning',
      message: 'Email hoặc mật khẩu không đúng. Tài khoản sẽ bị tạm khóa nếu nhập sai quá nhiều lần.',
    })
    assert.deepEqual(loginPage.describeLoginError(new authApi.ApiError(403, 'Account locked')), {
      tone: 'error',
      message: 'Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.',
    })
    assert.deepEqual(loginPage.describeLoginError(new authApi.ApiError(403, '')), {
      tone: 'warning',
      message: 'Tài khoản chưa được kích hoạt hoặc không khả dụng. Hãy kích hoạt tài khoản hoặc liên hệ Quản trị viên.',
    })
  })

  test('register errors preserve their specific recovery guidance', () => {
    assert.deepEqual(activationPage.describeRegisterError(new authApi.ApiError(409, '')), {
      tone: 'error',
      message: 'Email này đã được đăng ký và kích hoạt. Hãy đăng nhập hoặc dùng Quên mật khẩu.',
    })
    assert.deepEqual(activationPage.describeRegisterError(new authApi.ApiError(400, 'Email domain is not allowed')), {
      tone: 'error',
      message: 'Email chưa được cấp quyền bởi Quản trị viên.',
    })
    assert.deepEqual(activationPage.describeRegisterError(new authApi.ApiError(400, 'Invalid email')), {
      tone: 'error',
      message: 'Email không hợp lệ.',
    })
    assert.deepEqual(activationPage.describeRegisterError(new authApi.ApiError(400, '')), {
      tone: 'error',
      message: 'Thông tin chưa hợp lệ. Hãy kiểm tra lại email, họ tên, số điện thoại và mật khẩu.',
    })
  })

  test('verification errors distinguish forbidden accounts from invalid links', () => {
    assert.deepEqual(activationPage.describeVerifyError(new authApi.ApiError(403, '')), {
      tone: 'error',
      message: 'Tài khoản này không thể kích hoạt. Hãy liên hệ Quản trị viên.',
    })
    assert.deepEqual(activationPage.describeVerifyError(new authApi.ApiError(400, '')), {
      tone: 'error',
      message: 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Hãy gửi lại liên kết mới.',
    })
  })
})
