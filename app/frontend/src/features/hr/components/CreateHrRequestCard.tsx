import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { uploadImage } from '@/features/uploads/upload.service'
import { cn } from '@/lib/cn'
import {
  HR_REQUEST_FORM_TITLES,
  HR_REQUEST_SHIFT_OPTIONS,
  HR_REQUEST_TYPE_OPTIONS,
} from '../hr-requests.constants'
import { useCreateHrRequestMutation, useHrRequestOptionsQuery } from '../hr-requests.hook'
import type { HrRequestRecord, HrRequestType } from '../hr-requests.type'

export interface CreateHrRequestCardProps {
  onCreated?: (created: HrRequestRecord) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CreateHrRequestCard({ onCreated }: CreateHrRequestCardProps) {
  const reasonId = useId()
  const proofInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<HrRequestType>('shift_swap')
  const [workRecordId, setWorkRecordId] = useState('')
  const [targetShiftNo, setTargetShiftNo] = useState('2')
  const [replacementEmployeeId, setReplacementEmployeeId] = useState('')
  const [correctCheckIn, setCorrectCheckIn] = useState('')
  const [correctCheckOut, setCorrectCheckOut] = useState('')
  const [reason, setReason] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)

  const [workRecordError, setWorkRecordError] = useState<string | null>(null)
  const [replacementError, setReplacementError] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const { data: options, isLoading: isLoadingOptions } = useHrRequestOptionsQuery()
  const createMutation = useCreateHrRequestMutation()

  const workRecordOptions = options?.workRecords ?? []
  const employeeOptions = options?.employees ?? []
  const selectedWorkRecord = workRecordOptions.find((option) => option.value === workRecordId)
  const applyDate = selectedWorkRecord?.applyDate ?? todayIso()
  const shiftNo = selectedWorkRecord?.shiftNo ?? 0

