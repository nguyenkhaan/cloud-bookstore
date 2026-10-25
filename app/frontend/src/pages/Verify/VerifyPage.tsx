import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button/Button'
import { FormAlert } from '../../components/common/FormAlert'
import { TextField } from '../../components/common/TextField/TextField'
import { AuthLayout } from '../../components/layout/AuthLayout/AuthLayout'
import { authApi } from '../../features/auth/services/authApi'
import { parseApiError } from '../../utils/apiError'

type VerifyState = 'idle' | 'loading' | 'success' | 'error'

export default function VerifyPage() {
    const location = useLocation()
    const [params] = useSearchParams()
    // Token đến từ trang đăng ký (router state) hoặc từ link ?token=...
    const initialToken = (location.state as { token?: string } | null)?.token ?? params.get('token') ?? ''

    const [token, setToken] = useState(initialToken)
    const [state, setState] = useState<VerifyState>(initialToken ? 'loading' : 'idle')
    const [error, setError] = useState('')
    const started = useRef(false)

    const run = useCallback(async (value: string) => {
        setState('loading')
        setError('')
        try {
            await authApi.verify(value.trim())
            setState('success')
        } catch (err) {
            setError(parseApiError(err).message)
            setState('error')
        }
    }, [])

    useEffect(() => {
        if (initialToken && !started.current) {
            started.current = true
            void run(initialToken)
        }
    }, [initialToken, run])

    if (state === 'success') {
        return (
            <AuthLayout title="Tài khoản đã được kích hoạt" description="Bạn có thể đăng nhập ngay bây giờ.">
                <Link
                    to="/login"
                    className="inline-flex w-full items-center justify-center rounded-md bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                    Đến trang đăng nhập
                </Link>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Xác minh tài khoản"
            description={state === 'loading' ? 'Đang xác minh, vui lòng chờ…' : 'Dán mã xác minh để kích hoạt tài khoản.'}
            footer={
                <p>
                    <Link to="/login" className="font-medium text-teal-800 underline underline-offset-2">
                        Quay lại đăng nhập
                    </Link>
                </p>
            }
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault()
                    void run(token)
                }}
                className="space-y-5"
            >
                {state === 'error' && <FormAlert message={error} />}
                <TextField label="Mã xác minh" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="one-time-code" />
                <Button type="submit" loading={state === 'loading'} disabled={!token.trim()} className="w-full">
                    Xác minh
                </Button>
            </form>
        </AuthLayout>
    )
}