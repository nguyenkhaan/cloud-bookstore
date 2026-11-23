export const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export const sumBy = <T,>(items: T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0)

export const paymentStatusLabel = {
  idle: 'Chưa thanh toán',
  pending: 'Đang chờ thanh toán',
  success: 'Thanh toán thành công',
  error: 'Thanh toán cần kiểm tra',
} as const
