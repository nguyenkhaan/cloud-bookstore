import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { notify } from '@/components/common/Toast'
import { useResendSinglePayslipZaloMutation, useRespondPayslipDisputeMutation } from '../hr-payroll.hook'
import { formatVnd } from '../hr-payroll.utils'
import type { PayslipDetailDto, PayslipDisputeRecord } from '../hr-payroll.type'
import { PayrollZaloPreviewModal } from './PayrollZaloPreviewModal'
import { PayslipDisputeDetailModal } from './PayslipDisputePanel'

export interface PayslipAdminReconcilePanelProps {
  payslip: PayslipDetailDto
}

export function PayslipAdminReconcilePanel({
  payslip,
}: PayslipAdminReconcilePanelProps) {
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false)
  const [activeDispute, setActiveDispute] =
    useState<PayslipDisputeRecord | null>(null)
  const [lastResentAt, setLastResentAt] = useState<string | null>(null)

  const resendMutation = useResendSinglePayslipZaloMutation()
  const respondMutation = useRespondPayslipDisputeMutation()

  const zaloStatusText = lastResentAt
    ? `Đã gửi lại · ${lastResentAt}`
    : payslip.zaloStatus === 'sent'
      ? `Đã gửi · ${payslip.zaloSentAt ?? '03/10/2026, 09:35'}`
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

          <Button
            className="min-h-[44px] w-full"
            data-testid="hrm06-admin-respond-dispute-btn"
            disabled={payslip.disputes.length === 0 || respondMutation.isPending}
            onClick={() => {
              const dispute = payslip.disputes[0]
              if (dispute) setActiveDispute(dispute)
            }}
            type="button"
            variant="secondary"
          >
            Phản hồi đối chiếu
          </Button>
          <p className="text-xs text-slate-500">Admin không được tự phản hồi đối chiếu của chính mình.</p>

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
              employeeId: payslip.employeeId,
              periodKey: payslip.periodKey,
            })
            setLastResentAt(res.sentAt ?? new Date().toISOString())
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

      <PayslipDisputeDetailModal
        dispute={activeDispute}
        onClose={() => setActiveDispute(null)}
      />
    </>
  )
}
