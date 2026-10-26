import { ApiError } from '@/services/apiClient'

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'
export type Notice = { tone: NoticeTone; message: string }

const network: Notice = { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }
const unexpected: Notice = { tone: 'error', message: 'Có lỗi không mong muốn. Hãy thử lại sau.' }

export function describeLoginError(error: unknown): Notice {
    if (!(error instanceof ApiError)) return unexpected
    if (error.status === 0) return network
    if (error.status === 401) {
        return { tone: 'warning', message: 'Email hoặc mật khẩu không đúng. Tài khoản sẽ bị tạm khóa nếu nhập sai quá nhiều lần.' }
    }
    if (error.status === 403 && /locked/i.test(error.message)) {
        return { tone: 'error', message: 'Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.' }
    }
    if (error.status === 403) {
        return { tone: 'warning', message: 'Tài khoản chưa được kích hoạt hoặc không khả dụng. Hãy kích hoạt tài khoản hoặc liên hệ Quản trị viên.' }
    }
    return { tone: 'error', message: 'Không thể đăng nhập lúc này. Hãy thử lại sau.' }
}

export function describeRegisterError(error: unknown): Notice {
    if (!(error instanceof ApiError)) return unexpected
    if (error.status === 0) return network
    if (error.status === 409) {
        return { tone: 'error', message: 'Email này đã được đăng ký và kích hoạt. Hãy đăng nhập hoặc dùng Quên mật khẩu.' }
    }
    if (error.status === 400 && /domain/i.test(error.message)) {
        return { tone: 'error', message: 'Email chưa được cấp quyền bởi Quản trị viên.' }
    }
    if (error.status === 400 && /invalid email/i.test(error.message)) {
        return { tone: 'error', message: 'Email không hợp lệ.' }
    }
    if (error.status === 400) {
        return { tone: 'error', message: 'Thông tin chưa hợp lệ. Hãy kiểm tra lại email, họ tên, số điện thoại và mật khẩu.' }
    }
    return { tone: 'error', message: 'Không thể gửi email kích hoạt lúc này. Hãy thử gửi lại sau ít phút.' }
}

export function describeVerifyError(error: unknown): Notice {
    if (!(error instanceof ApiError)) return unexpected
    if (error.status === 0) return network
    if (error.status === 403) {
        return { tone: 'error', message: 'Tài khoản này không thể kích hoạt. Hãy liên hệ Quản trị viên.' }
    }
    return { tone: 'error', message: 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Hãy gửi lại liên kết mới.' }
}
