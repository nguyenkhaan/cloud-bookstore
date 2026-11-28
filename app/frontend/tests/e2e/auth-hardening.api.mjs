import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import {
  auditRows, auth, client, createActiveEmployee, csrf, employee, employeeRow, expectStatus,
  login, newPassword, originalPassword, passwordFaults, requireMailLink, sql, sqlLiteral, stack,
} from './auth-fixture.mjs'

const chrome = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
const firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0'
const profilePath = `${auth}/profile`
const sessionsPath = `${auth}/sessions`
const changePath = `${auth}/change-password`
const maxPassword = `A1!${'x'.repeat(125)}`

test('login rejects oversized bodies and fields without counting failed attempts', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const send = (data) => guest.post(`${auth}/login`, { data })
  for (const size of [100_000, 5_000_000]) {
    expectStatus(await send({ email: staff.email, password: 'x'.repeat(size) }), 413)
  }

  for (const [data, field] of [
    [{ email: staff.email, password: 'x'.repeat(600) }, 'Password'],
    [{ email: 'x'.repeat(321), password: staff.password }, 'Email'],
  ]) {
    const response = await send(data)
    expectStatus(response, 400)
    assert.match(response.headers()['content-type'], /^application\/problem\+json\b/)
    assert.deepEqual(Object.keys((await response.json()).errors), [field])
  }

  assert.equal(employeeRow(staff.email).FailedLoginAttempts, 0)
  await login(guest, staff)
})

async function expectRevoked(session) {
  expectStatus(await session.context.get(`${auth}/session`), 401, 'Revoked access cookie is rejected')
  const refresh = await session.context.post(`${auth}/refresh`, { headers: session.headers })
  expectStatus(refresh, 401, 'Revoked refresh cookie cannot restore the session')
}

function assertAudit(id, action, secrets = []) {
  const events = auditRows(id, action)
  assert.equal(events.length, 1, `Exactly one ${action} audit event`)
  const event = events[0]
  assert.equal(event.EntityType, 'Employee')
  assert.ok(secrets.every((secret) => !JSON.stringify(event).includes(secret)), 'Audit does not store passwords, hashes, or tokens')
  return event
}

function sessionRows(employeeId) {
  return JSON.parse(sql(`SELECT coalesce(json_agg(employee_sessions), '[]') FROM employee_sessions
    WHERE "EmployeeId" = ${sqlLiteral(employeeId)}`))
}

async function avatarReceipt(session) {
  const response = await session.context.post('/api/uploads/signature', {
    headers: session.headers, data: { ownerType: 'EMPLOYEE_AVATAR' },
  })
  expectStatus(response, 200)
  const { uploadIntentId, uploadUrl, publicId, timestamp, signature: uploadSignature } = await response.json()
  assert.equal(new URL(uploadUrl).pathname, '/v1_1/verify-cloud/image/upload')
  assert.match(publicId, /\/public\/avatars\//)
  assert.ok(uploadIntentId && uploadSignature, 'The server returned a signed avatar intent')
  const signature = createHash('sha1').update(`public_id=${publicId}&version=${timestamp}verify-secret`).digest('hex')
  return { uploadIntentId, publicId, version: timestamp, signature, format: 'png', bytes: 1024 }
}

for (const [fault, password] of passwordFaults) {
  test(`AC1 register rejects only password ${fault}`, async (testCase) => {
    const guest = await client(testCase)
    const staff = employee({ password })
    expectStatus(await guest.post(`${auth}/register`, { data: staff }), 400)
    assert.equal(employeeRow(staff.email), null)
  })
}

for (const [fault, email] of [['invalid email format', 'invalid.cloud.io'], ['external domain', `${randomUUID()}@example.org`]]) {
  test(`AC1 register rejects only ${fault}`, async (testCase) => {
    const guest = await client(testCase)
    expectStatus(await guest.post(`${auth}/register`, { data: employee({ email }) }), 400)
    assert.equal(employeeRow(email), null)
  })
}

test('AC1 register trims name and phone and normalizes email before persistence', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee()
  const data = { ...staff, email: ` ${staff.email.toUpperCase()} `, fullName: ` ${staff.fullName} `, phone: ` ${staff.phone} ` }
  expectStatus(await guest.post(`${auth}/register`, { data }), 201)
  const persisted = employeeRow(staff.email)
  assert.deepEqual([persisted.Email, persisted.FullName, persisted.Phone], [staff.email, staff.fullName, staff.phone])
})

