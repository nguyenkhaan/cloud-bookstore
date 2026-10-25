import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/common/Button/Button'
import { FormAlert } from '../../components/common/FormAlert'
import { TextField } from '../../components/common/TextField/TextField'
import { AuthLayout } from '../../components/layout/AuthLayout/AuthLayout'
import { authApi } from '../../features/auth/services/authApi'
import { parseApiError } from '../../utils/apiError'

const schema = z
    .object({
        fullName: z.string().trim().min(1, 'Nhập họ và tên.').max(150, 'Họ tên tối đa 150 ký tự.'),
        email: z.string().trim().min(1, 'Nhập email.').email('Email không hợp lệ.'),
        phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.'),
        password: z
            .string()
            .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
            .regex(/[a-z]/, 'Mật khẩu cần có chữ thường.')
            .regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa.')
            .regex(/\d/, 'Mật khẩu cần có chữ số.'),
        confirmPassword: z.string().min(1, 'Nhập lại mật khẩu.'),
    })
    .refine((v) => v.password === v.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Mật khẩu nhập lại không khớp.',
    })
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
    const navigate = useNavigate()
    const [apiError, setApiError] = useState('')
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({ resolver: zodResolver(schema) })

    const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...payload }) => {
        setApiError('')
        try {
            const result = await authApi.register(payload)
            // Tạm thời BE trả token kích hoạt ngay trong response; khi S02 chuyển sang OTP qua email thì bỏ phần state này.
            navigate('/verify', { state: { token: result.activation, email: result.email } })
        } catch (error) {
            setApiError(parseApiError(error).message)
        }
    })

    return (
        <AuthLayout
            title="Đăng ký tài khoản"
            description="Chỉ email đã được Admin cho phép mới kích hoạt được tài khoản."
            footer={
                <p>
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="font-medium text-teal-800 underline underline-offset-2">
                        Đăng nhập
                    </Link>
                </p>
            }
        >
            <form onSubmit={onSubmit} noValidate className="space-y-5">
                {apiError && <FormAlert message={apiError} />}
                <TextField label="Họ và tên" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
                <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <TextField
                    label="Số điện thoại"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    error={errors.phone?.message}
                    {...register('phone')}
                />
                <TextField
                    label="Mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số."
                    error={errors.password?.message}
                    {...register('password')}
                />
                <TextField
                    label="Nhập lại mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />
                <Button type="submit" loading={isSubmitting} className="w-full">
                    Đăng ký
                </Button>
            </form>
        </AuthLayout>
    )
}