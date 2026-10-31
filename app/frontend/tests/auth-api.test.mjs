import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

const requests = []

let apiClient
let authApi
let failures
let loginPage
let onSessionExpiredCalls
let server
let storageWriteFails = false

const csrfStorage = new Map()
const originalWindow = globalThis.window
const browserWindow = {
  sessionStorage: {
    getItem(key) {
      return csrfStorage.get(key) ?? null
    },
    removeItem(key) {
      csrfStorage.delete(key)
    },
    setItem(key, value) {
      if (storageWriteFails) throw new Error('Session storage unavailable')
      csrfStorage.set(key, value)
    },
  },
}

const responseData = {
  '/auth/login': { csrfToken: 'csrf-token' },
  '/auth/refresh': { csrfToken: 'refreshed-csrf-token' },
  '/auth/session': { csrfToken: 'session-csrf-token' },
  '/auth/verification-resends': undefined,
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
    globalThis.window = browserWindow
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })

    authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
    loginPage = await server.ssrLoadModule('/src/features/auth/pages/LoginPage.tsx')
    apiClient = await server.ssrLoadModule('/src/api/client.ts')
    apiClient.publicClient.defaults.adapter = recordRequest('public')
    apiClient.privateClient.defaults.adapter = recordRequest('private')
  })

  beforeEach(() => {
    requests.length = 0
    failures = []
    csrfStorage.clear()
    storageWriteFails = false
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
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  })

  test('resend verification sends only the recipient email to the privacy-safe endpoint', async () => {
    const request = { email: 'reader@example.com' }

    await authApi.resendVerification(request)

    assert.deepEqual(requests, [
      {
        authorization: undefined,
        client: 'public',
        csrfToken: undefined,
        data: request,
        method: 'post',
        url: '/auth/verification-resends',
        withCredentials: true,
      },
    ])
  })

  test('login keeps only CSRF and ignores temporary JWT response fields', async () => {
    const request = { email: 'reader@example.com', password: 'password-123' }
    responseData['/auth/login'] = {
      accessToken: 'manual-test-access-token',
      csrfToken: 'csrf-token',
      refreshToken: 'manual-test-refresh-token',
    }

    const result = await authApi.login(request)

    assert.deepEqual(result, { csrfToken: 'csrf-token' })
    assert.equal('accessToken' in result, false)
    assert.equal('refreshToken' in result, false)
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

  test('CSRF state is retained in session storage without retaining JWTs', () => {
    apiClient.setCsrfToken('csrf-token')

    assert.equal(csrfStorage.get('cloud-bookstore.csrf-token'), 'csrf-token')
    assert.equal(csrfStorage.has('accessToken'), false)
    assert.equal(csrfStorage.has('refreshToken'), false)

    apiClient.clearCsrfToken()

    assert.equal(csrfStorage.has('cloud-bookstore.csrf-token'), false)
  })

  test('a successful login keeps in-memory CSRF when session storage rejects writes', async () => {
    storageWriteFails = true

    const session = await authApi.login({ email: 'reader@example.com', password: 'password-123' })

    assert.deepEqual(session, { csrfToken: 'csrf-token' })
    assert.equal(apiClient.getCsrfToken(), 'csrf-token')
  })

  test('an unauthenticated session check does not attempt refresh without CSRF state', async () => {
    failures = [{ status: 401, message: 'No active session' }]

    await assert.rejects(authApi.getSession(), (error) => {
      assert.equal(error.constructor.name, 'ApiError')
      assert.equal(error.status, 401)
      return true
    })

    assert.deepEqual(requests.map((request) => request.url), ['/auth/session'])
    assert.equal(onSessionExpiredCalls, 0)
  })

  test('concurrent session checks share one CSRF-issuing request', async () => {
    await Promise.all([authApi.getSession(), authApi.getSession()])

    assert.equal(requests.filter((request) => request.url === '/auth/session').length, 1)
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
  })

  test('network API errors use the common connection notice', () => {
    const expected = { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }

    assert.deepEqual(loginPage.describeLoginError(new authApi.ApiError(0, '')), expected)
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

})
