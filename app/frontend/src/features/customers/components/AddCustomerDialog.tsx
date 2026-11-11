import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { notify } from '@/components/common/Toast'
import { useCheckDuplicate, useCreateCustomer } from '../customers.hook'
import {
  getTierBadge,
  isValidVietnamesePhone,
  normalizePhoneNumber,
} from '../customers.presentation'
import type { Customer } from '../customers.type'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface AddCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (customer: Customer) => void
}

export function AddCustomerDialog({ isOpen, onClose, onSuccess }: AddCustomerDialogProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [debouncedPhone, setDebouncedPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [address, setAddress] = useState('')

  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const createCustomerMutation = useCreateCustomer()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Debounce phone input for duplicate check
  useEffect(() => {
    if (!isOpen) return

    const normalized = normalizePhoneNumber(phone)
    if (normalized.length === 10) {
      const timer = setTimeout(() => {
        setDebouncedPhone(normalized)
      }, 350)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setDebouncedPhone('')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [phone, isOpen])

  // Query duplicate check via TanStack Query
  const { data: duplicateData, isFetching: isCheckingDuplicate } = useCheckDuplicate(
    debouncedPhone,
    isOpen && debouncedPhone.length === 10
  )
  const duplicateWarning = duplicateData?.isDuplicate ? duplicateData.existingCustomer : null

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

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
      const created = await createCustomerMutation.mutateAsync({
        fullName: trimmedName,
        phone: normalizedPhone,
        email: trimmedEmail || undefined,
        nationalId: nationalId.trim() || undefined,
        address: address.trim() || undefined,
      })

      notify.success('Thêm khách hàng thành công')
      onSuccess?.(created)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo khách hàng'
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl transition-all"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-bold text-slate-900">
              Tạo nhanh khách hàng
            </h2>
            <p id="dialog-desc" className="mt-1 text-xs text-slate-600">
              Thu ngân được xem và tạo nhanh; Quản lý được chỉnh sửa / tạm khóa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
          {generalError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {generalError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-1">
              <TextField
                autoFocus
                label="Họ và tên *"
                placeholder="Nguyễn An Nhiên"
                value={fullName}
                onChange={(e) => {
                  setNameError(null)
                  setFullName(e.target.value)
                }}
                invalid={Boolean(nameError)}
                hint={nameError}
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <TextField
                label="Số điện thoại *"
                placeholder="0901 234 890"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setPhoneError(null)
                }}
                invalid={Boolean(phoneError)}
                hint={phoneError}
                required
              />
            </div>
          </div>

          {/* Duplicate candidate warning banner */}
          {duplicateWarning && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Phát hiện số điện thoại đã tồn tại!</p>
                <p className="mt-0.5">
                  Số điện thoại này đã được đăng ký bởi khách hàng:{' '}
                  <strong>{duplicateWarning.fullName}</strong> (
                  <span className="font-medium text-amber-900">
                    Hạng {getTierBadge(duplicateWarning.tierName).label}
                  </span>
                  ). Vui lòng kiểm tra lại trước khi tạo!
                </p>
              </div>
            </div>
          )}

          {isCheckingDuplicate && (
            <div className="text-[11px] text-slate-600 italic">
              Đang kiểm tra trùng số điện thoại...
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-1">
              <TextField
                label="Email (tùy chọn)"
                type="email"
                placeholder="khachhang@example.com"
                value={email}
                onChange={(e) => {
                  setEmailError(null)
                  setEmail(e.target.value)
                }}
                invalid={Boolean(emailError)}
                hint={emailError}
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <TextField
                label="CCCD / Số định danh (tùy chọn)"
                placeholder="0790xxxxxxxx"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <TextField
              label="Địa chỉ (tùy chọn)"
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <p className="text-[11px] text-slate-600">
            Khách hàng mới sẽ được tự động kích hoạt ở <strong>Hạng Thường</strong> với chi tiêu tích lũy bắt đầu từ 0 đ.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createCustomerMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Đang thêm...
                </span>
              ) : (
                'Thêm khách hàng · Hạng Thường'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
