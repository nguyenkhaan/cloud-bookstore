import { useContext } from 'react'
import { AuthContext } from '@/tmp/context/auth-context'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return value
}
