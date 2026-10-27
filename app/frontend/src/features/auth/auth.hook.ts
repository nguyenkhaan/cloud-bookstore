import { useCallback, useContext, useEffect, useState } from 'react'
import { AuthContext } from '@/tmp/context/auth-context'
import { checkServerReady } from './auth.service'
import type { ServerStatus } from './auth.type'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return value
}

export function useCountdown() {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  const start = useCallback((seconds: number) => setRemaining(seconds), [])
  return { remaining, start }
}

export function useServerStatus(intervalMs = 30_000): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()
    const check = async () => {
      const ready = await checkServerReady(controller.signal)
      if (!controller.signal.aborted) setStatus(ready ? 'online' : 'offline')
    }
    void check()
    const timer = window.setInterval(() => void check(), intervalMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return status
}
