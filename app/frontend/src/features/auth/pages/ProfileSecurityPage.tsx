import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, KeyRound, Laptop, Monitor, Smartphone } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { Avatar, Badge, Button, Card, notify, TextField } from '@/components/common'
import { Banner } from '@/features/auth/components/Banner'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'
import { LogoutDeviceModal } from '@/features/auth/components/LogoutDeviceModal'
import {
  useAuth, useProfileQuery, useRevokeOtherSessionsMutation, useRevokeSessionMutation,
  useSessionsQuery, useUpdateProfileAvatarMutation, useUpdateProfileMutation,
} from '@/features/auth/auth.hook'
import type { EmployeeProfileResponse, EmployeeSessionResponse, UpdateProfileRequest } from '@/features/auth/auth.type'
import { getRoleBadgeLabel, getRolePermissionLabel } from '@/features/auth/role'
import { uploadImage, validateImageFile } from '@/features/uploads/upload.service'
import { workspacePathFor } from '@/features/workspace/workspace.route'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })
const sessionDateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
const accountStatuses: Record<string, string> = {
  ACTIVE: 'Đang hoạt động', INVITED: 'Đã mời', PENDING_OTP: 'Chờ xác minh', LOCKED: 'Đã khóa', REVOKED: 'Đã thu hồi',
}

export function ProfileSecurityPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: profile, isPending, isError, isFetching, refetch } = useProfileQuery()

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Không gian làm việc', to: '/dashboard' }, { label: 'Hồ sơ cá nhân & Bảo mật' }]}
      currentPath=""
      onNavigate={(id) => {
        const path = workspacePathFor(id)
        if (path) navigate(path)
      }}
      onSignOut={signOut}
      pageTitle="Hồ sơ cá nhân & Bảo mật"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        {isPending && (
          <Card aria-busy="true" role="status">
            <span className="sr-only">Đang tải hồ sơ…</span>
            <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
              <div className="h-16 w-16 rounded-full bg-slate-200" />
              <div className="h-10 max-w-lg rounded-xl bg-slate-100" />
              <div className="h-10 max-w-lg rounded-xl bg-slate-100" />
            </div>
          </Card>
        )}
        {isError && !profile && (
          <Card>
            <Banner tone="error">Không thể tải hồ sơ cá nhân.</Banner>
            <Button className="mt-3 min-h-11" loading={isFetching} onClick={() => void refetch()} type="button" variant="outline">Thử lại</Button>
          </Card>
        )}
        {profile && <ProfileDetails key={profile.id} profile={profile} />}
      </div>
    </MainLayout>
  )
}

export default ProfileSecurityPage

