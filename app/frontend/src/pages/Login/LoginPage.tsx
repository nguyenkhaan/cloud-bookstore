import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/common/Button/Button'
import { FormAlert } from '../../components/common/FormAlert'
import { TextField } from '../../components/common/TextField/TextField'
import { AuthLayout } from '../../components/layout/AuthLayout/AuthLayout'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { parseApiError } from '../../utils/apiError'

const schema = z.object({
    email: z.string().trim().min(1, 'Nhập email.').email('Email không hợp lệ.'),
    password: z.string().min(1, 'Nhập mật khẩu.'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
    const { login } = useAuth()
    const [apiError, setApiError] = useState('')
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) })

    // Đăng nhập xong, PublicOnlyRoute tự chuyển tới trang đang định vào.
    const onSubmit = handleSubmit(async (values) => {
        setApiError('')
        try {
            await login(values)
        } catch (error) {
            setApiError(parseApiError(error).message)
        }
    })

    return (
        <AuthLayout
            title="Đăng nhập"
            description="Dùng tài khoản nhân viên đã được Admin cho phép."
            footer={
                <p>
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="font-medium text-teal-800 underline underline-offset-2">
                        Đăng ký
                    </Link>
                </p>
            }
        >
            <form onSubmit={onSubmit} noValidate className="space-y-5">
                {apiError && <FormAlert message={apiError} />}
                <TextField label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
                <TextField
                    label="Mật khẩu"
                    type="password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password')}
                />
                <Button type="submit" loading={isSubmitting} className="w-full">
                    Đăng nhập
                </Button>
            </form>
        </AuthLayout>
    )
}