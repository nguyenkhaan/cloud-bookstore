import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { cn } from '@/lib/cn'
import {
  useCreateNextPeriodAdjustmentMutation,
  useHrPayrollPeriodQuery,
} from '../hr-payroll.hook'
import {
  ADJUSTMENT_CATEGORY_OPTIONS,
  ADJUSTMENT_TARGET_PERIOD_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  formatVnd,
} from '../hr-payroll.mock'
import { isHrAdmin, resolveHrRoleCode } from '../hr-role.util'
import { hrPaths } from '../hr.route'

export default function PayrollAdjustmentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const amountId = useId()
  const refCodeId = useId()
  const reasonId = useId()
  const reasonErrorId = useId()
  const amountErrorId = useId()

  const searchParams = new URLSearchParams(location.search)
  const sourcePeriod = searchParams.get('period') || '09/2026'
  const sourceCode = searchParams.get('source') || 'PAY-202609'

  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
  }
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)

  const { data: summary } = useHrPayrollPeriodQuery(
    { periodKey: sourcePeriod },
    isAdmin,
  )
  const createAdjustmentMutation = useCreateNextPeriodAdjustmentMutation()

  const employees = summary?.rows ?? []
  const [employeeId, setEmployeeId] = useState('NV-0002')
  const [targetPeriodKey, setTargetPeriodKey] = useState('10/2026')
  const [category, setCategory] = useState('Phụ cấp')
  const [adjustmentType, setAdjustmentType] = useState<
    'add_next_period' | 'deduct_next_period'
  >('add_next_period')
  const [amountInput, setAmountInput] = useState('200000')
  const [referenceCode, setReferenceCode] = useState(
    'DC-0926-003 · Thiếu phụ cấp trách nhiệm',
  )
  const [reason, setReason] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const selectedEmployee =
    employees.find((e) => e.id === employeeId) ?? employees[0]
  const parsedAmount = Number(amountInput.replace(/[^\d]/g, '')) || 0
  const signedAmountText =
    adjustmentType === 'add_next_period'
      ? `+${formatVnd(parsedAmount)}`
      : `-${formatVnd(parsedAmount)}`

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const submitAdjustment = async (mode: 'draft' | 'approved') => {
    const trimmedReason = reason.trim()
    const nextReasonError =
      mode === 'approved' && !trimmedReason
        ? 'Vui lòng nhập lý do, căn cứ và phạm vi điều chỉnh.'
        : null
    const nextAmountError =
      parsedAmount <= 0 ? 'Số tiền điều chỉnh phải lớn hơn 0.' : null

    setReasonError(nextReasonError)
    setAmountError(nextAmountError)
    if (nextReasonError || nextAmountError) return

    try {
      const created = await createAdjustmentMutation.mutateAsync({
        sourcePayrollCode: sourceCode,
        sourcePeriodKey: sourcePeriod,
        sourceVoucherRef:
          summary?.transactionRef ?? 'BANK-PAY-20261003-001',
        employeeId: selectedEmployee?.id ?? employeeId,
        targetPeriodKey,
        category,
        adjustmentType,
        amount: parsedAmount,
        referenceCode,
        reason:
          trimmedReason ||
          'Lưu bản nháp điều chỉnh bù trừ kỳ sau.',
        attachmentName: attachmentName || undefined,
        mode,
      })

      notify.success(
        mode === 'approved'
          ? `Đã duyệt khoản điều chỉnh ${created.id} vào kỳ ${targetPeriodKey}.`
          : `Đã lưu bản nháp ${created.id}.`,
      )
      navigate(hrPaths.payroll)
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Không thể lưu khoản điều chỉnh.',
      )
    }
  }

  const handleApproveSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submitAdjustment('approved')
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Bảng lương', to: hrPaths.payroll },
        { label: 'Điều chỉnh kỳ sau' },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle="Giữ nguyên bảng đã tất toán · Ghi nhận chênh lệch vào kỳ kế tiếp"
      pageTitle="Lập điều chỉnh / Bù trừ kỳ sau"
      user={currentUser}
    >
      <div className="space-y-6">
        {!isAdmin ? (
          <Card padding="lg" title="Bạn chưa có quyền lập điều chỉnh bảng lương">
            <p className="text-sm text-slate-600">
              Chỉ Quản trị viên mới có quyền lập và duyệt khoản điều chỉnh kỳ
              sau.
            </p>
          </Card>
        ) : (
          <Card
            padding="lg"
            subtitle={`Kỳ nguồn: ${sourceCode} · Đã trả ${summary?.payoutDate ?? '03/10/2026'} · Chứng từ ${summary?.transactionRef ?? 'BANK-PAY-20261003-001'}`}
            title="Khoản điều chỉnh ADJ-202610-001"
          >
            <form
              className="space-y-4"
              noValidate
              onSubmit={handleApproveSubmit}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectBox
                  label="Nhân viên *"
                  onChange={setEmployeeId}
                  options={
                    employees.length > 0
                      ? employees.map((e) => ({
                          value: e.id,
                          label: `${e.fullName} · ${e.employeeCode}`,
                        }))
                      : [
                          {
                            value: 'NV-0002',
                            label: 'Trần Hoàng Phong · NV-0002',
                          },
                        ]
                  }
                  searchable={false}
                  value={employeeId}
                />

                <SelectBox
                  label="Kỳ nhận điều chỉnh *"
                  onChange={setTargetPeriodKey}
                  options={ADJUSTMENT_TARGET_PERIOD_OPTIONS}
                  searchable={false}
                  value={targetPeriodKey}
                />

                <SelectBox
                  label="Khoản mục *"
                  onChange={setCategory}
                  options={ADJUSTMENT_CATEGORY_OPTIONS}
                  searchable={false}
                  value={category}
                />

                <SelectBox
                  label="Hình thức điều chỉnh *"
                  onChange={(val) =>
                    setAdjustmentType(
                      val as 'add_next_period' | 'deduct_next_period',
                    )
                  }
                  options={ADJUSTMENT_TYPE_OPTIONS}
                  searchable={false}
                  value={adjustmentType}
                />

                <div
                  className={cn(
                    'rounded-xl border bg-white px-3.5 py-2.5',
                    amountError ? 'border-rose-400' : 'border-slate-200',
                  )}
                >
                  <label
                    className="block text-xs font-semibold text-slate-600"
                    htmlFor={amountId}
                  >
                    Số tiền điều chỉnh <span className="text-rose-600">*</span>
                  </label>
                  <input
                    aria-describedby={amountError ? amountErrorId : undefined}
                    aria-invalid={amountError ? true : undefined}
                    className="mt-1 w-full bg-transparent text-[15px] font-medium text-indigo-950 outline-none"
                    id={amountId}
                    onChange={(event) => {
                      setAmountInput(event.target.value)
                      if (amountError) setAmountError(null)
                    }}
                    type="text"
                    value={amountInput}
                  />
                  {amountError && (
                    <p
                      className="mt-1 text-xs font-medium text-rose-600"
                      id={amountErrorId}
                    >
                      {amountError}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <label
                    className="block text-xs font-semibold text-slate-600"
                    htmlFor={refCodeId}
                  >
                    Tham chiếu đối chiếu
                  </label>
                  <input
                    className="mt-1 w-full bg-transparent text-[15px] text-indigo-950 outline-none"
                    id={refCodeId}
                    onChange={(event) => setReferenceCode(event.target.value)}
                    type="text"
                    value={referenceCode}
                  />
                </div>
              </div>

              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5',
                  reasonError ? 'border-rose-400' : 'border-slate-200',
                )}
              >
                <label
                  className="block text-xs font-semibold text-slate-600"
                  htmlFor={reasonId}
                >
                  Lý do điều chỉnh <span className="text-rose-600">*</span>
                </label>
                <textarea
                  aria-describedby={reasonError ? reasonErrorId : undefined}
                  aria-invalid={reasonError ? true : undefined}
                  className="mt-1 min-h-[84px] w-full bg-transparent text-sm text-indigo-950 outline-none placeholder:text-slate-400"
                  data-testid="hrm05j-reason-input"
                  id={reasonId}
                  onChange={(event) => {
                    setReason(event.target.value)
                    if (reasonError) setReasonError(null)
                  }}
                  placeholder="Nhập lý do, căn cứ và phạm vi điều chỉnh..."
                  value={reason}
                />
                {reasonError && (
                  <p
                    className="mt-1 text-xs font-medium text-rose-600"
                    id={reasonErrorId}
                  >
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <span className="block text-xs font-semibold text-slate-600">
                  Chứng từ / Quyết định kèm theo
                </span>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <button
                    className="text-sm text-slate-700 hover:text-indigo-700"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {attachmentName || 'Chọn tệp hoặc kéo thả minh chứng tại đây'}
                  </button>
                  <input
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setAttachmentName(file ? file.name : '')
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>
              </div>

              <p className="text-xs font-semibold text-indigo-600">
                Kỳ {sourcePeriod} giữ nguyên:{' '}
                {formatVnd(selectedEmployee?.netPay ?? 5380000)}. Kỳ{' '}
                {targetPeriodKey} nhận thêm khoản điều chỉnh {signedAmountText}{' '}
                sau khi Admin duyệt.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  className="min-h-[44px]"
                  onClick={() => navigate(hrPaths.payroll)}
                  type="button"
                  variant="outline"
                >
                  Hủy
                </Button>
                <Button
                  className="min-h-[44px]"
                  disabled={createAdjustmentMutation.isPending}
                  onClick={() => void submitAdjustment('draft')}
                  type="button"
                  variant="secondary"
                >
                  Lưu bản nháp
                </Button>
                <Button
                  className="min-h-[44px]"
                  data-testid="hrm05j-approve-btn"
                  disabled={createAdjustmentMutation.isPending}
                  type="submit"
                  variant="primary"
                >
                  Duyệt khoản điều chỉnh
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
