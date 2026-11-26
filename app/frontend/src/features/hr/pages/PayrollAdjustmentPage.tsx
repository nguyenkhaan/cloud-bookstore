import { useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { uploadImage } from '@/features/uploads/upload.service'
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import { Paperclip } from 'lucide-react'
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
  useHrPayrollPeriodsListQuery,
} from '../hr-payroll.hook'
import {
  ADJUSTMENT_CATEGORY_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  formatVnd,
  getNextPeriodKeys,
} from '../hr-payroll.utils'
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
  const queryPeriod = searchParams.get('period') ?? ''
  const querySourceCode = searchParams.get('source') ?? ''

  const currentUser = session?.user
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)

  const periodsQuery = useHrPayrollPeriodsListQuery(isAdmin)
  const sourcePeriod = useMemo(() => {
    if (queryPeriod) return queryPeriod
    const list = periodsQuery.data ?? []
    const settledOrPartial = list.find(
      (p) => p.status === 'settled' || p.status === 'partially_paid',
    )
    return settledOrPartial?.periodKey ?? list[0]?.periodKey ?? ''
  }, [periodsQuery.data, queryPeriod])

  const sourcePeriodItem = (periodsQuery.data ?? []).find(
    (p) => p.periodKey === sourcePeriod,
  )

  const periodQuery = useHrPayrollPeriodQuery(
    { periodKey: sourcePeriod },
    isAdmin && Boolean(sourcePeriod),
  )
  const summary = periodQuery.data
  const sourceCode =
    querySourceCode || summary?.payrollCode || sourcePeriodItem?.payrollCode || ''

  const createAdjustmentMutation = useCreateNextPeriodAdjustmentMutation()

  const [employeeId, setEmployeeId] = useState('')
  const [targetPeriodKey, setTargetPeriodKey] = useState('')
  const [category, setCategory] = useState('Phụ cấp')
  const [adjustmentType, setAdjustmentType] = useState<
    'add_next_period' | 'deduct_next_period'
  >('add_next_period')
  const [amountInput, setAmountInput] = useState('')
  const [referenceCode, setReferenceCode] = useState('')
  const [reason, setReason] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [proofUpload, setProofUpload] = useState<CloudinaryUploadResultRequest | undefined>(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)

  const targetPeriodOptions = useMemo(() => {
    const nextOptions = sourcePeriod ? getNextPeriodKeys(sourcePeriod, 3) : []
    const map = new Map(nextOptions.map((item) => [item.value, item]))
    for (const item of periodsQuery.data ?? []) {
      if (item.periodKey !== sourcePeriod && item.status === 'draft' && !map.has(item.periodKey)) {
        map.set(item.periodKey, {
          value: item.periodKey,
          label: `Kỳ ${item.periodKey}`,
        })
      }
    }
    return Array.from(map.values())
  }, [periodsQuery.data, sourcePeriod])

  if (!currentUser) return null

  const employees = summary?.rows ?? []
  const effectiveEmployeeId = employeeId || employees[0]?.id || ''
  const selectedEmployee = employees.find((e) => e.id === effectiveEmployeeId)
  const effectiveTargetPeriodKey =
    targetPeriodKey || targetPeriodOptions[0]?.value || ''

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

    if (!effectiveEmployeeId || !effectiveTargetPeriodKey) {
      notify.error('Vui lòng chọn nhân viên và kỳ áp dụng điều chỉnh.')
      return
    }

    try {
      const created = await createAdjustmentMutation.mutateAsync({
        sourcePayrollCode: sourceCode,
        sourcePeriodKey: sourcePeriod,
        sourceVoucherRef: summary?.transactionRef ?? '',
        employeeId: effectiveEmployeeId,
        targetPeriodKey: effectiveTargetPeriodKey,
        category,
        adjustmentType,
        amount: parsedAmount,
        referenceCode: referenceCode.trim() || undefined,
        reason:
          trimmedReason ||
          'Lưu bản nháp điều chỉnh bù trừ kỳ sau.',
        attachmentName: attachmentName || undefined,
        proofUpload,
        mode,
      })

      notify.success(
        mode === 'approved'
          ? `Đã duyệt khoản điều chỉnh ${created.id} vào kỳ ${effectiveTargetPeriodKey}.`
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

  const hasError = periodsQuery.isError || periodQuery.isError
  const isLoading =
    periodsQuery.isLoading || (Boolean(sourcePeriod) && periodQuery.isLoading)

  const cardSubtitleParts = [
    sourceCode ? `Kỳ nguồn: ${sourceCode}` : sourcePeriod ? `Kỳ nguồn: ${sourcePeriod}` : '',
    summary?.payoutDate ? `Đã trả ${summary.payoutDate}` : '',
    summary?.transactionRef ? `Chứng từ ${summary.transactionRef}` : '',
  ].filter(Boolean)

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
        ) : hasError ? (
          <Card padding="lg" title="Không thể tải dữ liệu kỳ lương nguồn">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Đã xảy ra lỗi khi tải danh sách nhân viên của kỳ lương nguồn.
              </p>
              <Button
                className="min-h-[44px]"
                onClick={() => {
                  void periodsQuery.refetch()
                  if (sourcePeriod) void periodQuery.refetch()
                }}
                type="button"
                variant="primary"
              >
                Thử lại
              </Button>
            </div>
          </Card>
        ) : isLoading ? (
          <Card padding="lg" title="Đang tải dữ liệu kỳ lương">
            <p className="text-sm text-slate-600">
              Đang tải thông tin nhân viên và kỳ áp dụng...
            </p>
          </Card>
        ) : (
          <Card
            className="max-w-3xl"
            padding="lg"
            subtitle={cardSubtitleParts.join(' · ') || 'Chọn nhân viên và kỳ tiếp theo cần bù trừ'}
            title="Khoản điều chỉnh kỳ sau"
          >
            <form
              className="space-y-4"
              noValidate
              onSubmit={handleApproveSubmit}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectBox
                  emptyMessage="Không có nhân viên trong kỳ lương nguồn."
                  label="Nhân viên *"
                  onChange={setEmployeeId}
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.fullName} · ${e.employeeCode}`,
                  }))}
                  searchable={false}
                  value={effectiveEmployeeId}
                />

                <SelectBox
                  emptyMessage="Chưa có kỳ nhận điều chỉnh khả dụng."
                  label="Kỳ nhận điều chỉnh *"
                  onChange={setTargetPeriodKey}
                  options={targetPeriodOptions}
                  searchable={false}
                  value={effectiveTargetPeriodKey}
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
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      aria-describedby={amountError ? amountErrorId : undefined}
                      aria-invalid={amountError ? true : undefined}
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-indigo-950 outline-none placeholder:text-slate-400"
                      id={amountId}
                      inputMode="numeric"
                      onChange={(event) => {
                        setAmountInput(event.target.value.replace(/\D/g, ''))
                        if (amountError) setAmountError(null)
                      }}
                      placeholder="Nhập số tiền..."
                      type="text"
                      value={amountInput.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    />
                    <span className="shrink-0 text-sm text-slate-500">đ</span>
                  </div>
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
                    className="mt-1 w-full bg-transparent text-[15px] text-indigo-950 outline-none placeholder:text-slate-400"
                    id={refCodeId}
                    onChange={(event) => setReferenceCode(event.target.value)}
                    placeholder="Mã đối chiếu (không bắt buộc)"
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

              <div>
                <span className="block text-xs font-semibold text-slate-600">
                  Chứng từ / Quyết định kèm theo
                </span>
                <div className="mt-1.5">
                  <button
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-left text-sm text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Paperclip aria-hidden="true" className="shrink-0 text-slate-400" size={16} />
                    <span className="truncate">
                      {attachmentName || 'Chọn tệp chứng từ đính kèm'}
                    </span>
                  </button>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setIsUploading(true)
                      try {
                        const uploaded = await uploadImage('PAYROLL_PAYOUT_PROOF', file)
                        setProofUpload(uploaded.imageUpload)
                        setAttachmentName(file.name)
                      } catch (error) {
                        notify.error(
                          error instanceof Error
                            ? error.message
                            : 'Không thể tải chứng từ.',
                        )
                      } finally {
                        setIsUploading(false)
                      }
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>
              </div>

              <p className="text-xs font-semibold text-indigo-600">
                {sourcePeriod ? `Kỳ ${sourcePeriod} giữ nguyên: ` : 'Kỳ nguồn giữ nguyên: '}
                {selectedEmployee ? formatVnd(selectedEmployee.netPay) : '-'}.{' '}
                {effectiveTargetPeriodKey
                  ? `Kỳ ${effectiveTargetPeriodKey} nhận thêm khoản điều chỉnh ${signedAmountText} sau khi Admin duyệt.`
                  : `Khoản điều chỉnh ${signedAmountText} sẽ áp dụng vào kỳ tiếp theo sau khi Admin duyệt.`}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
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
