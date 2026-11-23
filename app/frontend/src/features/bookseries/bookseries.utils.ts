import { ApiError } from '@/features/auth/auth.service'

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (HTTP ${error.status})`
  if (error instanceof Error) return error.message
  return 'Đã có lỗi xảy ra.'
}
