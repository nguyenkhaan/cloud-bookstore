import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { uploadImage } from '@/features/uploads/upload.service'
import type { CloudinaryUploadResultRequest, UploadOwnerType } from '@/features/uploads/upload.type'
import { CoverTile } from './CoverTile'

type Props = {
  title: string
  imageUrl?: string | null
  fallbackUrl?: string | null
  ownerType: UploadOwnerType
  onUpload: (result: CloudinaryUploadResultRequest, previewUrl: string | null) => void
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}

export function CoverUploadField({ title, imageUrl, fallbackUrl, ownerType, onUpload, onBusyChange, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setBusy(true)
    onBusyChange(true)
    try {
      const result = await uploadImage(ownerType, file)
      onUpload(result.imageUpload, result.previewUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải ảnh bìa.')
    } finally {
      setBusy(false)
      onBusyChange(false)
      event.target.value = ''
    }
  }

  return <div className="flex items-center gap-4">
    <CoverTile className="aspect-[3/4] w-20 shrink-0 rounded-lg border border-slate-200" imageUrl={imageUrl || fallbackUrl} title={title} />
    <div className="min-w-0">
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-indigo-700 focus-within:ring-2 focus-within:ring-indigo-600">
        {busy ? 'Đang tải ảnh…' : imageUrl ? 'Thay ảnh bìa' : 'Tải ảnh bìa'}
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || busy} onChange={(event) => void handleChange(event)} type="file" />
      </label>
      <p className="mt-1 text-xs text-slate-500">JPEG, PNG hoặc WebP · tối đa 10 MB</p>
      {fallbackUrl && !imageUrl && <p className="text-xs text-slate-500">Đang dùng ảnh của ấn bản.</p>}
      {error && <p className="mt-1 text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  </div>
}
