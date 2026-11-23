import { useState } from 'react'
import { Keyboard, ScanLine } from 'lucide-react'
import { TextField } from '@/components/common'

interface PosScannerFieldProps {
  label: string
  placeholder: string
  hint?: string
  invalidMessage?: string
  onScan: (value: string) => string | undefined
}

export function PosScannerField({ label, placeholder, hint = 'Máy quét đang lắng nghe · Enter để xác nhận', invalidMessage, onScan }: PosScannerFieldProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>(invalidMessage)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Nhập hoặc quét mã trước khi xác nhận.')
      return
    }
    const nextError = onScan(trimmed)
    setError(nextError)
    if (!nextError) setValue('')
  }

  return (
    <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <TextField
        label={label}
        value={value}
        onChange={(event) => { setValue(event.target.value); setError(undefined) }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit() } }}
        placeholder={placeholder}
        variant="outlined"
        invalid={Boolean(error)}
        suffix={<ScanLine aria-hidden="true" className="size-5 text-indigo-500" />}
      />
      <div className={`flex items-center justify-between gap-3 text-[11px] ${error ? 'text-rose-700' : 'text-emerald-600'}`}>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className={`size-1.5 shrink-0 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span>{error ?? hint}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-slate-400"><Keyboard aria-hidden="true" className="size-3" /> Enter</span>
      </div>
    </form>
  )
}