test('AC1 register detects mixed-case duplicates of active or locked employees', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const duplicate = { ...staff, email: ` ${staff.email.toUpperCase()} ` }
  expectStatus(await guest.post(`${auth}/register`, { data: duplicate }), 409, 'Active duplicate conflicts')
  sql(`UPDATE employee SET "Status" = 'LOCKED', "LockoutEndUtc" = now() + interval '15 minutes' WHERE "Email" = ${sqlLiteral(staff.email)}`)
  expectStatus(await guest.post(`${auth}/register`, { data: duplicate }), 409, 'Locked duplicate conflicts')
  assert.equal(sql(`SELECT count(*) FROM employee WHERE lower("Email") = ${sqlLiteral(staff.email)}`), '1')
})

test('AC1 registration accepts the exact 128-character password boundary', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee({ password: maxPassword })
  expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
  const { token } = await requireMailLink(staff.email, '/verify-register')
  expectStatus(await guest.post(`${auth}/verify`, { data: { token } }), 204)
  await login(guest, staff)
})

test('AC1 register resends verification instead of inserting a mixed-case pending duplicate', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee()
  expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
  const original = await requireMailLink(staff.email, '/verify-register')
  const duplicate = await guest.post(`${auth}/register`, { data: { ...staff, email: staff.email.toUpperCase() } })
  assert.ok(duplicate.ok(), `Pending duplicate can resend, got HTTP ${duplicate.status()}`)
  await requireMailLink(staff.email, '/verify-register', { exclude: [original.id] })
  assert.equal(sql(`SELECT count(*) FROM employee WHERE lower("Email") = ${sqlLiteral(staff.email)}`), '1')
})

test('AC2 resend delivers another verification email and verify activates account', async (testCase) => {
  const guest = await client(testCase)
  const staff = employee()
  expectStatus(await guest.post(`${auth}/register`, { data: staff }), 201)
  const original = await requireMailLink(staff.email, '/verify-register')
  const resend = await guest.post(`${auth}/verification-resends`, { data: { email: staff.email } })
  assert.ok(resend.ok(), `Resend succeeds, got HTTP ${resend.status()}`)
  const replacement = await requireMailLink(staff.email, '/verify-register', { exclude: [original.id] })
  expectStatus(await guest.post(`${auth}/verify`, { data: { token: replacement.token } }), 204)
  assert.equal((await login(guest, staff)).user.email, staff.email)
})

test('AC2 verify rejects an invalid token in isolation', async (testCase) => {
  const guest = await client(testCase)
  const response = await guest.post(`${auth}/verify`, { data: { token: 'invalid-verification-token' } })
  assert.ok([400, 401].includes(response.status()), `Invalid token must be rejected, got HTTP ${response.status()}`)
})

test('AC3 reset requests are opaque and case-insensitive', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  for (const email of [staff.email.toUpperCase(), employee().email]) {
    const response = await guest.post(`${auth}/password-reset-requests`, { data: { email } })
    expectStatus(response, 204)
    assert.equal(await response.text(), '')
  }
  await requireMailLink(staff.email, '/reset-password')
})

test('AC3 reset accepts the exact 128-character password boundary', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  expectStatus(await guest.post(`${auth}/password-reset-requests`, { data: { email: staff.email } }), 204)
  const { token } = await requireMailLink(staff.email, '/reset-password')
  expectStatus(await guest.post(`${auth}/password-resets`, { data: { token, newPassword: maxPassword } }), 204)
  await login(guest, { ...staff, password: maxPassword })
})

for (const [fault, password] of passwordFaults) {
  test(`AC3 reset rejects only new password ${fault} and leaves link usable`, async (testCase) => {
    const guest = await client(testCase)
    const staff = await createActiveEmployee(guest)
    expectStatus(await guest.post(`${auth}/password-reset-requests`, { data: { email: staff.email } }), 204)
    const { token } = await requireMailLink(staff.email, '/reset-password')
    const invalid = await guest.post(`${auth}/password-resets`, { data: { token, newPassword: password } })
    expectStatus(invalid, 400)
    expectStatus(await guest.post(`${auth}/password-resets`, { data: { token, newPassword } }), 204)
  })
}

