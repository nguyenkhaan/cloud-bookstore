import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { notify } from '@/components/common/Toast'
import { useCheckDuplicate, useUpdateCustomer } from '../customers.hook'
import {
  getTierBadge,
  isValidVietnamesePhone,
  normalizePhoneNumber,
} from '../customers.presentation'
import type { Customer } from '../customers.type'

export interface EditCustomerDialogProps {
  customer: Customer
  isOpen: boolean
  onClose: () => void
  onSuccess?: (customer: Customer) => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EditCustomerDialog({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: EditCustomerDialogProps) {
  if (!isOpen) return null

  return (
    <EditCustomerDialogForm
      customer={customer}
      key={customer.id}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

function EditCustomerDialogForm({
  customer,
  onClose,
  onSuccess,
}: Omit<EditCustomerDialogProps, 'isOpen'>) {
  const [fullName, setFullName] = useState(customer.fullName)
  const [phone, setPhone] = useState(customer.phone)
  const [debouncedPhone, setDebouncedPhone] = useState('')
  const [email, setEmail] = useState(customer.email ?? '')
  const [nationalId, setNationalId] = useState(customer.nationalId ?? '')
  const [address, setAddress] = useState(customer.address ?? '')
  const [isFlagged, setIsFlagged] = useState(customer.isFlagged)
  const [flagReason, setFlagReason] = useState(customer.flagReason ?? '')

  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const updateCustomerMutation = useUpdateCustomer()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updateCustomerMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, updateCustomerMutation.isPending])

  useEffect(() => {
    const normalized = normalizePhoneNumber(phone)
    if (normalized.length === 10 && normalized !== customer.phone) {
      const timer = setTimeout(() => {
        setDebouncedPhone(normalized)
      }, 350)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setDebouncedPhone('')
    }, 0)
    return () => clearTimeout(timer)
  }, [phone, customer.phone])

  const { data: duplicateData, isFetching: isCheckingDuplicate } = useCheckDuplicate(
    debouncedPhone,
    debouncedPhone.length === 10 && debouncedPhone !== customer.phone,
  )
  const duplicateWarning =
    duplicateData?.isDuplicate && duplicateData.existingCustomer?.id !== customer.id
      ? duplicateData.existingCustomer
      : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setNameError(null)
    setPhoneError(null)
    setEmailError(null)
    setGeneralError(null)

    const trimmedName = fullName.trim()
    const normalizedPhone = normalizePhoneNumber(phone)
    const trimmedEmail = email.trim()

    const nextNameError = !trimmedName ? 'Họ và tên không được để trống' : null
    const nextPhoneError = !isValidVietnamesePhone(normalizedPhone)
      ? 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 chữ số.'
      : null
    const nextEmailError =
      trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)
        ? 'Email không đúng định dạng'
        : null

    if (nextNameError || nextPhoneError || nextEmailError) {
      setNameError(nextNameError)
      setPhoneError(nextPhoneError)
      setEmailError(nextEmailError)
      return
    }

    try {
      const updated = await updateCustomerMutation.mutateAsync({
        id: customer.id,
        request: {
          fullName: trimmedName,
          phone: normalizedPhone,
          email: trimmedEmail || null,
          nationalId: nationalId.trim() || null,
          address: address.trim() || null,
          isFlagged,
          // Send empty string (not null) so backend clears FlagReason when emptied
          flagReason: flagReason.trim(),
        },
      })

      notify.success('Đã cập nhật thông tin khách hàng')
      onSuccess?.(updated)
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật khách hàng'
      if (message.includes('Số điện thoại') || message.includes('409') || message.includes('tồn tại')) {
        setPhoneError(message)
      } else if (message.toLowerCase().includes('email')) {
        setEmailError(message)
      } else {
        setGeneralError(message)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity motion-reduce:transition-none"
        onClick={() => {
          if (!updateCustomerMutation.isPending) onClose()
        }}
      />

      <div
        aria-describedby="edit-customer-desc"
        aria-labelledby="edit-customer-title"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="edit-customer-title">
              Chỉnh sửa thông tin khách hàng
            </h2>
            <p className="mt-1 text-xs text-slate-600" id="edit-customer-desc">
              Cập nhật thông tin liên hệ, định danh CCCD và trạng thái theo dõi thuê sách.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại chỉnh sửa"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-40"
            disabled={updateCustomerMutation.isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          {generalError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
              role="alert"
            >
              {generalError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              autoFocus
              hint={nameError}
              invalid={Boolean(nameError)}
              label="Họ và tên *"
              onChange={(event) => {
                setNameError(null)
                setFullName(event.target.value)
              }}
              placeholder="Nguyễn An Nhiên"
              required
              value={fullName}
            />

            <TextField
              hint={phoneError}
              invalid={Boolean(phoneError)}
              label="Số điện thoại *"
              onChange={(event) => {
                setPhone(event.target.value)
                setPhoneError(null)
              }}
              placeholder="0901 234 890"
              required
              value={phone}
            />
          </div>

          {duplicateWarning && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
              role="alert"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Phát hiện số điện thoại đã tồn tại!</p>
                <p className="mt-0.5">
                  Số điện thoại này thuộc về khách hàng:{' '}
                  <strong>{duplicateWarning.fullName}</strong> (
                  <span className="font-medium text-amber-900">
                    Hạng {getTierBadge(duplicateWarning.tierName).label}
                  </span>
                  ).
                </p>
              </div>
            </div>
          )}

          {isCheckingDuplicate && (
            <p className="text-[11px] italic text-slate-600">
              Đang kiểm tra trùng số điện thoại...
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              hint={emailError}
              invalid={Boolean(emailError)}
              label="Email (tùy chọn)"
              onChange={(event) => {
                setEmailError(null)
                setEmail(event.target.value)
              }}
              placeholder="khachhang@example.com"
              type="email"
              value={email}
            />

            <TextField
              label="CCCD / Số định danh (tùy chọn)"
              onChange={(event) => setNationalId(event.target.value)}
              placeholder="0790xxxxxxxx"
              value={nationalId}
            />
          </div>

          <TextField
            label="Địa chỉ (tùy chọn)"
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện..."
            value={address}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                checked={isFlagged}
                className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                onChange={(event) => setIsFlagged(event.target.checked)}
                type="checkbox"
              />
              <span className="text-xs">
                <span className="block font-semibold text-slate-800">
                  Cần theo dõi / Chặn quyền thuê sách mới
                </span>
                <span className="block text-[11px] text-slate-600">
                  Bật khi khách hàng có nghĩa vụ chưa thanh toán hoặc vi phạm cần tạm khóa thuê sách.
                </span>
              </span>
            </label>

            <TextField
              label="Lý do theo dõi / ghi chú (tùy chọn)"
              onChange={(event) => setFlagReason(event.target.value)}
              placeholder="Ví dụ: Quá hạn phiếu thuê hoặc cần xác minh địa chỉ..."
              value={flagReason}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              disabled={updateCustomerMutation.isPending}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Hủy bỏ
            </Button>
            <Button
              loading={updateCustomerMutation.isPending}
              type="submit"
              variant="primary"
            >
              {updateCustomerMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
