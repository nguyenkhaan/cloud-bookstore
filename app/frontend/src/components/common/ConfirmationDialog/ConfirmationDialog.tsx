import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

type ConfirmationDialogProps = {
  actions: ReactNode
  error?: string
  message: string
  onClose: () => void
  title: string
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function ConfirmationDialog({ actions, error, message, onClose, title, triggerRef }: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const handleClose = useCallback(() => {
    onClose()
    requestAnimationFrame(() => triggerRef?.current?.focus())
  }, [onClose, triggerRef])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button aria-label="Đóng hộp thoại xác nhận" className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[1px]" onClick={handleClose} tabIndex={-1} type="button" />
      <section aria-label={title} aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" ref={dialogRef} role="dialog" tabIndex={-1}>
        <header className="border-b border-slate-100 px-5 py-4">
          <p className="text-[10px] font-bold tracking-[0.16em] text-rose-600">XÁC NHẬN THAO TÁC</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">{title}</h2>
        </header>
        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600">{message}</p>
          {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">{actions}</div>
        </div>
      </section>
    </div>
  )
}