test('AC3 reset updates persisted credentials, clears lockout, audits and revokes all sessions', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const current = await login(await client(testCase, chrome), staff)
  const other = await login(await client(testCase, firefox), staff)
  expectStatus(await guest.post(`${auth}/password-reset-requests`, { data: { email: staff.email } }), 204)
  const { token } = await requireMailLink(staff.email, '/reset-password')
  const before = employeeRow(staff.email)
  assert.ok(before.PasswordResetTokenHash, 'The issued password-reset token has a persisted hash')
  sql(`UPDATE employee SET "FailedLoginAttempts" = 4, "LockoutEndUtc" = now() + interval '15 minutes' WHERE "Id" = ${sqlLiteral(before.Id)}`)
  const startedAt = Date.now()
  expectStatus(await guest.post(`${auth}/password-resets`, { data: { token, newPassword } }), 204)
  const after = employeeRow(staff.email)
  assert.ok(Date.parse(after.PasswordChangedAt) >= startedAt, 'PasswordChangedAt reflects the completed mutation')
  assert.equal(after.FailedLoginAttempts, 0)
  assert.equal(after.LockoutEndUtc, null)
  assert.equal(after.PasswordResetTokenHash, null)
  assert.notEqual(after.Password, before.Password)
  assertAudit(before.Id, 'RESET_PASSWORD', [originalPassword, newPassword, token, before.Password, after.Password])
  const rows = sessionRows(before.Id)
  assert.equal(rows.length, 2)
  assert.ok(rows.every(({ RevokedAt }) => Date.parse(RevokedAt) >= startedAt))
  await expectRevoked(current)
  await expectRevoked(other)
  const replay = await guest.post(`${auth}/password-resets`, { data: { token, newPassword: 'SecondReset3!' } })
  assert.ok([400, 401].includes(replay.status()), 'Reset link cannot be reused')
  await login(guest, { ...staff, password: newPassword })
})

for (const [fault, currentPassword, nextPassword, message] of [
  ['incorrect current password', 'DifferentBook3!', newPassword, 'Current password is incorrect.'],
  ['unchanged password', originalPassword, originalPassword, 'New password must be different from current password.'],
  ...passwordFaults.map(([fault, password]) => [fault, originalPassword, password, null]),
]) {
  test(`AC4 change password rejects only ${fault}`, async (testCase) => {
    const guest = await client(testCase)
    const staff = await createActiveEmployee(guest)
    const session = await login(guest, staff)
    const before = employeeRow(staff.email)
    const response = await guest.post(changePath, { headers: session.headers, data: { currentPassword, newPassword: nextPassword } })
    expectStatus(response, 400)
    if (message) assert.ok((await response.text()).includes(message), 'Error identifies the actual fault')
    const after = employeeRow(staff.email)
    assert.equal(after.Password, before.Password)
    assert.equal(after.PasswordChangedAt, before.PasswordChangedAt)
  })
}

test('AC4 change password hashes at cost 12, audits and revokes only other sessions', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const current = await login(await client(testCase, chrome), staff)
  const other = await login(await client(testCase, firefox), staff)
  const before = employeeRow(staff.email)
  const startedAt = Date.now()
  expectStatus(await current.context.post(changePath, {
    headers: current.headers, data: { currentPassword: originalPassword, newPassword },
  }), 204)
  const after = employeeRow(staff.email)
  assert.match(after.Password, /^\$2[aby]\$12\$/)
  assert.notEqual(after.Password, before.Password)
  assert.ok(Date.parse(after.PasswordChangedAt) >= startedAt)
  assertAudit(before.Id, 'CHANGE_PASSWORD', [originalPassword, newPassword, before.Password, after.Password])
  const rows = sessionRows(before.Id)
  assert.equal(rows.length, 2)
  assert.equal(rows.filter(({ RevokedAt }) => RevokedAt === null).length, 1)
  assert.equal(rows.filter(({ RevokedAt }) => Date.parse(RevokedAt) >= startedAt).length, 1)
  expectStatus(await current.context.get(`${auth}/session`), 200)
  await expectRevoked(other)
  await login(guest, { ...staff, password: newPassword })
})

test('AC4 change password accepts the exact 128-character password boundary', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const changed = await context.post(changePath, {
    headers: session.headers, data: { currentPassword: originalPassword, newPassword: maxPassword },
  })
  expectStatus(changed, 204)
  await login(await client(testCase), { ...staff, password: maxPassword })
})

