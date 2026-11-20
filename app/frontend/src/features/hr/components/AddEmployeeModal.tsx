import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import { HR_EMPLOYEE_ROLE_OPTIONS } from '../hr-employees.mock'
import { useCreateHrEmployeeMutation } from '../hr-employees.hook'
import type { BackendRoleName, HrEmployee } from '../hr-employees.type'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 11
}

export interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (employee: HrEmployee) => void
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) {
  if (!isOpen) return null
  return <AddEmployeeModalForm onClose={onClose} onSuccess={onSuccess} />
}

function AddEmployeeModalForm({
  onClose,
  onSuccess,
}: Omit<AddEmployeeModalProps, 'isOpen'>) {
  const titleId = useId()
  const descId = useId()
  const fullNameId = useId()
  const emailId = useId()
  const phoneId = useId()
  const jobTitleId = useId()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleCode, setRoleCode] = useState<BackendRoleName>('CASHIER')
  const [jobTitle, setJobTitle] = useState('')

  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const createMutation = useCreateHrEmployeeMutation()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createMutation.isPending, onClose])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

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

    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPhoneError(nextPhoneError)
    setGeneralError(null)

    if (nextNameError || nextEmailError || nextPhoneError) {
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        roleCode,
        jobTitle: jobTitle.trim() || undefined,
      })
      notify.success(
        `Đã tạo tài khoản ${created.code} (${created.fullName}) ở trạng thái Chờ kích hoạt.`,
      )
      onSuccess?.(created)
      onClose()
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Không thể tạo tài khoản nhân viên.',
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
          if (!createMutation.isPending) onClose()
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
              Thêm tài khoản nhân viên
            </h2>
            <p className="mt-1 text-xs text-slate-500" id={descId}>
              Tạo tài khoản nội bộ. Liên kết thiết lập mật khẩu được gửi qua email.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            disabled={createMutation.isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
                  nameError ? 'border-rose-500' : 'border-slate-200',
                )}
              >
                <label
                  className="block text-[11px] font-semibold text-slate-500"
                  htmlFor={fullNameId}
                >
                  Họ và tên *
                </label>
                <input
                  aria-describedby={nameError ? `${fullNameId}-error` : undefined}
                  aria-invalid={Boolean(nameError) || undefined}
                  className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id={fullNameId}
                  onChange={(event) => {
                    setFullName(event.target.value)
                    if (nameError) setNameError(null)
                  }}
                  placeholder="Nguyễn Hoài An"
                  type="text"
                  value={fullName}
                />
              </div>
              {nameError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${fullNameId}-error`}
                >
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
                  emailError ? 'border-rose-500' : 'border-slate-200',
                )}
              >
                <label
                  className="block text-[11px] font-semibold text-slate-500"
                  htmlFor={emailId}
                >
                  Email đăng nhập *
                </label>
                <input
                  aria-describedby={emailError ? `${emailId}-error` : undefined}
                  aria-invalid={Boolean(emailError) || undefined}
                  className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id={emailId}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (emailError) setEmailError(null)
                  }}
                  placeholder="nv.an@comicpos.vn"
                  type="email"
                  value={email}
                />
              </div>
              {emailError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${emailId}-error`}
                >
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <div
                className={cn(
                  'rounded-xl border bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15',
                  phoneError ? 'border-rose-500' : 'border-slate-200',
                )}
              >
                <label
                  className="block text-[11px] font-semibold text-slate-500"
                  htmlFor={phoneId}
                >
                  Số điện thoại *
                </label>
                <input
                  aria-describedby={phoneError ? `${phoneId}-error` : undefined}
                  aria-invalid={Boolean(phoneError) || undefined}
                  className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id={phoneId}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    if (phoneError) setPhoneError(null)
                  }}
                  placeholder="0908 000 015"
                  type="tel"
                  value={phone}
                />
              </div>
              {phoneError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${phoneId}-error`}
                >
                  {phoneError}
                </p>
              )}
            </div>

            <div>
              <SelectBox
                label="Vai trò *"
                onChange={setRoleCode}
                options={HR_EMPLOYEE_ROLE_OPTIONS}
                searchable={false}
                value={roleCode}
              />
            </div>

            <div>
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-colors focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
                <label
                  className="block text-[11px] font-semibold text-slate-500"
                  htmlFor={jobTitleId}
                >
                  Chức danh (không bắt buộc)
                </label>
                <input
                  className="mt-1 block w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  id={jobTitleId}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="Thu ngân"
                  type="text"
                  value={jobTitle}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Trạng thái ban đầu
              </div>
              <div className="mt-1 text-sm font-medium text-slate-800">
                Chờ thiết lập mật khẩu
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/70 px-3.5 py-3 text-xs text-slate-600">
            Nhân viên tự thiết lập mật khẩu qua email. Admin không xem được mật khẩu cá nhân.
          </div>

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
              disabled={createMutation.isPending}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px] px-6"
              data-testid="hrm01-add-submit-btn"
              loading={createMutation.isPending}
              type="submit"
              variant="primary"
            >
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
