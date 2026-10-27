import { createContext } from 'react'

export type Session = { accessToken: string; refreshToken: string }

export type AuthContextValue = {
    session: Session | null
    /** Đăng nhập; ném ApiError nếu thất bại. */
    login: (email: string, password: string) => Promise<void>
    /** Xóa phiên trong bộ nhớ ngay, đồng thời gọi API logout để thu hồi token (best effort). */
    signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
