import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Info, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { SelectBox } from '@/components/common/SelectBox'
import { TextField } from '@/components/common/TextField'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import {
  HR_EMPLOYEE_ROLE_OPTIONS,
  HR_EMPLOYEE_STATUS_OPTIONS,
} from '../hr-employees.constants'
import { useUpdateHrEmployeeMutation } from '../hr-employees.hook'
import type {
  BackendRoleName,
  HrEmployee,
  HrEmployeeStatus,
} from '../hr-employees.type'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 11
}

export interface EditEmployeeModalProps {
  employee: HrEmployee | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (employee: HrEmployee) => void
}

export function EditEmployeeModal({
  employee,
  isOpen,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
  if (!isOpen || !employee) return null
  return (
    <EditEmployeeModalForm
      employee={employee}
      key={employee.id}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

function EditEmployeeModalForm({
  employee,
  onClose,
  onSuccess,
}: Omit<EditEmployeeModalProps, 'isOpen'> & { employee: HrEmployee }) {
  const titleId = useId()
  const descId = useId()
  const fullNameId = useId()
  const emailId = useId()
  const phoneId = useId()
  const jobTitleId = useId()
  const reasonId = useId()

  const [fullName, setFullName] = useState(employee.fullName)
  const [email, setEmail] = useState(employee.email)
  const [phone, setPhone] = useState(employee.phone)
  const [roleCode, setRoleCode] = useState<BackendRoleName>(employee.roleCode)
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '')
  const [status, setStatus] = useState<HrEmployeeStatus>(employee.status)
  const [roleChangeReason, setRoleChangeReason] = useState('')

  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const updateMutation = useUpdateHrEmployeeMutation()
  const isRoleChanged = roleCode !== employee.roleCode

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updateMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, updateMutation.isPending])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedReason = roleChangeReason.trim()

    const nextNameError = trimmedName ? null : 'Vui lòng nhập họ và tên.'
    const nextEmailError = !trimmedEmail
      ? 'Vui lòng nhập email đăng nhập.'
      : !EMAIL_PATTERN.test(trimmedEmail)
        ? 'Email đăng nhập không đúng định dạng.'
        : null
    const nextPhoneError = !trimmedPhone
      ? 'Vui lòng nhập số điện thoại.'
      : !isValidPhone(trimmedPhone)
        ? 'Số điện thoại phải gồm 9–11 chữ số.'
        : null
    const nextReasonError =
      isRoleChanged && !trimmedReason
        ? 'Vui lòng nhập lý do đổi vai trò.'
        : null

    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPhoneError(nextPhoneError)
    setReasonError(nextReasonError)
    setGeneralError(null)

    if (nextNameError || nextEmailError || nextPhoneError || nextReasonError) {
      return
    }

    try {
      const result = await updateMutation.mutateAsync({
        id: employee.id,
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        roleCode: employee.isRootAdmin ? employee.roleCode : roleCode,
        jobTitle: jobTitle.trim() || undefined,
        status: employee.isRootAdmin ? employee.status : status,
        roleChangeReason: isRoleChanged ? trimmedReason : undefined,
      })

      if (result.roleChanged) {
        notify.success(
          result.roleChangeSource === 'api'
            ? 'Đã lưu thay đổi hồ sơ và cập nhật vai trò qua máy chủ.'
            : 'Đã lưu thay đổi hồ sơ và vai trò (dữ liệu minh họa).',
        )
      } else {
        notify.success('Đã lưu thay đổi hồ sơ nhân viên.')
      }

      onSuccess?.(result.employee)
      onClose()
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật hồ sơ nhân viên.',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={() => {
          if (!updateMutation.isPending) onClose()
        }}
      />

      <div
        aria-describedby={descId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-2xl sm:px-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900" id={titleId}>
              Chỉnh sửa hồ sơ nhân viên
            </h2>
            <p className="mt-1 text-xs text-slate-500" id={descId}>
              {employee.fullName} · {employee.code} · Chỉnh sửa thông tin tài khoản.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            disabled={updateMutation.isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              hint={nameError}
              id={fullNameId}
              invalid={Boolean(nameError)}
              label="Họ và tên *"
              onChange={(event) => {
                setFullName(event.target.value)
                if (nameError) setNameError(null)
              }}
              type="text"
              value={fullName}
              variant="outlined"
            />

            <TextField
              hint={emailError}
              id={emailId}
              invalid={Boolean(emailError)}
              label="Email đăng nhập *"
              onChange={(event) => {
                setEmail(event.target.value)
                if (emailError) setEmailError(null)
              }}
              type="email"
              value={email}
              variant="outlined"
            />

            <TextField
              hint={phoneError}
              id={phoneId}
              invalid={Boolean(phoneError)}
              label="Số điện thoại *"
              onChange={(event) => {
                setPhone(event.target.value)
                if (phoneError) setPhoneError(null)
              }}
              type="tel"
              value={phone}
              variant="outlined"
            />

            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Vai trò *
              </span>
              <SelectBox
                hideLabel
                disabled={Boolean(employee.isRootAdmin)}
                label="Vai trò"
                onChange={(nextRole) => {
                  setRoleCode(nextRole)
                  if (reasonError) setReasonError(null)
                }}
                options={HR_EMPLOYEE_ROLE_OPTIONS}
                searchable={false}
                value={roleCode}
              />
            </div>

            <TextField
              id={jobTitleId}
              label="Chức danh (không bắt buộc)"
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Thu ngân"
              type="text"
              value={jobTitle}
              variant="outlined"
            />

            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Trạng thái tài khoản
              </span>
              <SelectBox
                hideLabel
                disabled={Boolean(employee.isRootAdmin)}
                label="Trạng thái tài khoản"
                onChange={setStatus}
                options={HR_EMPLOYEE_STATUS_OPTIONS}
                searchable={false}
                value={status}
              />
            </div>
          </div>

          {employee.isRootAdmin && (
            <div
              className="flex items-start gap-2.5 rounded-xl bg-indigo-50 px-3.5 py-3 text-xs text-indigo-700"
              role="note"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                RootAdmin không thể bị khóa, xóa hoặc hạ quyền. Đây là tài khoản khôi phục quyền quản trị cao nhất của cửa hàng.
              </span>
            </div>
          )}

          {isRoleChanged && !employee.isRootAdmin && (
            <div>
              <label
                className="mb-1.5 block text-[13px] font-semibold text-slate-700"
                htmlFor={reasonId}
              >
                Lý do đổi vai trò *
              </label>
              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
                  reasonError ? 'border-rose-500' : 'border-slate-200',
                )}
              >
                <textarea
                  aria-describedby={reasonError ? `${reasonId}-error` : undefined}
                  aria-invalid={Boolean(reasonError) || undefined}
                  className="block w-full resize-none border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                  id={reasonId}
                  onChange={(event) => {
                    setRoleChangeReason(event.target.value)
                    if (reasonError) setReasonError(null)
                  }}
                  placeholder="Nhập lý do thay đổi vai trò nhân viên..."
                  rows={2}
                  value={roleChangeReason}
                />
              </div>
              {reasonError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${reasonId}-error`}
                >
                  {reasonError}
                </p>
              )}
            </div>
          )}

          {generalError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
              role="alert"
            >
              {generalError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <Button
              className="min-h-[44px] px-5"
              disabled={updateMutation.isPending}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px] px-6"
              data-testid="hrm01-edit-submit-btn"
              loading={updateMutation.isPending}
              type="submit"
              variant="primary"
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
