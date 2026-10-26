const JWT_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/

/**
 * Nhận token kích hoạt từ nội dung người dùng dán vào:
 * token thô, liên kết đầy đủ (http://host/verify-email?token=...) hoặc đường dẫn tương đối.
 * Trả về null nếu không tìm thấy token hợp lệ về mặt định dạng.
 */
export function extractActivationToken(input) {
    if (typeof input !== 'string') return null
    const value = input.trim()
    if (!value) return null
    if (JWT_PATTERN.test(value)) return value

    try {
        const token = new URL(value).searchParams.get('token')?.trim()
        if (token && JWT_PATTERN.test(token)) return token
    } catch {
        // Không phải URL tuyệt đối, thử cách khác bên dưới.
    }

    const match = value.match(/(?:^|[?&])token=([^&#\s]+)/)
    if (!match) return null
    try {
        const token = decodeURIComponent(match[1])
        return JWT_PATTERN.test(token) ? token : null
    } catch {
        return null
    }
}
