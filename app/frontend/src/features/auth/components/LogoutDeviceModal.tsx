import { useEffect, useRef } from 'react'
import { Button } from '@/components/common'
import type { EmployeeSessionResponse } from '../auth.type'
import { Banner } from './Banner'

const sessionDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
})

type LogoutDeviceModalProps = {
  device: EmployeeSessionResponse
  error: string | null
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutDeviceModal({ device, error, isPending, onClose, onConfirm }: LogoutDeviceModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog aria-labelledby="logout-device-modal-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50" data-testid="logout-device-modal" ref={dialog} onCancel={(event) => {
      event.preventDefault()
      if (!isPending) onClose()
    }}>
      <h2 className="text-xl font-bold text-slate-900" id="logout-device-modal-title">Đăng xuất khỏi thiết bị này?</h2>
      <p className="mt-3 wrap-anywhere text-sm font-medium text-slate-800">{device.deviceName}</p>
      <p className="mt-1 text-sm text-slate-600">Hoạt động lần cuối: {sessionDateFormatter.format(new Date(device.lastActiveAt))}</p>
      {error && <div className="mt-4"><Banner tone="error">{error}</Banner></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button className="min-h-11" disabled={isPending} onClick={onClose} type="button" variant="outline">Hủy</Button>
        <Button className="min-h-11" loading={isPending} onClick={onConfirm} type="button" variant="danger">
          {isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </Button>
      </div>
    </dialog>
  )
}