function ProfileDetails({ profile }: { profile: EmployeeProfileResponse }) {
  const avatarInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Partial<UpdateProfileRequest>>({})
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const updateProfile = useUpdateProfileMutation()
  const updateAvatar = useUpdateProfileAvatarMutation()
  const fullName = draft.fullName ?? profile.fullName
  const phone = draft.phone ?? profile.phone
  const dirty = fullName !== profile.fullName || phone !== profile.phone
  const busy = updateProfile.isPending || Boolean(avatarPreview)

  function resetDraft() {
    setDraft({})
    setErrors({})
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !dirty) return
    const next = { fullName: fullName.trim(), phone: phone.trim() }
    const nextErrors: typeof errors = {}
    if (next.fullName.length < 2 || next.fullName.length > 200) nextErrors.fullName = 'Họ và tên phải có 2 đến 200 ký tự.'
    if (!/^0[0-9]{9}$/.test(next.phone)) nextErrors.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      await updateProfile.mutateAsync(next)
      resetDraft()
      notify.success('Đã lưu thông tin hồ sơ.')
    } catch {
      notify.error('Không thể lưu thông tin hồ sơ. Vui lòng thử lại.')
    }
  }

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || busy) return
    const invalid = validateImageFile(file)
    if (invalid) {
      notify.error(invalid)
      return
    }

    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    try {
      const { imageUpload } = await uploadImage('EMPLOYEE_AVATAR', file)
      await updateAvatar.mutateAsync(imageUpload)
      notify.success('Đã cập nhật ảnh đại diện.')
    } catch {
      notify.error('Không thể cập nhật ảnh đại diện. Vui lòng thử lại.')
    } finally {
      setAvatarPreview(null)
      URL.revokeObjectURL(preview)
    }
  }

  return (
    <>
      <Card aria-labelledby="profile-identity-title" className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900" id="profile-identity-title">Thông tin cá nhân</h2>
        <div className="my-5 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
          <Avatar className="size-16 text-xl" imageUrl={avatarPreview ?? profile.avatarUrl} name={profile.fullName} />
          <div className="min-w-0 flex-1 basis-44">
            <p className="wrap-anywhere font-semibold text-slate-900">{profile.fullName}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="brand">{getRoleBadgeLabel(profile.role)}</Badge>
              <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'neutral'}>{accountStatuses[profile.status] ?? 'Không xác định'}</Badge>
            </div>
            <p className="mt-2 text-xs text-slate-600">Mã tài khoản: {profile.id.slice(0, 8)} · Ngày tham gia: {dateFormatter.format(new Date(profile.createdAt))}</p>
          </div>
          <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void selectAvatar(event)} ref={avatarInput} type="file" />
          <Button className="min-h-11" disabled={busy} icon={<ImagePlus aria-hidden="true" className="size-4" />} loading={Boolean(avatarPreview)} onClick={() => avatarInput.current?.click()} type="button" variant="outline">
            {avatarPreview ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}
          </Button>
        </div>
        <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(event) => void save(event)}>
          <TextField disabled={busy} hint={errors.fullName} invalid={Boolean(errors.fullName)} label="Họ và tên" name="fullName" onChange={(event) => {
            setDraft({ ...draft, fullName: event.target.value })
            setErrors({ ...errors, fullName: undefined })
          }} required value={fullName} variant="outlined" />
          <TextField autoComplete="tel" disabled={busy} hint={errors.phone} invalid={Boolean(errors.phone)} label="Số điện thoại" name="phone" onChange={(event) => {
            setDraft({ ...draft, phone: event.target.value })
            setErrors({ ...errors, phone: undefined })
          }} required type="tel" value={phone} variant="outlined" />
          <div aria-labelledby="profile-email-label" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-sm font-medium text-slate-700" id="profile-email-label">Email nội bộ</span>
            <p className="break-all select-text text-sm text-slate-900" role="textbox" aria-readonly="true">{profile.email}</p>
          </div>
          <div aria-labelledby="profile-role-label" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-sm font-medium text-slate-700" id="profile-role-label">Vai trò</span>
            <p className="break-words select-text text-sm text-slate-900" role="textbox" aria-readonly="true">{getRolePermissionLabel(profile.role)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Button className="min-h-11" disabled={busy || !dirty} onClick={resetDraft} type="button" variant="ghost">Hủy thay đổi</Button>
            <Button className="min-h-11" data-testid="profile-save-btn" disabled={busy || !dirty} loading={updateProfile.isPending} type="submit" variant="primary">
              {updateProfile.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
            </Button>
          </div>
        </form>
      </Card>

      <Card aria-labelledby="profile-password-title" className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="profile-password-title">Mật khẩu</h2>
            <p aria-label="Mật khẩu được ẩn" className="mt-1 tracking-widest text-slate-700">••••••••</p>
            <p className="mt-1 text-xs text-slate-600">Đổi lần cuối: {profile.passwordChangedAt ? dateFormatter.format(new Date(profile.passwordChangedAt)) : 'Chưa ghi nhận'}</p>
          </div>
          <Button className="min-h-11" data-testid="profile-change-password-btn" icon={<KeyRound aria-hidden="true" className="size-4" />} onClick={() => setShowPasswordModal(true)} type="button" variant="outline">Đổi mật khẩu</Button>
        </div>
      </Card>

      <DeviceSessions />
      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}

function DeviceSessions() {
  const { data: devices = [], isPending, isError, isFetching, refetch } = useSessionsQuery()
  const revokeSession = useRevokeSessionMutation()
  const revokeOthers = useRevokeOtherSessionsMutation()
  const [device, setDevice] = useState<EmployeeSessionResponse | null>(null)
  const bulkTrigger = useRef<HTMLButtonElement>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [bulkActionError, setBulkActionError] = useState<string | null>(null)
  const isRevoking = revokeSession.isPending || revokeOthers.isPending

  async function confirmRevoke() {
    if (isRevoking || !device) return
    setActionError(null)
    try {
      await revokeSession.mutateAsync(device.id)
      setDevice(null)
      notify.success('Đã đăng xuất khỏi thiết bị.')
      bulkTrigger.current?.focus()
    } catch {
      setActionError('Không thể đăng xuất thiết bị. Vui lòng thử lại.')
    }
  }

  async function revokeOtherDevices() {
    if (isRevoking) return
    setBulkActionError(null)
    try {
      const { revokedCount } = await revokeOthers.mutateAsync()
      notify.success(revokedCount > 0 ? `Đã đăng xuất ${revokedCount} thiết bị khác.` : 'Không có thiết bị khác đang hoạt động.')
    } catch {
      setBulkActionError('Không thể đăng xuất các thiết bị khác. Vui lòng thử lại.')
    }
  }

  return (
    <Card aria-labelledby="profile-sessions-title" className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900" id="profile-sessions-title">Thiết bị &amp; Phiên đăng nhập</h2>
        <Button className="min-h-11" disabled={isRevoking || !devices.some((item) => !item.isCurrent && item.status === 'ACTIVE')} onClick={() => void revokeOtherDevices()} ref={bulkTrigger} type="button" variant="outline">Đăng xuất tất cả thiết bị khác</Button>
      </div>
      {bulkActionError && <div className="mb-4"><Banner tone="error">{bulkActionError}</Banner></div>}
      {isPending && <p className="py-3 text-sm text-slate-600" role="status">Đang tải phiên đăng nhập…</p>}
      {isError && (
        <div className="space-y-2">
          <Banner tone="error">Không thể tải danh sách thiết bị.</Banner>
          <Button className="min-h-11" loading={isFetching} onClick={() => void refetch()} type="button" variant="outline">Thử lại</Button>
        </div>
      )}
      {!isPending && !isError && devices.length === 0 && <p className="py-3 text-sm text-slate-600">Không có phiên đăng nhập gần đây.</p>}
      {devices.length > 0 && (
        <div className="relative max-w-full overflow-x-auto">
          <table aria-label="Danh sách phiên đăng nhập" className="block w-full text-left text-sm sm:table" role="table">
            <thead className="sr-only border-b border-slate-200 bg-slate-50 text-xs text-slate-600 sm:not-sr-only sm:table-header-group" role="rowgroup">
              <tr>
                <th className="px-3 py-2" scope="col">Thiết bị / Trình duyệt</th>
                <th className="px-3 py-2" scope="col">Hoạt động lần cuối</th>
                <th className="px-3 py-2" scope="col">Trạng thái</th>
                <th className="px-3 py-2 text-right" scope="col"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-slate-100 sm:table-row-group" role="rowgroup">
              {devices.map((item) => {
                const DeviceIcon = item.deviceType === 'mobile' ? Smartphone : item.deviceType === 'laptop' ? Laptop : Monitor
                const active = item.status === 'ACTIVE'
                return (
                  <tr className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-2 sm:table-row" key={item.id} role="row">
                    <th className="font-medium text-slate-800 sm:px-3 sm:py-2" role="rowheader" scope="row"><span className="flex items-center gap-2 wrap-anywhere"><DeviceIcon aria-hidden="true" className="size-4 shrink-0 text-slate-500" />{item.deviceName}</span></th>
                    <td className="col-start-1 row-start-2 text-xs text-slate-600 sm:px-3 sm:py-2 sm:text-sm" role="cell"><time dateTime={item.lastActiveAt}>{sessionDateFormatter.format(new Date(item.lastActiveAt))}</time></td>
                    <td className="col-start-2 row-start-2 text-right sm:px-3 sm:py-2 sm:text-left" role="cell"><Badge variant={active ? 'success' : 'neutral'}>{active ? 'Đang hoạt động' : 'Đã đăng xuất'}</Badge></td>
                    <td className="col-start-2 row-start-1 text-right sm:px-3 sm:py-2" role="cell">
                      {item.isCurrent ? <span className="text-xs font-semibold text-indigo-700">Phiên này</span> : active && (
                        <Button className="min-h-11 whitespace-nowrap" data-testid={`device-logout-btn-${item.id}`} disabled={isRevoking} onClick={() => {
                          setActionError(null)
                          setDevice(item)
                        }} type="button" variant="ghost">Đăng xuất</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {device && <LogoutDeviceModal device={device} error={actionError} isPending={revokeSession.isPending} onClose={() => setDevice(null)} onConfirm={() => void confirmRevoke()} />}
    </Card>
  )
}
