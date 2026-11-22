import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import {
  HR_ATTENDANCE_MISSING_OPTIONS,
  HR_REPLACEMENT_STAFF_OPTIONS,
  HR_SHIFT_OPTIONS,
} from '../hr-requests.mock'
import { useCreateHrRequestMutation } from '../hr-requests.hook'
import type { HrRequestRecord, HrRequestType } from '../hr-requests.type'

const REQUEST_TYPE_OPTIONS: { value: HrRequestType; label: string }[] = [
  { value: 'shift_swap', label: 'Đổi ca làm việc' },
  { value: 'leave', label: 'Xin nghỉ' },
  { value: 'attendance_explanation', label: 'Giải trình chấm công' },
]

const FORM_TITLES: Record<HrRequestType, string> = {
  shift_swap: 'Tạo yêu cầu đổi ca',
  leave: 'Tạo yêu cầu xin nghỉ',
  attendance_explanation: 'Tạo yêu cầu giải trình công',
}

export interface CreateHrRequestCardProps {
  requesterName: string
  requesterCode: string
  onCreated?: (created: HrRequestRecord) => void
}

export function CreateHrRequestCard({
  requesterName,
  requesterCode,
  onCreated,
}: CreateHrRequestCardProps) {
  const dateId = useId()
  const correctTimeId = useId()
  const reasonId = useId()
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<HrRequestType>('shift_swap')
  const [applyDate, setApplyDate] = useState('2026-10-20')
  const [currentShiftLabel, setCurrentShiftLabel] = useState(
    HR_SHIFT_OPTIONS[0].value,
  )
  const [targetShiftLabel, setTargetShiftLabel] = useState(
    HR_SHIFT_OPTIONS[1].value,
  )
  const [attendanceSlot, setAttendanceSlot] = useState(
    HR_ATTENDANCE_MISSING_OPTIONS[0].value,
  )
  const [correctTimeRange, setCorrectTimeRange] = useState('08:00 – 13:05')
  const [replacementLabel, setReplacementLabel] = useState(
    HR_REPLACEMENT_STAFF_OPTIONS[0].value,
  )
  const [reason, setReason] = useState(
    'Có lịch hẹn khám vào buổi sáng, đã thống nhất đổi ca với Linh.',
  )
  const [attachmentLabel, setAttachmentLabel] = useState(
    'lich-hen-2010.pdf · 182 KB',
  )

  const [dateError, setDateError] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const createMutation = useCreateHrRequestMutation()

  const replacementFirstName = replacementLabel.split('·')[0]?.trim() || 'nhân viên thay thế'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const nextDateError = applyDate.trim() ? null : 'Vui lòng chọn ngày áp dụng.'
    const nextTimeError =
      type === 'attendance_explanation' && !correctTimeRange.trim()
        ? 'Vui lòng nhập thời gian làm việc đúng.'
        : null
    const nextReasonError = reason.trim() ? null : 'Vui lòng nhập lý do.'

    setDateError(nextDateError)
    setTimeError(nextTimeError)
    setReasonError(nextReasonError)
    setGeneralError(null)

    if (nextDateError || nextTimeError || nextReasonError) {
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        type,
        applyDate,
        currentShiftLabel:
          type === 'attendance_explanation' ? attendanceSlot : currentShiftLabel,
        targetShiftLabel: type === 'shift_swap' ? targetShiftLabel : undefined,
        correctTimeRange:
          type === 'attendance_explanation' ? correctTimeRange : undefined,
        replacementLabel:
          type === 'attendance_explanation' ? undefined : replacementLabel,
        reason: reason.trim(),
        attachmentLabel: attachmentLabel.trim() || undefined,
        requesterName,
        requesterCode,
      })
      notify.success(`Đã gửi yêu cầu ${created.code} lên Quản lý phê duyệt.`)
      setReason('')
      onCreated?.(created)
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Không thể gửi yêu cầu. Vui lòng thử lại.',
      )
    }
  }

  return (
    <Card
      padding="lg"
      title={FORM_TITLES[type]}
    >
      <form className="space-y-3.5" noValidate onSubmit={handleSubmit}>
        <SelectBox
          label="Loại yêu cầu *"
          onChange={(nextType) => {
            setType(nextType)
            setDateError(null)
            setTimeError(null)
            setReasonError(null)
          }}
          options={REQUEST_TYPE_OPTIONS}
          searchable={false}
          value={type}
        />

        <div>
          <div
            className={cn(
              'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
              dateError ? 'border-rose-500' : 'border-slate-200',
            )}
          >
            <label
              className="block text-[11px] font-semibold text-slate-500"
              htmlFor={dateId}
            >
              Ngày áp dụng *
            </label>
            <input
              aria-describedby={dateError ? `${dateId}-error` : undefined}
              aria-invalid={Boolean(dateError) || undefined}
              className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
              id={dateId}
              onChange={(event) => {
                setApplyDate(event.target.value)
                if (dateError) setDateError(null)
              }}
              type="date"
              value={applyDate}
            />
          </div>
          {dateError && (
            <p className="mt-1 text-xs text-rose-600" id={`${dateId}-error`}>
              {dateError}
            </p>
          )}
        </div>

        {type === 'shift_swap' && (
          <>
            <SelectBox
              label="Ca hiện tại *"
              onChange={setCurrentShiftLabel}
              options={HR_SHIFT_OPTIONS}
              searchable={false}
              value={currentShiftLabel}
            />
            <SelectBox
              label="Ca muốn đổi *"
              onChange={setTargetShiftLabel}
              options={HR_SHIFT_OPTIONS}
              searchable={false}
              value={targetShiftLabel}
            />
            <SelectBox
              label="Nhân viên thay thế *"
              onChange={setReplacementLabel}
              options={HR_REPLACEMENT_STAFF_OPTIONS}
              searchable={false}
              value={replacementLabel}
            />
          </>
        )}

        {type === 'leave' && (
          <>
            <SelectBox
              label="Ca xin nghỉ *"
              onChange={setCurrentShiftLabel}
              options={HR_SHIFT_OPTIONS}
              searchable={false}
              value={currentShiftLabel}
            />
            <SelectBox
              label="Nhân viên thay thế *"
              onChange={setReplacementLabel}
              options={HR_REPLACEMENT_STAFF_OPTIONS}
              searchable={false}
              value={replacementLabel}
            />
          </>
        )}

        {type === 'attendance_explanation' && (
          <>
            <SelectBox
              label="Lượt chấm công thiếu *"
              onChange={setAttendanceSlot}
              options={HR_ATTENDANCE_MISSING_OPTIONS}
              searchable={false}
              value={attendanceSlot}
            />
            <div>
              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
                  timeError ? 'border-rose-500' : 'border-slate-200',
                )}
              >
                <label
                  className="block text-[11px] font-semibold text-slate-500"
                  htmlFor={correctTimeId}
                >
                  Thời gian đúng *
                </label>
                <input
                  aria-describedby={
                    timeError ? `${correctTimeId}-error` : undefined
                  }
                  aria-invalid={Boolean(timeError) || undefined}
                  className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id={correctTimeId}
                  onChange={(event) => {
                    setCorrectTimeRange(event.target.value)
                    if (timeError) setTimeError(null)
                  }}
                  placeholder="08:00 – 13:05"
                  type="text"
                  value={correctTimeRange}
                />
              </div>
              {timeError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${correctTimeId}-error`}
                >
                  {timeError}
                </p>
              )}
            </div>
          </>
        )}

        <div>
          <div
            className={cn(
              'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
              reasonError ? 'border-rose-500' : 'border-slate-200',
            )}
          >
            <label
              className="block text-[11px] font-semibold text-slate-500"
              htmlFor={reasonId}
            >
              Lý do *
            </label>
            <textarea
              aria-describedby={reasonError ? `${reasonId}-error` : undefined}
              aria-invalid={Boolean(reasonError) || undefined}
              className="mt-1 block w-full resize-none border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              id={reasonId}
              onChange={(event) => {
                setReason(event.target.value)
                if (reasonError) setReasonError(null)
              }}
              placeholder="Nhập lý do chi tiết..."
              rows={2}
              value={reason}
            />
          </div>
          {reasonError && (
            <p className="mt-1 text-xs text-rose-600" id={`${reasonId}-error`}>
              {reasonError}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              Bằng chứng / Tệp đính kèm
            </span>
            <button
              className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              onClick={() => attachmentInputRef.current?.click()}
              type="button"
            >
              Chọn tệp
            </button>
          </div>
          <input
            aria-label="Chọn tệp đính kèm"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                const kb = Math.max(1, Math.round(file.size / 1024))
                setAttachmentLabel(`${file.name} · ${kb} KB`)
              }
            }}
            ref={attachmentInputRef}
            type="file"
          />
          <div className="mt-1 truncate text-sm text-slate-800">
            {attachmentLabel || 'Chưa đính kèm tệp'}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {type === 'shift_swap'
              ? `Ca thay thế không trùng giờ. ${replacementFirstName} đã xác nhận đồng ý.`
              : type === 'leave'
                ? `Đã kiểm tra ca trực của ${replacementFirstName}, không trùng lịch.`
                : 'Đính kèm chứng từ giúp Quản lý đối chiếu nhanh hơn.'}
          </span>
        </div>

        {generalError && (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
            role="alert"
          >
            {generalError}
          </div>
        )}

        <Button
          className="min-h-[44px]"
          data-testid="hrm04-submit-request-btn"
          fullWidth
          loading={createMutation.isPending}
          type="submit"
          variant="primary"
        >
          Gửi Quản lý phê duyệt
        </Button>

        <Button
          className="min-h-[44px]"
          fullWidth
          onClick={() => notify.success('Đã lưu nháp yêu cầu.')}
          type="button"
          variant="secondary"
        >
          Lưu nháp
        </Button>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Xin nghỉ: chọn ngày, ca và người thay. Giải trình: chọn lượt thiếu check-out, thời gian đúng và bằng chứng.
        </p>
      </form>
    </Card>
  )
}
