import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createServer } from 'vite'

const requests = []

let apiClient
let authApi
let errorMessages
let nextFailure
let server

const responseData = {
  '/auth/login': { accessToken: 'access-token', refreshToken: 'refresh-token' },
  '/auth/register': { email: 'reader@example.com', fullName: 'Reader' },
}

function recordRequest(client) {
  return async (config) => {
    requests.push({
      authorization: config.headers?.get?.('Authorization'),
      client,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      method: config.method,
      url: config.url,
    })

    if (nextFailure) {
      const failure = nextFailure
      nextFailure = undefined
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
    server: { middlewareMode: true },
  })

  authApi = await server.ssrLoadModule('/src/features/auth/auth.service.ts')
  errorMessages = await server.ssrLoadModule('/src/features/auth/errors.ts')
  apiClient = await server.ssrLoadModule('/src/api/client.ts')
  apiClient.publicClient.defaults.adapter = recordRequest('public')
  apiClient.privateClient.defaults.adapter = recordRequest('private')
})

beforeEach(() => {
  requests.length = 0
  nextFailure = undefined
  responseData['/auth/login'] = { accessToken: 'access-token', refreshToken: 'refresh-token' }
  authApi.setAccessToken(null)
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
    { authorization: undefined, client: 'public', data: request, method: 'post', url: '/auth/register' },
  ])
})

test('login returns tokens from the public auth endpoint', async () => {
  const request = { email: 'reader@example.com', password: 'password-123' }

  const result = await authApi.login(request)

  assert.deepEqual(result, { accessToken: 'access-token', refreshToken: 'refresh-token' })
  assert.deepEqual(requests, [
    { authorization: undefined, client: 'public', data: request, method: 'post', url: '/auth/login' },
  ])
})

test('public void auth mutations send their generated request bodies', async () => {
  const cases = [
    ['verify', { token: 'verify-token' }, '/auth/verify'],
    ['requestPasswordReset', { email: 'reader@example.com' }, '/auth/password-reset-requests'],
    ['resetPassword', { token: 'reset-token', newPassword: 'new-password-123' }, '/auth/password-resets'],
    ['logout', { refreshToken: 'refresh-token' }, '/auth/logout'],
  ]

  for (const [method, data, url] of cases) {
    await authApi[method](data)
    assert.deepEqual(requests.pop(), { authorization: undefined, client: 'public', data, method: 'post', url })
  }
})

test('session check sends the login access token with the authenticated client', async () => {
  await authApi.login({ email: 'reader@example.com', password: 'password-123' })
  requests.length = 0

  await authApi.getSession()

  assert.deepEqual(requests, [
    {
      authorization: 'Bearer access-token',
      client: 'private',
      data: undefined,
      method: 'get',
      url: '/auth/session',
    },
  ])
})

test('a restored access token is sent with the next private request', async () => {
  authApi.setAccessToken('restored-access-token')

  await authApi.getSession()

  assert.equal(requests[0].authorization, 'Bearer restored-access-token')
})

test('clearing the access token removes it from later private requests', async () => {
  authApi.setAccessToken('restored-access-token')
  authApi.setAccessToken(null)

  await authApi.getSession()

  assert.equal(requests[0].authorization, undefined)
})

test('failed logout still removes the access token from later private requests', async () => {
  await authApi.login({ email: 'reader@example.com', password: 'password-123' })
  requests.length = 0
  nextFailure = {}

  await assert.rejects(authApi.logout({ refreshToken: 'refresh-token' }))
  requests.length = 0
  await authApi.getSession()

  assert.equal(requests[0].authorization, undefined)
})

test('HTTP failures keep the backend status and message in ApiError', async () => {
  nextFailure = { status: 409, message: 'User has been registered' }

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
  nextFailure = {}

  await assert.rejects(authApi.verify({ token: 'verify-token' }), (error) => {
    assert.equal(error.constructor.name, 'ApiError')
    assert.equal(error.status, 0)
    return true
  })
})

test('login rejects a malformed token response', async () => {
  responseData['/auth/login'] = { accessToken: 'access-token' }

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

  assert.deepEqual(errorMessages.describeLoginError(new Error()), expected)
  assert.deepEqual(errorMessages.describeRegisterError(new Error()), expected)
  assert.deepEqual(errorMessages.describeVerifyError(new Error()), expected)
})

test('network API errors use the common connection notice', () => {
  const expected = { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }

  assert.deepEqual(errorMessages.describeLoginError(new authApi.ApiError(0, '')), expected)
  assert.deepEqual(errorMessages.describeRegisterError(new authApi.ApiError(0, '')), expected)
  assert.deepEqual(errorMessages.describeVerifyError(new authApi.ApiError(0, '')), expected)
})

test('login errors distinguish invalid credentials and locked accounts', () => {
  assert.deepEqual(errorMessages.describeLoginError(new authApi.ApiError(401, '')), {
    tone: 'warning',
    message: 'Email hoặc mật khẩu không đúng. Tài khoản sẽ bị tạm khóa nếu nhập sai quá nhiều lần.',
  })
  assert.deepEqual(errorMessages.describeLoginError(new authApi.ApiError(403, 'Account locked')), {
    tone: 'error',
    message: 'Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.',
  })
  assert.deepEqual(errorMessages.describeLoginError(new authApi.ApiError(403, '')), {
    tone: 'warning',
    message: 'Tài khoản chưa được kích hoạt hoặc không khả dụng. Hãy kích hoạt tài khoản hoặc liên hệ Quản trị viên.',
  })
})

test('register errors preserve their specific recovery guidance', () => {
  assert.deepEqual(errorMessages.describeRegisterError(new authApi.ApiError(409, '')), {
    tone: 'error',
    message: 'Email này đã được đăng ký và kích hoạt. Hãy đăng nhập hoặc dùng Quên mật khẩu.',
  })
  assert.deepEqual(errorMessages.describeRegisterError(new authApi.ApiError(400, 'Email domain is not allowed')), {
    tone: 'error',
    message: 'Email chưa được cấp quyền bởi Quản trị viên.',
  })
  assert.deepEqual(errorMessages.describeRegisterError(new authApi.ApiError(400, 'Invalid email')), {
    tone: 'error',
    message: 'Email không hợp lệ.',
  })
  assert.deepEqual(errorMessages.describeRegisterError(new authApi.ApiError(400, '')), {
    tone: 'error',
    message: 'Thông tin chưa hợp lệ. Hãy kiểm tra lại email, họ tên, số điện thoại và mật khẩu.',
  })
})

test('verification errors distinguish forbidden accounts from invalid links', () => {
  assert.deepEqual(errorMessages.describeVerifyError(new authApi.ApiError(403, '')), {
    tone: 'error',
    message: 'Tài khoản này không thể kích hoạt. Hãy liên hệ Quản trị viên.',
  })
  assert.deepEqual(errorMessages.describeVerifyError(new authApi.ApiError(400, '')), {
    tone: 'error',
    message: 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Hãy gửi lại liên kết mới.',
  })
})
})
