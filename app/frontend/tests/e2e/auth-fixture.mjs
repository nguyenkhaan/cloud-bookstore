import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'

const stateFile = process.env.CLOUDBOOK_VERIFY_STATE
assert.ok(stateFile, 'Set CLOUDBOOK_VERIFY_STATE to the isolated verify-cloudbook runtime/state.json')

export const stack = JSON.parse(readFileSync(stateFile, 'utf8'))
for (const field of ['feUrl', 'beUrl', 'mailpitUrl']) {
  const url = new URL(stack[field])
  assert.equal(url.hostname, '127.0.0.1', `${field} must be a loopback URL`)
  assert.ok(Number(url.port) >= 10000, `${field} must use an isolated verification port`)
}
assert.match(stack.containers.pg, /^cloudbook-verify-/)

const require = createRequire(import.meta.url)
export const { chromium, request } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

export const phone = '0980000017'
export const originalPassword = 'CloudBooks1!'
export const newPassword = 'NewBookstore2!'
export const passwordFaults = [
  ['11 characters', 'CloudBook1!'],
  ['129 characters', `A1!${'x'.repeat(126)}`],
  ['missing uppercase', 'cloudbooks1!'],
  ['missing digit', 'CloudBookss!'],
  ['missing special character', 'CloudBooks12'],
]

export const auth = '/api/auth'

export function employee(overrides = {}) {
  return {
    email: `qa-${randomUUID()}@cloud.io`,
    fullName: 'Auth Verification Staff',
    phone,
    password: originalPassword,
    ...overrides,
  }
}

export function sql(query) {
  return execFileSync('docker', [
    'exec', stack.containers.pg, 'psql', '-U', 'postgres', '-d', 'cloud_bookstore',
    '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', query,
  ], { encoding: 'utf8' }).trim()
}

export function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`
}

export function employeeRow(email) {
  return JSON.parse(sql(`SELECT row_to_json(employee) FROM employee WHERE "Email" = ${sqlLiteral(email)}`) || 'null')
}

export function auditRows(id, action) {
  return JSON.parse(sql(`SELECT coalesce(json_agg(audit_logs), '[]') FROM audit_logs
    WHERE "EntityId" = ${sqlLiteral(id)} AND "Action" = ${sqlLiteral(action)}`))
}

export async function client(test, userAgent) {
  const context = await request.newContext({
    baseURL: stack.beUrl,
    extraHTTPHeaders: { Origin: stack.feUrl },
    userAgent,
  })
  test.after(() => context.dispose())
  return context
}

export function csrf(token) {
  return { 'X-CSRF-Token': token }
}

export function expectStatus(response, expected, explanation) {
  assert.equal(response.status(), expected, explanation ?? `${response.request?.().method?.() ?? 'HTTP'} ${new URL(response.url()).pathname}`)
}

export async function login(context, { email, password = originalPassword }) {
  const response = await context.post(`${auth}/login`, { data: { email, password } })
  expectStatus(response, 200, 'Fixture staff can sign in')
  const body = await response.json()
  assert.ok(body.csrfToken, 'Login returns a CSRF token')
  return { context, user: body.user, token: body.csrfToken, headers: csrf(body.csrfToken) }
}

export async function mailLink(email, path, { exclude = [], timeout = 4500 } = {}) {
  const deadline = Date.now() + timeout
  do {
    const list = await fetch(`${stack.mailpitUrl}/api/v1/messages`)
    assert.equal(list.status, 200, 'Mailpit message list is reachable')
    const { messages } = await list.json()
    for (const message of messages ?? []) {
      if (exclude.includes(message.ID) || !message.To.some(({ Address }) => Address.toLowerCase() === email.toLowerCase())) continue
      const response = await fetch(`${stack.mailpitUrl}/api/v1/message/${message.ID}`)
      assert.equal(response.status, 200, 'Mailpit message is readable')
      const detail = await response.json()
      const match = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`.match(/(https?:\/\/[^\s"'<>]+\?token=[^&\s"'<>]+)/g)
        ?.map((value) => new URL(value))
        .find((url) => url.pathname === path)
      if (match) {
        assert.equal(match.origin, stack.feUrl, 'Email links use the verification application origin')
        return { id: message.ID, token: match.searchParams.get('token'), url: match.href }
      }
    }
    await delay(150)
  } while (Date.now() < deadline)
  return null
}

export async function requireMailLink(email, path, options) {
  const mail = await mailLink(email, path, options)
  assert.ok(mail?.token, `Mailpit delivered a ${path} link to ${email}`)
  return mail
}

export async function createActiveEmployee(context) {
  const staff = employee()
  expectStatus(await context.post(`${auth}/register`, { data: staff }), 201)
  const { token } = await requireMailLink(staff.email, '/verify-register')
  expectStatus(await context.post(`${auth}/verify`, { data: { token } }), 204)
  return staff
}
