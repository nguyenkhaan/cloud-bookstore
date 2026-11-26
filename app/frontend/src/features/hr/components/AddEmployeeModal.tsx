import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { SelectBox } from '@/components/common/SelectBox'
import { TextField } from '@/components/common/TextField'
import { notify } from '@/components/common/Toast'
import { HR_EMPLOYEE_ROLE_OPTIONS } from '../hr-employees.constants'
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
  const hourlyRateId = useId()
  const bankNameId = useId()
  const bankAccountNumberId = useId()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleCode, setRoleCode] = useState<BackendRoleName>('CASHIER')
  const [jobTitle, setJobTitle] = useState('')
  const [hourlyRateInput, setHourlyRateInput] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')

  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [hourlyRateError, setHourlyRateError] = useState<string | null>(null)
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
    const trimmedHourlyRate = hourlyRateInput.trim()
    const parsedHourlyRate =
      trimmedHourlyRate === '' ? undefined : Number(trimmedHourlyRate)
    const nextHourlyRateError =
      trimmedHourlyRate !== '' &&
      (parsedHourlyRate === undefined ||
        !Number.isFinite(parsedHourlyRate) ||
        parsedHourlyRate < 0)
        ? 'Lương theo giờ phải lớn hơn hoặc bằng 0.'
        : null

    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPhoneError(nextPhoneError)
    setHourlyRateError(nextHourlyRateError)
    setGeneralError(null)

    if (
      nextNameError ||
      nextEmailError ||
      nextPhoneError ||
      nextHourlyRateError
    ) {
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        roleCode,
        jobTitle: jobTitle.trim() || undefined,
        hourlyRate: parsedHourlyRate,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
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
            <TextField
              hint={nameError}
              id={fullNameId}
              invalid={Boolean(nameError)}
              label="Họ và tên *"
              onChange={(event) => {
                setFullName(event.target.value)
                if (nameError) setNameError(null)
              }}
              placeholder="Nguyễn Hoài An"
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
              placeholder="nv.an@comicpos.vn"
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
              placeholder="0908 000 015"
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
                label="Vai trò"
                onChange={setRoleCode}
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

            <TextField
              hint={hourlyRateError}
              id={hourlyRateId}
              invalid={Boolean(hourlyRateError)}
              label="Lương theo giờ (VNĐ/giờ)"
              min={0}
              onChange={(event) => {
                setHourlyRateInput(event.target.value)
                if (hourlyRateError) setHourlyRateError(null)
              }}
              placeholder="25000"
              step="any"
              type="number"
              value={hourlyRateInput}
              variant="outlined"
            />

            <TextField
              id={bankNameId}
              label="Ngân hàng"
              maxLength={100}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Vietcombank"
              type="text"
              value={bankName}
              variant="outlined"
            />

            <TextField
              id={bankAccountNumberId}
              label="Số tài khoản ngân hàng"
              maxLength={50}
              onChange={(event) => setBankAccountNumber(event.target.value)}
              placeholder="0123456789"
              type="text"
              value={bankAccountNumber}
              variant="outlined"
            />

            <TextField
              label="Trạng thái ban đầu"
              readOnly
              value="Chờ thiết lập mật khẩu"
              variant="outlined"
            />
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
