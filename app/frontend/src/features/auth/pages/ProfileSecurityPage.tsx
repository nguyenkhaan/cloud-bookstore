import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { Avatar, Badge, Button, Card, notify, SelectBox, TextField } from '@/components/common'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/auth.hook'
import {
  DEFAULT_SHIFT_OPTIONS,
  getMockProfileForUser,
  getRoleBadgeLabel,
  getRolePermissionLabel,
  INITIAL_MOCK_DEVICES,
  INITIAL_MOCK_NOTIFICATION_PREFS,
} from '@/features/auth/auth.mock'
import type { MockLoginDevice, MockNotificationPrefs } from '@/features/auth/auth.type'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'
import { LogoutDeviceModal } from '@/features/auth/components/LogoutDeviceModal'
import { workspacePathFor } from '@/features/workspace/workspace.route'

function LockedSuffix() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 select-none">
      <Lock aria-hidden="true" className="size-3.5" />
      <span>Cố định</span>
    </span>
  )
}

function DeviceTypeIcon({ icon }: { icon: MockLoginDevice['icon'] }) {
  switch (icon) {
    case 'mobile':
      return <Smartphone aria-hidden="true" className="size-4" />
    case 'laptop':
      return <Laptop aria-hidden="true" className="size-4" />
    default:
      return <Monitor aria-hidden="true" className="size-4" />
  }
}

type ToggleSwitchProps = {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle?: () => void
}

