import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let settings
let client
const requests = []

before(async () => {
  server = await createServer({ appType: 'custom', server: { hmr: false, middlewareMode: true } })
  settings = await server.ssrLoadModule('/src/features/settings/settings.service.ts')
  ;({ privateClient: client } = await server.ssrLoadModule('/src/api/client.ts'))
  client.defaults.adapter = async (config) => {
    requests.push({ method: config.method, uri: client.getUri(config), data: config.data })
    return { config, data: {}, headers: {}, status: 200, statusText: 'OK' }
  }
})

after(async () => { await server?.close() })

test('all eight Settings requests resolve under exactly one /api prefix', async () => {
  const cases = [
    ['getRentalPolicy', 'updateRentalPolicy', 'rental-policy'],
    ['getMembershipPolicy', 'updateMembershipPolicy', 'membership-policy'],
    ['getRbacMatrix', 'updateRbacMatrix', 'rbac-matrix'],
    ['getIntegrations', 'updateIntegrations', 'integrations'],
  ]
  for (const [get, put, path] of cases) {
    await settings[get]()
    await settings[put]({ changeReason: 'Test' })
    const [read, write] = requests.splice(0)
    assert.equal(new URL(read.uri, 'http://localhost').pathname, `/api/settings/${path}`)
    assert.equal(new URL(write.uri, 'http://localhost').pathname, `/api/settings/${path}`)
    assert.equal(read.method, 'get')
    assert.equal(write.method, 'put')
    assert.deepEqual(JSON.parse(write.data), { changeReason: 'Test' })
  }
})