test('AC5 profile reads only real account data and persists authorized changes with audit', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const before = employeeRow(staff.email)
  const profile = await context.get(profilePath)
  expectStatus(profile, 200)
  const body = await profile.json()
  assert.deepEqual([body.id, body.email, body.fullName, body.phone, body.role, body.status],
    [before.Id, staff.email, staff.fullName, staff.phone, session.user.role, before.Status])
  assert.equal(Date.parse(body.createdAt), Date.parse(before.CreatedAt))
  assert.equal(body.passwordChangedAt, before.PasswordChangedAt ?? null)
  const data = { fullName: 'Updated Verification Staff', phone: '0980000058' }
  const updated = await context.put(profilePath, { headers: session.headers, data })
  expectStatus(updated, 200)
  assert.equal((await updated.json()).fullName, data.fullName)
  const persisted = employeeRow(staff.email)
  assert.deepEqual([persisted.FullName, persisted.Phone, persisted.Email], [data.fullName, data.phone, staff.email])
  const event = assertAudit(before.Id, 'UPDATE_PROFILE')
  assert.deepEqual(Object.values(event.BeforeData).sort(), [staff.fullName, staff.phone].sort())
  assert.deepEqual(Object.values(event.AfterData).sort(), [data.fullName, data.phone].sort())
})

for (const [fault, overrides] of [
  ['one-character name', { fullName: 'A' }],
  ['201-character name', { fullName: 'N'.repeat(201) }],
  ['wrong phone prefix', { phone: '1980000058' }],
  ['nine-digit phone', { phone: '098000058' }],
]) {
  test(`AC5 profile PUT rejects only ${fault}`, async (testCase) => {
    const context = await client(testCase)
    const staff = await createActiveEmployee(context)
    const session = await login(context, staff)
    const data = { fullName: 'Valid Name', phone: '0980000058', ...overrides }
    expectStatus(await context.put(profilePath, { headers: session.headers, data }), 400)
    assert.equal(employeeRow(staff.email).FullName, staff.fullName)
    assert.equal(employeeRow(staff.email).Phone, staff.phone)
  })
}

test('AC5 profile writes require the session CSRF token', async (testCase) => {
  const context = await client(testCase)
  await login(context, stack.accounts.cashier)
  const response = await context.put(profilePath, { data: { fullName: 'Valid Name', phone: '0980000058' } })
  expectStatus(response, 403)
  assert.equal((await response.json()).code, 'CSRF_TOKEN_INVALID')
})

test('AC5 signed avatar receipt persists the URL, updates session data, and writes an audit event', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const data = await avatarReceipt(session)
  const response = await context.put(`${profilePath}/avatar`, { headers: session.headers, data })
  expectStatus(response, 200)
  const { avatarUrl } = await response.json()
  const url = new URL(avatarUrl)
  assert.equal(url.protocol, 'https:')
  assert.equal(url.hostname, 'res.cloudinary.com')
  assert.ok(url.pathname.includes(data.publicId))
  assert.equal(employeeRow(staff.email).AvatarUrl, avatarUrl)
  const sessionRead = await context.get(`${auth}/session`)
  expectStatus(sessionRead, 200)
  assert.equal((await sessionRead.json()).user.avatarUrl, avatarUrl)
  assertAudit(session.user.id, 'UPDATE_PROFILE_AVATAR', [data.signature])
})

test('AC5 avatar PUT rejects only the changed receipt signature and leaves the intent usable', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const data = await avatarReceipt(session)
  const signature = `${data.signature.startsWith('a') ? 'b' : 'a'}${data.signature.slice(1)}`
  const invalid = await context.put(`${profilePath}/avatar`, { headers: session.headers, data: { ...data, signature } })
  expectStatus(invalid, 400)
  assert.equal(employeeRow(staff.email).AvatarUrl, null)
  expectStatus(await context.put(`${profilePath}/avatar`, { headers: session.headers, data }), 200)
})

