import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createServer } from 'vite'

describe('Approvals feature: types, presentation, and service mapping', () => {
  let server
  let presentationMod

  before(async () => {
    server = await createServer({
      appType: 'custom',
      server: { hmr: false, middlewareMode: true },
    })
    presentationMod = await server.ssrLoadModule('/src/features/approvals/approvals.presentation.ts')
  })

  after(async () => {
    await server?.close()
  })

  test('approvalStatusMeta maps all 5 statuses accurately to Vietnamese labels and badge classes', () => {
    const pending = presentationMod.approvalStatusMeta('PENDING_APPROVAL')
    assert.equal(pending.label, 'Chờ duyệt')
    assert.match(pending.className, /amber/)

    const approved = presentationMod.approvalStatusMeta('APPROVED')
    assert.equal(approved.label, 'Đã duyệt')
    assert.match(approved.className, /blue/)

    const applied = presentationMod.approvalStatusMeta('APPLIED')
    assert.equal(applied.label, 'Đã áp dụng')
    assert.match(applied.className, /emerald/)

    const rejected = presentationMod.approvalStatusMeta('REJECTED')
    assert.equal(rejected.label, 'Từ chối')
    assert.match(rejected.className, /rose/)

    const cancelled = presentationMod.approvalStatusMeta('CANCELLED')
    assert.equal(cancelled.label, 'Đã hủy')
    assert.match(cancelled.className, /slate/)
  })

  test('copyStatusLabel maps domain BookCopyStatus to readable labels', () => {
    assert.equal(presentationMod.copyStatusLabel('AVAILABLE'), 'Sẵn sàng')
    assert.equal(presentationMod.copyStatusLabel('DAMAGED'), 'Hư hỏng')
    assert.equal(presentationMod.copyStatusLabel('LOST'), 'Mất sách')
    assert.equal(presentationMod.copyStatusLabel('RENTED'), 'Đang cho thuê')
    assert.equal(presentationMod.copyStatusLabel('SOLD'), 'Đã bán')
    assert.equal(presentationMod.copyStatusLabel('INVENTORY_LOCKED'), 'Khóa kiểm kê')
    assert.equal(presentationMod.copyStatusLabel('PENDING_RECEIPT'), 'Chờ nhập kho')
    assert.equal(presentationMod.copyStatusLabel('DISPOSED'), 'Đã thanh lý')
    assert.equal(presentationMod.copyStatusLabel('DISCONTINUED'), 'Ngừng sử dụng')
  })

  test('approvalGeneralStatusMeta maps domain ApprovalStatus to badges', () => {
    assert.equal(presentationMod.approvalGeneralStatusMeta('PENDING_APPROVAL').label, 'Chờ duyệt')
    assert.match(presentationMod.approvalGeneralStatusMeta('PENDING_APPROVAL').className, /amber/)

    assert.equal(presentationMod.approvalGeneralStatusMeta('APPROVED').label, 'Đã phê duyệt')
    assert.match(presentationMod.approvalGeneralStatusMeta('APPROVED').className, /emerald/)

    assert.equal(presentationMod.approvalGeneralStatusMeta('REJECTED').label, 'Đã từ chối')
    assert.match(presentationMod.approvalGeneralStatusMeta('REJECTED').className, /rose/)

    assert.equal(presentationMod.approvalGeneralStatusMeta('COMPLETED').label, 'Hoàn tất')
    assert.match(presentationMod.approvalGeneralStatusMeta('COMPLETED').className, /blue/)

    assert.equal(presentationMod.approvalGeneralStatusMeta('CANCELLED').label, 'Đã hủy')
    assert.match(presentationMod.approvalGeneralStatusMeta('CANCELLED').className, /slate/)

    assert.equal(presentationMod.approvalGeneralStatusMeta('DRAFT').label, 'Bản nháp')
    assert.equal(presentationMod.approvalGeneralStatusMeta(undefined).label, '—')
  })

  test('conditionGradeMeta maps condition grades accurately', () => {
    assert.equal(presentationMod.conditionGradeMeta('GRADE_A').label, 'Grade A (Mới 90-99%)')
    assert.match(presentationMod.conditionGradeMeta('GRADE_A').className, /emerald/)

    assert.equal(presentationMod.conditionGradeMeta('GRADE_B').label, 'Grade B (Tốt 75-89%)')
    assert.match(presentationMod.conditionGradeMeta('GRADE_B').className, /blue/)

    assert.equal(presentationMod.conditionGradeMeta('GRADE_C').label, 'Grade C (Khá 60-74%)')
    assert.match(presentationMod.conditionGradeMeta('GRADE_C').className, /amber/)

    assert.equal(presentationMod.conditionGradeMeta('GRADE_D').label, 'Grade D (Cũ <60%)')
    assert.match(presentationMod.conditionGradeMeta('GRADE_D').className, /rose/)

    assert.equal(presentationMod.conditionGradeMeta(null).label, 'Chưa thẩm định')
  })

  test('reversalTypeMeta categorizes reversal vs disposal', () => {
    const reversal = presentationMod.reversalTypeMeta('HỦY_HÓA_ĐƠN_BÁN')
    assert.equal(reversal.label, 'Đảo/Hủy hóa đơn 24h')
    assert.match(reversal.className, /purple/)

    const reversalEn = presentationMod.reversalTypeMeta('SALE_INVOICE_REVERSAL')
    assert.equal(reversalEn.label, 'Đảo/Hủy hóa đơn 24h')
    assert.match(reversalEn.className, /purple/)

    const disposal = presentationMod.reversalTypeMeta('DISPOSAL')
    assert.equal(disposal.label, 'Xuất hủy sách hỏng')
    assert.match(disposal.className, /rose/)
  })

  test('varianceMeta maps inventory discrepancy types to visual tags', () => {
    const missing = presentationMod.varianceMeta('MISSING')
    assert.equal(missing.label, 'THIẾU')
    assert.match(missing.className, /rose/)

    const damaged = presentationMod.varianceMeta('DAMAGED')
    assert.equal(damaged.label, 'HƯ HỎNG')
    assert.match(damaged.className, /amber/)

    const unexpected = presentationMod.varianceMeta('UNEXPECTED_STATUS')
    assert.equal(unexpected.label, 'SAI TRẠNG THÁI')
    assert.match(unexpected.className, /purple/)

    const none = presentationMod.varianceMeta('NONE')
    assert.equal(none.label, 'KHỚP')
    assert.match(none.className, /emerald/)
  })

  test('formatVnd and formatDateTime format values safely', () => {
    assert.equal(presentationMod.formatVnd(0), '0 đ')
    assert.match(presentationMod.formatVnd(65000), /65\.000/)
    assert.equal(presentationMod.formatVnd(null), '0 đ')

    assert.equal(presentationMod.formatDateTime(null), '—')
    assert.equal(presentationMod.formatDateTime(''), '—')
    const formatted = presentationMod.formatDateTime('2026-11-13T08:00:00Z')
    assert.notEqual(formatted, '—')
  })
})
