import { useEffect } from 'react'
import type { ReactNode } from 'react'

type CatalogDialogProps = {
  children: ReactNode
  onClose: () => void
  title: string
}

export function CatalogDialog({ children, onClose, title }: CatalogDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button
        aria-label="Đóng hộp thoại"
        className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={title}
        aria-modal="true"
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-indigo-600">CATALOG / THIẾT LẬP</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  )
}