test('AC6 login, session, refresh and logout maintain one stable device session', async (testCase) => {
  const context = await client(testCase, chrome)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  const whoAmI = await context.get(`${auth}/session`)
  expectStatus(whoAmI, 200)
  assert.equal((await whoAmI.json()).csrfToken, session.token)
  const initial = await context.get(sessionsPath)
  expectStatus(initial, 200)
  const [device] = await initial.json()
  assert.equal(device.isCurrent, true)
  assert.match(device.deviceName, /Chrome/i)
  assert.match(device.deviceType, /desktop/i)
  assert.ok(Date.parse(device.expiresAt) > Date.parse(device.createdAt))
  assert.doesNotMatch(JSON.stringify(Object.keys(device)), /ipaddress|accessjti|refreshjti/i)
  const [row] = sessionRows(session.user.id)
  assert.equal(row.Id, device.id)
  assert.ok(row.AccessJti && row.RefreshJti && !row.RevokedAt)
  const refresh = await context.post(`${auth}/refresh`, { headers: session.headers })
  expectStatus(refresh, 200)
  const token = (await refresh.json()).csrfToken
  assert.ok(token && token !== session.token, 'Refresh rotates the CSRF token')
  const refreshed = await context.get(sessionsPath)
  expectStatus(refreshed, 200)
  const devices = await refreshed.json()
  assert.equal(devices.length, 1)
  assert.equal(devices[0].id, device.id)
  assert.ok(Date.parse(devices[0].lastActiveAt) >= Date.parse(device.lastActiveAt))
  const [rotated] = sessionRows(session.user.id)
  assert.notEqual(rotated.AccessJti, row.AccessJti)
  assert.notEqual(rotated.RefreshJti, row.RefreshJti)
  expectStatus(await context.post(`${auth}/logout`, { headers: csrf(token) }), 204)
  assert.ok(sessionRows(session.user.id).find(({ Id }) => Id === device.id).RevokedAt)
  expectStatus(await context.get(`${auth}/session`), 401)
  const relogin = await login(context, staff)
  const history = await relogin.context.get(sessionsPath)
  expectStatus(history, 200)
  const loggedOut = (await history.json()).find(({ id }) => id === device.id)
  assert.ok(loggedOut && !loggedOut.isCurrent && loggedOut.status !== device.status)
})

test('AC6 revocation preserves current session, rejects current/foreign targets and revokes other cookies', async (testCase) => {
  const guest = await client(testCase)
  const staff = await createActiveEmployee(guest)
  const current = await login(await client(testCase, chrome), staff)
  const other = await login(await client(testCase, firefox), staff)
  const extra = await login(await client(testCase), staff)
  const foreign = await login(await client(testCase), stack.accounts.inventory)
  const mine = await current.context.get(sessionsPath)
  const theirs = await foreign.context.get(sessionsPath)
  expectStatus(mine, 200)
  expectStatus(theirs, 200)
  const devices = await mine.json()
  const currentId = devices.find((device) => device.isCurrent).id
  const foreignId = (await theirs.json()).find((device) => device.isCurrent).id
  const otherId = devices.find((device) => /Firefox/i.test(device.deviceName)).id
  expectStatus(await current.context.delete(`${sessionsPath}/${currentId}`, { headers: current.headers }), 400)
  expectStatus(await current.context.delete(`${sessionsPath}/${foreignId}`, { headers: current.headers }), 404)
  expectStatus(await current.context.delete(`${sessionsPath}/${otherId}`, { headers: current.headers }), 204)
  await expectRevoked(other)
  const bulk = await current.context.post(`${sessionsPath}/revoke-others`, { headers: current.headers })
  expectStatus(bulk, 200)
  assert.equal((await bulk.json()).revokedCount, 1)
  await expectRevoked(extra)
  const rows = sessionRows(current.user.id)
  assert.equal(rows.find(({ Id }) => Id === currentId).RevokedAt, null)
  assert.equal(rows.filter(({ RevokedAt }) => RevokedAt !== null).length, 2)
  expectStatus(await current.context.get(`${auth}/session`), 200)
  expectStatus(await foreign.context.get(`${auth}/session`), 200)
})

function seedRevokedSessions(employeeId, count, daysAgo) {
  assert.ok(Number.isSafeInteger(count) && Number.isSafeInteger(daysAgo))
  return sql(`INSERT INTO employee_sessions
    ("Id", "EmployeeId", "DeviceName", "DeviceType", "AccessJti", "RefreshJti", "CreatedAt", "LastActiveAt", "ExpiresAt", "RevokedAt")
    SELECT gen_random_uuid(), ${sqlLiteral(employeeId)}, 'Historical device ' || fixture, 'desktop',
    gen_random_uuid()::text, gen_random_uuid()::text, now() - interval '10 days', now() - interval '9 days',
    now() + interval '1 day', now() - make_interval(days => ${daysAgo}, mins => fixture)
    FROM generate_series(1, ${count}) AS fixture RETURNING "Id"`).split('\n')
}

