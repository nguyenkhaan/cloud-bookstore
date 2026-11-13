import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let server
let presentation
let routes

before(async () => {
    server = await createServer({ root: frontendRoot, appType: 'custom', server: { hmr: false, middlewareMode: true } })
    presentation = await server.ssrLoadModule('/src/features/customers/customers.presentation.ts')
    routes = await server.ssrLoadModule('/src/features/customers/customers.route.ts')
})

after(async () => {
    await server?.close()
})

test('rental slip status flags overdue active slips as danger', () => {
    const { getRentalSlipStatus } = presentation
    assert.deepEqual(getRentalSlipStatus('ACTIVE', true), { label: 'Quá hạn', tone: 'danger' })
    assert.deepEqual(getRentalSlipStatus('ACTIVE', false), { label: 'Đang thuê', tone: 'info' })
    assert.equal(getRentalSlipStatus('RETURNED', false).label, 'Đã trả')
})

test('fully reversed invoices are labelled as reversed, not paid', () => {
    const { getSaleStatus } = presentation
    assert.equal(getSaleStatus('PAID', true).label, 'Đã đảo')
    assert.equal(getSaleStatus('PAID', false).label, 'Đã thanh toán')
})

test('violation description lists every applicable reason', () => {
    const { describeViolation } = presentation
    const reasons = describeViolation({
        result: 'AWAITING_PAYMENT',
        lateDays: 2,
        damagePenalty: 20000,
        lostRetainedAmount: 120000,
        outstandingAmount: 5000,
    })
    assert.deepEqual(reasons, ['Trễ 2 ngày', 'Hư hỏng', 'Mất sách', 'Còn nợ nghĩa vụ'])
    assert.deepEqual(
        describeViolation({ result: 'OPEN_OVERDUE', lateDays: 0, damagePenalty: 0, lostRetainedAmount: 0, outstandingAmount: 0 }),
        ['Quá hạn chưa trả'],
    )
})

test('buyback tab has no status filter; other tabs have one', () => {
    const { HISTORY_STATUS_OPTIONS } = presentation
    assert.equal(HISTORY_STATUS_OPTIONS.buybacks.length, 0)
    assert.ok(HISTORY_STATUS_OPTIONS.rentals.length > 0)
    assert.ok(HISTORY_STATUS_OPTIONS.violations.some((o) => o.value === 'OPEN_OVERDUE'))
})

test('source document links: copies are linkable, documents without a page return null', () => {
    assert.equal(routes.sourceDocumentPaths.copy('abc'), '/catalog/copies/abc')
    assert.equal(routes.sourceDocumentPaths.rentalSlip('x'), null)
    assert.equal(routes.sourceDocumentPaths.saleInvoice('x'), null)
    assert.equal(routes.sourceDocumentPaths.stockReceipt('x'), null)
})