  const resetFeedback = () => {
    setWorkRecordError(null)
    setReplacementError(null)
    setTimeError(null)
    setReasonError(null)
    setGeneralError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const nextWorkRecordError = selectedWorkRecord
      ? null
      : 'Vui lòng chọn lượt công cần xử lý.'
    const nextReplacementError =
      type === 'attendance_explanation'
        ? null
        : replacementEmployeeId
          ? null
          : 'Vui lòng chọn nhân viên thay thế.'
    const nextTimeError =
      type === 'attendance_explanation' && !correctCheckIn && !correctCheckOut
        ? 'Vui lòng nhập thời gian vào hoặc ra đúng.'
        : null
    const nextReasonError = reason.trim() ? null : 'Vui lòng nhập lý do.'

    setWorkRecordError(nextWorkRecordError)
    setReplacementError(nextReplacementError)
    setTimeError(nextTimeError)
    setReasonError(nextReasonError)
    setGeneralError(null)

    if (
      nextWorkRecordError ||
      nextReplacementError ||
      nextTimeError ||
      nextReasonError ||
      !selectedWorkRecord
    ) {
      return
    }

    try {
      const proofUpload = proofFile
        ? (await uploadImage('HR_REQUEST_PROOF', proofFile)).imageUpload
        : null
      const created = await createMutation.mutateAsync({
        type,
        applyDate,
        shiftNo,
        targetShiftNo: type === 'shift_swap' ? Number(targetShiftNo) : null,
        replacementEmployeeId: type === 'attendance_explanation' ? null : replacementEmployeeId,
        correctCheckInAt:
          type === 'attendance_explanation' && correctCheckIn
            ? `${applyDate}T${correctCheckIn}:00`
            : null,
        correctCheckOutAt:
          type === 'attendance_explanation' && correctCheckOut
            ? `${applyDate}T${correctCheckOut}:00`
            : null,
        reason: reason.trim(),
        proofUpload,
      })
      notify.success(`Đã gửi yêu cầu ${created.code} lên Quản lý phê duyệt.`)
      setReason('')
      setCorrectCheckIn('')
      setCorrectCheckOut('')
      setProofFile(null)
      if (proofInputRef.current) proofInputRef.current.value = ''
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
    <Card padding="lg" title={HR_REQUEST_FORM_TITLES[type]}>
      <form className="space-y-3.5" noValidate onSubmit={handleSubmit}>
        <SelectBox
          label="Loại yêu cầu *"
          onChange={(nextType) => {
            setType(nextType)
            resetFeedback()
          }}
          options={HR_REQUEST_TYPE_OPTIONS}
          searchable={false}
          value={type}
        />

        <SelectBox
          disabled={isLoadingOptions || workRecordOptions.length === 0}
          emptyHint="Chưa có lượt công nào được ghi nhận cho bạn."
          emptyMessage="Không có lượt công khả dụng."
          label={type === 'attendance_explanation' ? 'Lượt chấm công thiếu *' : 'Ca hiện tại *'}
          onChange={(value) => {
            setWorkRecordId(value)
            if (workRecordError) setWorkRecordError(null)
          }}
          options={workRecordOptions}
          searchable
          value={workRecordId}
        />
        {workRecordError && <p className="text-xs text-rose-600">{workRecordError}</p>}

        {type === 'shift_swap' && (
          <>
            <SelectBox
              label="Ca muốn đổi *"
              onChange={setTargetShiftNo}
              options={HR_REQUEST_SHIFT_OPTIONS}
              searchable={false}
              value={targetShiftNo}
            />
            <SelectBox
              emptyMessage="Không có nhân viên khả dụng."
              label="Nhân viên thay thế *"
              onChange={(value) => {
                setReplacementEmployeeId(value)
                if (replacementError) setReplacementError(null)
              }}
              options={employeeOptions}
              searchable
              value={replacementEmployeeId}
            />
          </>
        )}

        {type === 'leave' && (
          <SelectBox
            emptyMessage="Không có nhân viên khả dụng."
            label="Nhân viên thay thế *"
            onChange={(value) => {
              setReplacementEmployeeId(value)
              if (replacementError) setReplacementError(null)
            }}
            options={employeeOptions}
            searchable
            value={replacementEmployeeId}
          />
        )}
        {replacementError && <p className="text-xs text-rose-600">{replacementError}</p>}

        {type === 'attendance_explanation' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500" htmlFor={`${reasonId}-in`}>
                Giờ vào đúng
              </label>
              <input
                className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/15"
                id={`${reasonId}-in`}
                onChange={(event) => {
                  setCorrectCheckIn(event.target.value)
                  if (timeError) setTimeError(null)
                }}
                type="time"
                value={correctCheckIn}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500" htmlFor={`${reasonId}-out`}>
                Giờ ra đúng
              </label>
              <input
                className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/15"
                id={`${reasonId}-out`}
                onChange={(event) => {
                  setCorrectCheckOut(event.target.value)
                  if (timeError) setTimeError(null)
                }}
                type="time"
                value={correctCheckOut}
              />
            </div>
            {timeError && <p className="col-span-2 text-xs text-rose-600">{timeError}</p>}
          </div>
        )}

        <div>
          <div
            className={cn(
              'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
              reasonError ? 'border-rose-500' : 'border-slate-200',
            )}
          >
            <label className="block text-[11px] font-semibold text-slate-500" htmlFor={reasonId}>
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
              onClick={() => proofInputRef.current?.click()}
              type="button"
            >
              Chọn ảnh
            </button>
          </div>
          <input
            accept="image/*"
            aria-label="Chọn ảnh minh chứng"
            className="sr-only"
            onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
            ref={proofInputRef}
            type="file"
          />
          <div className="mt-1 truncate text-sm text-slate-800">
            {proofFile ? proofFile.name : 'Chưa đính kèm ảnh minh chứng'}
          </div>
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

        <p className="text-[11px] leading-relaxed text-slate-500">
          Yêu cầu được gửi tới Quản trị viên để xét duyệt. Tệp minh chứng được tải trực tiếp lên kho ảnh.
        </p>
      </form>
    </Card>
  )
}