test('AC6 session history includes recent logout but excludes one older than seven days', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  expectStatus(await context.get(sessionsPath), 200)
  const [recent] = seedRevokedSessions(session.user.id, 1, 6)
  const [old] = seedRevokedSessions(session.user.id, 1, 8)
  const response = await context.get(sessionsPath)
  expectStatus(response, 200)
  const devices = await response.json()
  assert.ok(devices.some(({ id, isCurrent }) => id === recent && !isCurrent))
  assert.ok(devices.every(({ id }) => id !== old))
})

test('AC6 session history is capped with the current session retained', async (testCase) => {
  const context = await client(testCase)
  const staff = await createActiveEmployee(context)
  const session = await login(context, staff)
  expectStatus(await context.get(sessionsPath), 200)
  const recentIds = seedRevokedSessions(session.user.id, 21, 1)
  const response = await context.get(sessionsPath)
  expectStatus(response, 200)
  const devices = await response.json()
  assert.equal(devices.filter(({ isCurrent }) => isCurrent).length, 1)
  const history = devices.filter(({ id }) => recentIds.includes(id))
  assert.ok(history.length >= 19 && history.length <= 20, 'At most 20 recent sessions are listed')
  assert.ok(history.some(({ id }) => id === recentIds[0]), 'The newest revoked device is not omitted')
})

for (const [method, path, data] of [
  ['get', profilePath], ['put', profilePath, { fullName: 'Valid Name', phone: '0980000058' }],
  ['put', `${profilePath}/avatar`, { uploadIntentId: randomUUID(), publicId: 'valid-id', version: 1, signature: 'signed' }],
  ['post', changePath, { currentPassword: originalPassword, newPassword }],
  ['get', sessionsPath], ['delete', `${sessionsPath}/${randomUUID()}`], ['post', `${sessionsPath}/revoke-others`],
]) {
  test(`AC4-6 guest cannot call ${method.toUpperCase()} ${path.replace(/[a-f0-9-]{36}$/, '{sessionId}')}`, async (testCase) => {
    const guest = await client(testCase)
    expectStatus(await guest[method](path, { data }), 401)
  })
}

test('AUTH-001 login and refresh keep JWTs out of live JSON', async (testCase) => {
  const context = await client(testCase)
  const { email, password } = stack.accounts.cashier
  const loginResponse = await context.post(`${auth}/login`, { data: { email, password } })
  expectStatus(loginResponse, 200)
  const loginBody = await loginResponse.json()
  assert.deepEqual(Object.keys(loginBody).sort(), ['csrfToken', 'user'])
  assert.ok(loginBody.csrfToken)
  assert.equal(loginBody.user.email, email)

  const refreshResponse = await context.post(`${auth}/refresh`, { headers: csrf(loginBody.csrfToken) })
  expectStatus(refreshResponse, 200)
  const refreshBody = await refreshResponse.json()
  assert.deepEqual(Object.keys(refreshBody).sort(), ['csrfToken', 'user'])
  assert.ok(refreshBody.csrfToken)
  assert.notEqual(refreshBody.csrfToken, loginBody.csrfToken)
  assert.equal(refreshBody.user.email, email)
})

test('AC7 running OpenAPI describes every changed auth entrypoint and avatar owner type', async (testCase) => {
  const guest = await client(testCase)
  const response = await guest.get('/openapi/v1.json')
  expectStatus(response, 200)
  const document = await response.json()
  const operations = [
    [profilePath, 'get'], [profilePath, 'put'], [`${profilePath}/avatar`, 'put'], [changePath, 'post'],
    [sessionsPath, 'get'], [`${sessionsPath}/{sessionId}`, 'delete'], [`${sessionsPath}/revoke-others`, 'post'],
    ['/api/uploads/signature', 'post'],
    ...['login', 'register', 'verify', 'verification-resends', 'password-reset-requests', 'password-resets', 'refresh', 'logout']
      .map((path) => [`${auth}/${path}`, 'post']),
    [`${auth}/session`, 'get'],
  ]
  const missing = operations.filter(([path, method]) => !document.paths[path]?.[method])
  assert.deepEqual(missing, [], 'OpenAPI is missing operations')
  assert.deepEqual(Object.keys(document.components.schemas.AuthenticationResponse.properties).sort(), ['csrfToken', 'user'])
  assert.match(JSON.stringify(document.components.schemas), /EMPLOYEE_AVATAR/)
})