function ToggleSwitch({ checked, disabled = false, label, onToggle }: ToggleSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 motion-reduce:transition-none',
        checked ? 'bg-indigo-600' : 'bg-slate-200',
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
      )}
      disabled={disabled}
      onClick={onToggle}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform motion-reduce:transition-none',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function ProfileSecurityPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
    email: 'minhanh@nhasachmay.vn',
  }

  const initialExtras = useMemo(() => getMockProfileForUser(session?.user), [session?.user])

  const [savedProfile, setSavedProfile] = useState(() => ({
    fullName: currentUser.name,
    phone: initialExtras.phone,
    defaultShift: initialExtras.defaultShift,
  }))
  const [fullName, setFullName] = useState(savedProfile.fullName)
  const [phone, setPhone] = useState(savedProfile.phone)
  const [defaultShift, setDefaultShift] = useState(savedProfile.defaultShift)
  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(currentUser.avatarUrl)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lastPasswordChangedLabel, setLastPasswordChangedLabel] = useState(
    initialExtras.lastPasswordChangedLabel,
  )
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)

  const [devices, setDevices] = useState<MockLoginDevice[]>(INITIAL_MOCK_DEVICES)
  const [deviceToLogout, setDeviceToLogout] = useState<MockLoginDevice | null>(null)

  const [notificationPrefs, setNotificationPrefs] = useState<MockNotificationPrefs>(
    INITIAL_MOCK_NOTIFICATION_PREFS,
  )

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const roleBadgeLabel = getRoleBadgeLabel(currentUser.roleCode, currentUser.role)
  const rolePermissionLabel = getRolePermissionLabel(currentUser.roleCode, currentUser.role)
  const hasOtherActiveDevices = devices.some((d) => !d.isCurrent && d.status === 'active')

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }
    const nextUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextUrl
    setAvatarPreviewUrl(nextUrl)
    notify.success('Đã cập nhật ảnh đại diện xem trước.')
  }

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = fullName.trim()
    const normalizedPhone = phone.replace(/\s+/g, '')

    let hasError = false
    if (normalizedName.length < 2) {
      setNameError('Vui lòng nhập họ và tên tối thiểu 2 ký tự.')
      hasError = true
    } else {
      setNameError(null)
    }

    if (!/^0\d{9}$/.test(normalizedPhone)) {
      setPhoneError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.')
      hasError = true
    } else {
      setPhoneError(null)
    }

    if (hasError) return

    setSavedProfile({
      fullName: normalizedName,
      phone: phone.trim(),
      defaultShift,
    })
    notify.success('Đã lưu thông tin hồ sơ cá nhân.')
  }

  const handleResetProfile = () => {
    setFullName(savedProfile.fullName)
    setPhone(savedProfile.phone)
    setDefaultShift(savedProfile.defaultShift)
    setNameError(null)
    setPhoneError(null)
  }

  const handlePasswordUpdated = () => {
    setIsChangePasswordOpen(false)
    setLastPasswordChangedLabel('Vừa cập nhật (Hôm nay)')
    notify.success('Đã cập nhật mật khẩu tài khoản thành công.')
  }

  const handleConfirmLogoutDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, status: 'logged_out' } : device,
      ),
    )
    setDeviceToLogout(null)
    notify.success('Đã đăng xuất phiên làm việc trên thiết bị đã chọn.')
  }

  const handleLogoutAllOtherDevices = () => {
    if (!hasOtherActiveDevices) return
    setDevices((prev) =>
      prev.map((device) =>
        device.isCurrent ? device : { ...device, status: 'logged_out' },
      ),
    )
    notify.success('Đã đăng xuất tất cả các thiết bị khác.')
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Cá nhân' },
        { label: 'Hồ sơ cá nhân & Bảo mật' },
      ]}
      currentPath=""
      onNavigate={(id) => {
        const path = workspacePathFor(id)
        if (path) navigate(path)
      }}
      onSignOut={signOut}
      user={{
        name: savedProfile.fullName,
        role: currentUser.role,
        avatarUrl: avatarPreviewUrl,
      }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Hồ sơ cá nhân &amp; Bảo mật
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý thông tin tài khoản và những thiết bị bạn tin cậy.
          </p>
        </div>

        {/* Section 1: Personal Info */}
        <Card
          padding="lg"
          subtitle="Thông tin định danh và phân quyền tài khoản trên hệ thống Mây Portal."
          title="Thông tin cá nhân"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
            <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 text-center">
              <Avatar
                className="h-20 w-20 text-2xl"
                imageUrl={avatarPreviewUrl}
                name={fullName || currentUser.name}
              />
              <h2 className="mt-3.5 text-base font-bold text-slate-900">
                {fullName.trim() || currentUser.name}
              </h2>
              <Badge className="mt-2" size="md" variant="brand">
                {roleBadgeLabel}
              </Badge>

              <ul className="mt-4 w-full space-y-1.5 border-t border-slate-200/70 pt-4 text-left text-xs text-slate-600">
                <li>• Mã nhân viên: {initialExtras.employeeCode}</li>
                <li>• Cơ sở: {initialExtras.branch}</li>
                <li>• Ngày gia nhập: {initialExtras.joinedAt}</li>
              </ul>

              <input
                accept="image/*"
                aria-label="Chọn ảnh đại diện mới"
                className="hidden"
                onChange={handleAvatarChange}
                ref={fileInputRef}
                type="file"
              />
              <Button
                className="mt-4 min-h-11"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                Thay đổi ảnh đại diện
              </Button>
            </div>

            <form className="flex flex-col justify-between" noValidate onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  hint={nameError}
                  invalid={Boolean(nameError)}
                  label="Họ và tên *"
                  name="fullName"
                  onChange={(event) => {
                    setFullName(event.target.value)
                    setNameError(null)
                  }}
                  required
                  type="text"
                  value={fullName}
                  variant="outlined"
                />

                <TextField
                  hint="Tên đăng nhập nội bộ do Admin cấp."
                  label="Tên đăng nhập"
                  name="username"
                  readOnly
                  suffix={<LockedSuffix />}
                  type="text"
                  value={initialExtras.username}
                  variant="outlined"
                />

                <TextField
                  hint={phoneError}
                  invalid={Boolean(phoneError)}
                  label="Số điện thoại *"
                  name="phone"
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setPhoneError(null)
                  }}
                  required
                  type="tel"
                  value={phone}
                  variant="outlined"
                />

                <TextField
                  hint="Email chỉ có thể thay đổi bởi Quản trị viên."
                  label="Email định danh"
                  name="email"
                  readOnly
                  suffix={<LockedSuffix />}
                  type="email"
                  value={currentUser.email ?? 'minhanh@nhasachmay.vn'}
                  variant="outlined"
                />

                <TextField
                  label="Chức vụ & Quyền hạn"
                  name="rolePermission"
                  readOnly
                  suffix={<LockedSuffix />}
                  type="text"
                  value={rolePermissionLabel}
                  variant="outlined"
                />

                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                    Ca làm việc mặc định
                  </span>
                  <SelectBox
                    hideLabel
                    label="Ca làm việc mặc định"
                    onChange={setDefaultShift}
                    options={DEFAULT_SHIFT_OPTIONS}
                    searchable={false}
                    value={defaultShift}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  className="min-h-11 px-5"
                  data-testid="profile-save-btn"
                  size="md"
                  type="submit"
                  variant="primary"
                >
                  Lưu thông tin
                </Button>
                <Button
                  className="min-h-11 px-5"
                  onClick={handleResetProfile}
                  size="md"
                  type="button"
                  variant="secondary"
                >
                  Hủy thay đổi
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Section 2: Security & Password */}
        <Card
          padding="lg"
          subtitle="Quản lý mật khẩu truy cập cho tài khoản nhân viên."
          title="Bảo mật & Mật khẩu"
        >
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <KeyRound aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Mật khẩu tài khoản</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  •••••••••••• · Lần đổi gần nhất: {lastPasswordChangedLabel}
                </div>
              </div>
            </div>

            <Button
              className="min-h-11 shrink-0"
              data-testid="profile-change-password-btn"
              icon={<KeyRound aria-hidden="true" className="size-4" />}
              onClick={() => setIsChangePasswordOpen(true)}
              size="md"
              type="button"
              variant="outline"
            >
              Đổi mật khẩu
            </Button>
          </div>
        </Card>

        {/* Section 3: Devices & Sessions */}
        <Card
          padding="lg"
          subtitle="Danh sách các thiết bị và trình duyệt đang hoặc từng đăng nhập vào tài khoản của bạn."
          title="Thiết bị & Phiên đăng nhập"
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full min-w-[600px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Thiết bị &amp; Trình duyệt</th>
                  <th className="px-4 py-3 font-semibold">Hoạt động gần nhất</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {devices.map((device) => {
                  const isActive = device.status === 'active'
                  return (
                    <tr className="transition-colors hover:bg-slate-50/50" key={device.id}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                              isActive
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-slate-100 text-slate-500',
                            )}
                          >
                            <DeviceTypeIcon icon={device.icon} />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'text-xs font-semibold',
                                isActive ? 'text-slate-900' : 'text-slate-500',
                              )}
                            >
                              {device.name}
                            </span>
                            {device.isCurrent && (
                              <Badge size="xs" variant="brand">
                                Phiên này
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{device.lastActive}</td>
                      <td className="px-4 py-3.5">
                        {isActive ? (
                          <Badge dot size="sm" variant="success">
                            Đang sử dụng
                          </Badge>
                        ) : (
                          <Badge dot size="sm" variant="neutral">
                            Đã đăng xuất
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {device.isCurrent ? (
                          <span className="text-xs text-slate-400">Thiết bị hiện tại</span>
                        ) : isActive ? (
                          <Button
                            className="min-h-11 border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                            data-testid={`device-logout-btn-${device.id}`}
                            icon={<Trash2 aria-hidden="true" className="size-3.5" />}
                            onClick={() => setDeviceToLogout(device)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Đăng xuất
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Đã kết thúc</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button
              className="min-h-11"
              disabled={!hasOtherActiveDevices}
              icon={<LogOut aria-hidden="true" className="size-4" />}
              onClick={handleLogoutAllOtherDevices}
              size="md"
              type="button"
              variant="secondary"
            >
              Đăng xuất tất cả thiết bị khác
            </Button>
          </div>
        </Card>

        {/* Section 4: Notification Preferences */}
        <Card
          padding="lg"
          subtitle="Kiểm soát các loại thông báo bạn muốn nhận trên giao diện làm việc và hòm thư."
          title="Tùy chọn thông báo"
        >
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Bell aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Thông báo hệ thống &amp; bảo mật
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Cảnh báo khi có đăng nhập từ thiết bị lạ, cập nhật mật khẩu hoặc phân quyền quản trị.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Badge size="xs" variant="neutral">
                  Bắt buộc
                </Badge>
                <ToggleSwitch
                  checked={notificationPrefs.systemSecurity}
                  disabled
                  label="Thông báo hệ thống & bảo mật"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <CalendarClock aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Thông báo ca làm việc &amp; quầy giao dịch
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nhắc nhở giờ giao ca, thông báo kiểm kê kho và yêu cầu phê duyệt ngoại lệ từ quản lý.
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={notificationPrefs.shiftAndPos}
                label="Thông báo ca làm việc & quầy giao dịch"
                onToggle={() =>
                  setNotificationPrefs((prev) => ({
                    ...prev,
                    shiftAndPos: !prev.shiftAndPos,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Mail aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Bản tin tổng kết qua Email
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Gửi báo cáo tổng hợp doanh số quầy và bảng chấm công chi tiết cuối mỗi tuần.
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={notificationPrefs.weeklyEmailDigest}
                label="Bản tin tổng kết qua Email"
                onToggle={() =>
                  setNotificationPrefs((prev) => ({
                    ...prev,
                    weeklyEmailDigest: !prev.weeklyEmailDigest,
                  }))
                }
              />
            </div>
          </div>
        </Card>
      </div>

      <ChangePasswordModal
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={handlePasswordUpdated}
        open={isChangePasswordOpen}
      />

      <LogoutDeviceModal
        device={deviceToLogout}
        onClose={() => setDeviceToLogout(null)}
        onConfirm={handleConfirmLogoutDevice}
      />
    </MainLayout>
  )
}

export default ProfileSecurityPage
