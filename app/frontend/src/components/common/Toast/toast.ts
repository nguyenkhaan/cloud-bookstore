import { toast } from 'react-toastify'

export const notify = {
  error: (message: string) => toast.error(message),
  success: (message: string) => toast.success(message),
}
