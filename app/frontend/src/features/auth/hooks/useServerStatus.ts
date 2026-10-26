import { useEffect, useState } from 'react'
import { checkServerReady } from '../services/authApi'

export type ServerStatus = 'checking' | 'online' | 'offline'

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
