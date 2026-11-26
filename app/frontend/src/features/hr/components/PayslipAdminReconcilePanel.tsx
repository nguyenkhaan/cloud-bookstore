import { useId, useState } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import { useResendSinglePayslipZaloMutation, useRespondPayslipDisputeMutation } from '../hr-payroll.hook'
import { formatVietnamDateTime, formatVnd } from '../hr-payroll.utils'
import type { PayslipDetailDto } from '../hr-payroll.type'
import { PayrollZaloPreviewModal } from './PayrollZaloPreviewModal'

export interface PayslipAdminReconcilePanelProps {
  payslip: PayslipDetailDto
}

export function PayslipAdminReconcilePanel({
  payslip,
}: PayslipAdminReconcilePanelProps) {
  const responseTextId = useId()
  const adjustmentAmountId = useId()
  const modalTitleId = useId()

  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false)
  const [isResponseOpen, setIsResponseOpen] = useState(false)
  const [selectedDisputeId, setSelectedDisputeId] = useState('')
  const [lastResentAt, setLastResentAt] = useState<string | null>(null)
  const [responseStatus, setResponseStatus] = useState<'EXPLAINED' | 'APPROVED_NEXT_PERIOD_ADJUSTMENT'>('EXPLAINED')
  const [responseText, setResponseText] = useState('')
  const [adjustmentAmountInput, setAdjustmentAmountInput] = useState('')

  const resendMutation = useResendSinglePayslipZaloMutation()
  const respondMutation = useRespondPayslipDisputeMutation()

  const pendingDisputes = payslip.disputes.filter((d) => d.status === 'pending_response')
  const targetDispute =
    pendingDisputes.find((d) => d.id === selectedDisputeId) ?? pendingDisputes[0] ?? null
  const isOwnDispute = Boolean(targetDispute?.ownedByActor)

  const zaloStatusText = lastResentAt
    ? `Đã gửi lại · ${lastResentAt}`
    : payslip.zaloStatus === 'sent'
      ? `Đã gửi · ${payslip.zaloSentAt ?? '-'}`
      : payslip.zaloStatus === 'failed'
        ? 'Lỗi gửi'
        : 'Chưa gửi'

  return (
    <>
      <Card
        padding="lg"
        subtitle={`${payslip.employeeName} · ${payslip.employeeCode} · ${payslip.payrollCode} · ${payslip.payoutStatus === 'paid' ? 'Đã tất toán' : 'Chờ thanh toán'}`}
        title="Đối soát & Gửi phiếu lương"
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs">
            <p className="text-slate-500">Đối chiếu bảng lương</p>
            <p className="mt-1 font-semibold text-slate-900">
              Khớp thực lĩnh: {formatVnd(payslip.netPay)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs">
            <p className="text-slate-500">Chứng từ chi trả</p>
            <p className="mt-1 font-semibold text-slate-900">
              {payslip.transactionRef ?? 'Chưa phát sinh chứng từ'}
            </p>
            <p className="mt-0.5 text-slate-600">{payslip.bankAccount}</p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs">
            <p className="text-slate-500">Trạng thái Zalo</p>
            <p className="mt-1 font-semibold text-slate-900">
              {zaloStatusText}
            </p>
          </div>

          {payslip.disputes.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs">
              <p className="font-semibold text-slate-800">
                Yêu cầu đối chiếu ({payslip.disputes.length})
              </p>
              <div className="space-y-2">
                {payslip.disputes.map((dispute) => {
                  const isPending = dispute.status === 'pending_response'
                  const isSelected = targetDispute?.id === dispute.id
                  return (
                    <div
                      className={cn(
                        'rounded-lg border bg-white px-3 py-2',
                        isSelected ? 'border-indigo-400' : 'border-slate-200',
                      )}
                      key={dispute.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {dispute.disputeCode ?? dispute.id} · {dispute.categoryLabel}
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            isPending ? 'text-amber-700' : 'text-emerald-600',
                          )}
                        >
                          {dispute.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">{dispute.content}</p>
                      {dispute.adminResponse && (
                        <p className="mt-1 text-slate-500">
                          Phản hồi: {dispute.adminResponse}
                        </p>
                      )}
                      {isPending && !dispute.ownedByActor && (
                        <button
                          className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
                          onClick={() => {
                            setSelectedDisputeId(dispute.id)
                            setIsResponseOpen(true)
                          }}
                          type="button"
                        >
                          Chọn để phản hồi
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Button
            className="min-h-[44px] w-full"
            data-testid="hrm06-admin-respond-dispute-btn"
            disabled={!targetDispute || isOwnDispute || respondMutation.isPending}
            onClick={() => setIsResponseOpen(true)}
            type="button"
            variant="secondary"
          >
            Phản hồi đối chiếu
          </Button>
          {isOwnDispute && (
            <p className="text-xs font-medium text-amber-700">
              Admin không được tự phản hồi đối chiếu của chính mình.
            </p>
          )}

          <Button
            className="min-h-[44px] w-full"
            data-testid="hrm06-admin-resend-btn"
            onClick={() => setIsZaloModalOpen(true)}
            type="button"
            variant="primary"
          >
            Xem trước &amp; Gửi lại phiếu
          </Button>

          <p className="text-[11px] text-slate-500">
            Lịch sử gửi và nội dung đối chiếu được lưu. Không chỉnh sửa phiếu
            đã trả.
          </p>
        </div>
      </Card>

      <PayrollZaloPreviewModal
        codeLabel={payslip.payslipCode}
        isOpen={isZaloModalOpen}
        isPending={resendMutation.isPending}
        mode="single"
        onClose={() => setIsZaloModalOpen(false)}
        onConfirm={async () => {
          try {
            const res = await resendMutation.mutateAsync({
              entryId: payslip.entryId ?? payslip.employeeId,
              employeeId: payslip.employeeId,
              periodKey: payslip.periodKey,
            })
            setLastResentAt(res.sentAt ?? formatVietnamDateTime(new Date()))
            notify.success(
              `Đã gửi lại phiếu lương qua Zalo cho ${payslip.employeeName}.`,
            )
            setIsZaloModalOpen(false)
          } catch (error) {
            notify.error(
              error instanceof Error
                ? error.message
                : 'Không thể gửi lại phiếu lương.',
            )
          }
        }}
        periodKey={payslip.periodKey}
        recipients={[
          {
            id: payslip.employeeId,
            employeeCode: payslip.employeeCode,
            fullName: payslip.employeeName,
            baseSalary: payslip.baseSalary,
            overtimeAmount: payslip.overtimeAmount,
            bonus: payslip.bonus,
            allowance: payslip.allowance,
            deduction: payslip.deduction,
            mandatoryContribution: payslip.mandatoryContribution,
            netPay: payslip.netPay,
            zaloStatus: payslip.zaloStatus,
            zaloSentAt: payslip.zaloSentAt,
          },
        ]}
      />

      {isResponseOpen && targetDispute && (
        <div
          aria-labelledby={modalTitleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !respondMutation.isPending) {
              setIsResponseOpen(false)
            }
          }}
          role="dialog"
        >
          <form
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl"
            onSubmit={async (event) => {
              event.preventDefault()
              const trimmed = responseText.trim()
              if (!trimmed) return
              const parsedAdjustmentAmount = Number(adjustmentAmountInput.replace(/[^\d]/g, '')) || 0
              if (
                responseStatus === 'APPROVED_NEXT_PERIOD_ADJUSTMENT' &&
                parsedAdjustmentAmount <= 0
              ) {
                notify.error('Vui lòng nhập số tiền bù trừ kỳ sau lớn hơn 0.')
                return
              }
              try {
                await respondMutation.mutateAsync({
                  disputeId: targetDispute.id,
                  input: {
                    status: responseStatus,
                    adminResponse: trimmed,
                    ...(responseStatus === 'APPROVED_NEXT_PERIOD_ADJUSTMENT'
                      ? {
                          adjustmentAmount: parsedAdjustmentAmount,
                          adjustmentType: 'ADD_NEXT_PERIOD',
                        }
                      : {}),
                  },
                })
                notify.success(
                  `Đã phản hồi đối chiếu ${targetDispute.disputeCode ?? targetDispute.id}.`,
                )
                setResponseText('')
                setAdjustmentAmountInput('')
                setIsResponseOpen(false)
              } catch (error) {
                notify.error(
                  error instanceof Error
                    ? error.message
                    : 'Không thể gửi phản hồi đối chiếu.',
                )
              }
            }}
          >
            <h2 className="font-semibold text-slate-900" id={modalTitleId}>
              Phản hồi đối chiếu {targetDispute.disputeCode ?? ''}
            </h2>
            <SelectBox
              label="Kết quả đối chiếu"
              onChange={(value) => setResponseStatus(value)}
              options={[
                { value: 'EXPLAINED', label: 'Đã giải trình' },
                { value: 'APPROVED_NEXT_PERIOD_ADJUSTMENT', label: 'Duyệt bù trừ kỳ sau' },
              ]}
              searchable={false}
              value={responseStatus}
            />
            {responseStatus === 'APPROVED_NEXT_PERIOD_ADJUSTMENT' && (
              <div>
                <label
                  className="block text-xs font-semibold text-slate-600"
                  htmlFor={adjustmentAmountId}
                >
                  Số tiền bù trừ kỳ sau (đ) <span className="text-rose-600">*</span>
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600"
                  id={adjustmentAmountId}
                  min={1}
                  onChange={(event) => setAdjustmentAmountInput(event.target.value)}
                  placeholder="Nhập số tiền bù trừ..."
                  required
                  type="number"
                  value={adjustmentAmountInput}
                />
              </div>
            )}
            <div>
              <label
                className="block text-xs font-semibold text-slate-600"
                htmlFor={responseTextId}
              >
                Nội dung phản hồi <span className="text-rose-600">*</span>
              </label>
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 outline-none focus:border-indigo-600"
                id={responseTextId}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Nhập nội dung giải trình hoặc hướng xử lý..."
                required
                value={responseText}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                disabled={respondMutation.isPending}
                onClick={() => setIsResponseOpen(false)}
                type="button"
                variant="secondary"
              >
                Hủy
              </Button>
              <Button
                disabled={respondMutation.isPending}
                type="submit"
                variant="primary"
              >
                {respondMutation.isPending ? 'Đang lưu...' : 'Lưu phản hồi'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
