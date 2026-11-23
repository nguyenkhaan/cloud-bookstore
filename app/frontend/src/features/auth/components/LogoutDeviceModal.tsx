import { useEffect } from 'react'
import { AlertTriangle, Laptop, LogOut, Monitor, Smartphone, Trash2, X } from 'lucide-react'
import { Badge, Button } from '@/components/common'
import type { MockLoginDevice } from '@/features/auth/auth.type'

type LogoutDeviceModalProps = {
  device: MockLoginDevice | null
  onClose: () => void
  onConfirm: (deviceId: string) => void
}

function DeviceIcon({ icon }: { icon: MockLoginDevice['icon'] }) {
  switch (icon) {
    case 'mobile':
      return <Smartphone aria-hidden="true" className="size-5" />
    case 'laptop':
      return <Laptop aria-hidden="true" className="size-5" />
    default:
      return <Monitor aria-hidden="true" className="size-5" />
  }
}

export function LogoutDeviceModal({ device, onClose, onConfirm }: LogoutDeviceModalProps) {
  useEffect(() => {
    if (!device) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [device, onClose])

  if (!device) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        aria-labelledby="logout-device-modal-title"
        aria-modal="true"
        className="w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        data-testid="logout-device-modal"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <LogOut aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900" id="logout-device-modal-title">
                Đăng xuất khỏi thiết bị này?
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Phiên làm việc trên thiết bị sẽ bị chấm dứt ngay lập tức.
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng hộp thoại đăng xuất thiết bị"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <DeviceIcon icon={device.icon} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{device.name}</div>
              <div className="text-xs text-slate-500">Hoạt động lần cuối: {device.lastActive}</div>
            </div>
          </div>
          <Badge dot size="sm" variant="success">
            Đang sử dụng
          </Badge>
        </div>

        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            Người dùng trên thiết bị này sẽ bị đăng xuất ngay lập tức và phải nhập lại mật khẩu để tiếp tục sử dụng hệ thống.
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          <Button
            className="min-h-11 px-4"
            onClick={onClose}
            size="md"
            type="button"
            variant="secondary"
          >
            Hủy bỏ
          </Button>
          <Button
            className="min-h-11 px-4"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
            onClick={() => onConfirm(device.id)}
            size="md"
            type="button"
            variant="danger"
          >
            Đăng xuất thiết bị
          </Button>
        </div>
      </div>
    </div>
  )
}
