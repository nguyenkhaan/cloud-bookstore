import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

class MemoryStorage {
  #values = new Map()

  getItem(key) {
    return this.#values.get(key) ?? null
  }

  setItem(key, value) {
    this.#values.set(key, String(value))
  }

  removeItem(key) {
    this.#values.delete(key)
  }
}

let server
let roleModule
let authModule
let clientModule
let hrRoleModule
let storage
let previousWindow

before(async () => {
  previousWindow = globalThis.window
  storage = new MemoryStorage()
  globalThis.window = { sessionStorage: storage }
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  roleModule = await server.ssrLoadModule('/src/features/auth/role.ts')
  authModule = await server.ssrLoadModule('/src/context/AuthProvider.ts')
  clientModule = await server.ssrLoadModule('/src/api/client.ts')
  hrRoleModule = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
})

after(async () => {
  if (previousWindow === undefined) delete globalThis.window
  else globalThis.window = previousWindow
  await server?.close()
})

test('normalizeRoleCode accepts exactly three canonical role identifiers', () => {
  assert.equal(roleModule.normalizeRoleCode('ADMIN'), 'ADMIN')
  assert.equal(roleModule.normalizeRoleCode(' cashier '), 'CASHIER')
  assert.equal(roleModule.normalizeRoleCode('INVENTORY_MANAGER'), 'INVENTORY_MANAGER')
  assert.equal(roleModule.normalizeRoleCode('super_admin'), null)
  assert.equal(roleModule.normalizeRoleCode('employee'), null)
  assert.equal(roleModule.normalizeRoleCode('WAREHOUSE'), null)
  assert.equal(roleModule.normalizeRoleCode('unknown-role'), null)
})

test('unknown role never defaults to ADMIN', () => {
  const user = authModule.formatUser({
    id: 'user-unknown',
    fullName: 'Người dùng chưa xác định',
    role: 'UNKNOWN_ROLE',
    email: 'unknown@example.test',
  })

  assert.equal(user.roleCode, undefined)
  assert.notEqual(user.role, 'Quản trị viên')
})

test('readStoredUser rejects malformed or unrecognized cached role', () => {
  storage.setItem('cloud-bookstore.user-info', '{malformed')
  assert.equal(clientModule.readStoredUser(), null)

  storage.setItem(
    'cloud-bookstore.user-info',
    JSON.stringify({
      id: 'user-unknown',
      name: 'Người dùng',
      role: 'Người dùng',
      roleCode: 'UNKNOWN_ROLE',
    }),
  )
  assert.equal(clientModule.readStoredUser(), null)

  storage.setItem(
    'cloud-bookstore.user-info',
    JSON.stringify({
      id: 'legacy-employee',
      name: 'Legacy employee',
      role: 'Employee',
      roleCode: 'EMPLOYEE',
    }),
  )
  assert.equal(clientModule.readStoredUser(), null)

  storage.setItem(
    'cloud-bookstore.user-info',
    JSON.stringify({
      id: 'user-cashier',
      name: 'Thu ngân',
      role: 'Thu ngân',
      roleCode: 'CASHIER',
    }),
  )
  assert.equal(clientModule.readStoredUser().roleCode, 'CASHIER')
})

test('formatUser preserves BrowserSessionUser id and normalized role', () => {
  const user = authModule.formatUser({
    id: 'user-cashier',
    fullName: 'Thu ngân bán hàng',
    role: 'CASHIER',
    email: 'cashier@example.test',
    avatarUrl: null,
  })

  assert.equal(user.id, 'user-cashier')
  assert.equal(user.roleCode, 'CASHIER')
  assert.equal(user.role, 'Thu ngân')
})

test('role resolution never reads previewRole query state', () => {
  assert.equal(hrRoleModule.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }), 'ADMIN')
  assert.equal(hrRoleModule.resolveHrRoleCode({ role: 'Nhân viên' }), undefined)
  assert.equal(hrRoleModule.getPreviewRoleFromSearch, undefined)
})
