import { isAxiosError } from 'axios'

export interface ParsedApiError {
    message: string
    code?: string
}

const MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    ACCOUNT_NOT_ACTIVATED: 'Tài khoản chưa được kích hoạt. Hãy xác minh tài khoản sau khi đăng ký.',
    INVALID_SESSION: 'Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.',
    INVALID_REFRESH: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    UNAUTHENTICATED: 'Bạn cần đăng nhập để tiếp tục.',
}

const BY_SERVER_MESSAGE: Record<string, string> = {
    'Email domain is not allowed': 'Tên miền email này không được phép đăng ký.',
    'Invalid email address': 'Địa chỉ email không hợp lệ.',
    'User has been registered': 'Email này đã được đăng ký. Hãy đăng nhập.',
    'Invalid or expired verification token': 'Mã xác minh không hợp lệ hoặc đã hết hạn.',
    'Account cannot be verified': 'Tài khoản này không thể xác minh. Hãy liên hệ Admin.',
}

export function parseApiError(error: unknown): ParsedApiError {
    if (!isAxiosError(error)) return { message: 'Đã có lỗi xảy ra. Hãy thử lại.' }
    if (!error.response) return { message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' }

    const data = error.response.data as
        | { message?: string; code?: string | null; errors?: Record<string, string[]> }
        | undefined
    const code = data?.code ?? undefined

    if (code === 'ACCOUNT_LOCKED') {
        const minutes = /(\d+) minute/.exec(data?.message ?? '')?.[1]
        return {
            code,
            message: minutes
                ? `Tài khoản đang bị khóa tạm thời. Hãy thử lại sau ${minutes} phút.`
                : 'Tài khoản đã bị khóa. Hãy liên hệ Admin.',
        }
    }
    if (code && MESSAGES[code]) return { code, message: MESSAGES[code] }

    const serverMessage = data?.message
    if (serverMessage && BY_SERVER_MESSAGE[serverMessage]) {
        return { code, message: BY_SERVER_MESSAGE[serverMessage] }
    }

    // Lỗi validate model của ASP.NET: { errors: { Field: ['msg'] } }
    const firstValidation = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    if (firstValidation) return { code, message: firstValidation }

    if (error.response.status >= 500) return { code, message: 'Máy chủ đang gặp sự cố. Hãy thử lại sau.' }
    return { code, message: serverMessage ?? 'Yêu cầu không thành công.' }
}