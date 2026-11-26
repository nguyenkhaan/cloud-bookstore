import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/common'
import { useAuth } from '@/features/auth/auth.hook'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordModal'

const linkClassName = 'inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600'

export function FirstChangePasswordPage() {
  const { signOut } = useAuth()
  const [succeeded, setSucceeded] = useState(false)

  return (
    <CenterLayout>
      <Card aria-labelledby="change-password-title" className="mx-auto w-full max-w-[560px] rounded-3xl border-slate-200/70 p-6 shadow-sm sm:p-10" padding="none" role="region">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]" id="change-password-title">
          {succeeded ? 'Đổi mật khẩu thành công' : 'Đổi mật khẩu tài khoản'}
        </h1>
        {succeeded ? (
          <div className="mt-4">
            <p className="text-sm text-slate-700" role="status">Phiên hiện tại vẫn hoạt động. Các thiết bị khác đã được đăng xuất.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className={linkClassName} to="/profile">Về hồ sơ</Link>
              <Link className={linkClassName} to="/dashboard">Về tổng quan</Link>
            </div>
          </div>
        ) : (
          <>
            <ChangePasswordForm onSuccess={() => setSucceeded(true)} submitTestId="auth-first-change-submit" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Link className={linkClassName} to="/profile">Về hồ sơ</Link>
              <Button className="min-h-11" onClick={signOut} type="button" variant="ghost">Đăng xuất</Button>
            </div>
          </>
        )}
      </Card>
    </CenterLayout>
  )
}

export default FirstChangePasswordPage
