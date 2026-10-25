import { useState } from 'react'
import { Button } from '../../../components/common/Button/Button'
import { useAuth } from '../hooks/useAuth'

export function LogoutButton() {
    const { logout } = useAuth()
    const [pending, setPending] = useState(false)

    async function handleClick() {
        setPending(true)
        // Sau khi logout, status chuyển 'anonymous' và ProtectedRoute tự đưa về /login.
        await logout()
    }

    return (
        <Button variant="ghost" onClick={handleClick} loading={pending}>
            Đăng xuất
        </Button>
    )
}