import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const src = (...parts) => resolve(import.meta.dirname, '..', 'src', ...parts)

test('browser authentication does not persist tokens in local storage', () => {
  assert.equal(existsSync(src('features', 'auth', 'auth.storage.ts')), false)

  for (const file of [
    src('api', 'client.ts'),
    src('context', 'auth-provider.tsx'),
    src('features', 'auth', 'auth.service.ts'),
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /localStorage/)
  }
})
