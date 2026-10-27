import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTH_STORAGE_KEY,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../src/features/auth/auth.storage.ts'

function tokenWithExpiration(expirationInSeconds) {
  const payload = Buffer.from(JSON.stringify({ exp: expirationInSeconds })).toString('base64url')
  return `header.${payload}.signature`
}

function memoryStorage(initialValue) {
  const values = new Map()
  if (initialValue !== undefined) values.set(AUTH_STORAGE_KEY, initialValue)
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
    value: () => values.get(AUTH_STORAGE_KEY) ?? null,
  }
}

test('a valid unexpired session is restored from storage', () => {
  const session = {
    accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 300),
    refreshToken: 'refresh-token',
  }
  const storage = memoryStorage(JSON.stringify(session))

  assert.deepEqual(readStoredSession(storage), session)
})

test('malformed or incomplete stored sessions are removed', () => {
  for (const value of ['not-json', JSON.stringify({ accessToken: 'only' })]) {
    const storage = memoryStorage(value)

    assert.equal(readStoredSession(storage), null)
    assert.equal(storage.value(), null)
  }
})

test('an expired stored session is removed', () => {
  const storage = memoryStorage(JSON.stringify({
    accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) - 1),
    refreshToken: 'refresh-token',
  }))

  assert.equal(readStoredSession(storage), null)
  assert.equal(storage.value(), null)
})

test('session writes are atomic and explicit cleanup removes the pair', () => {
  const storage = memoryStorage()
  const session = {
    accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 300),
    refreshToken: 'refresh-token',
  }

  writeStoredSession(storage, session)
  assert.deepEqual(JSON.parse(storage.value()), session)

  clearStoredSession(storage)
  assert.equal(storage.value(), null)
})
