import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Button, TextField } from '@/components/common'
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import { uploadBookCover } from '../catalog.service'
import type { BookSeries, BookTitle, SaveTitleRequest } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'
import { CoverTile } from './CoverTile'

type TitleEditorDialogProps = {
  onClose: () => void
  onSave: (request: SaveTitleRequest) => Promise<void>
  series: BookSeries[]
  title?: BookTitle
}

export function TitleEditorDialog({ onClose, onSave, series, title }: TitleEditorDialogProps) {
  const [name, setName] = useState(title?.name ?? '')
  const [author, setAuthor] = useState(title?.author ?? '')
  const [volumeLabel, setVolumeLabel] = useState(title?.volumeLabel ?? '')
  const [seriesId, setSeriesId] = useState(title?.seriesId ?? '')
  const [description, setDescription] = useState(title?.description ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(title?.coverImageUrl ?? '')
  const [imageUpload, setImageUpload] = useState<CloudinaryUploadResultRequest | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Chỉ có thể tải lên tệp hình ảnh.')
      return
    }
    setError('')
    setIsUploading(true)
    try {
      const uploaded = await uploadBookCover(file)
      setImageUpload(uploaded.imageUpload)
      setCoverImageUrl(uploaded.previewUrl ?? '')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Không thể tải ảnh bìa lên.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Tên đầu sách là bắt buộc.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await onSave({
        author: author.trim() || null,
        imageUpload: imageUpload ?? null,
        description: description.trim() || null,
        name: name.trim(),
        seriesId: seriesId || null,
        volumeLabel: volumeLabel.trim() || null,
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu đầu sách.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CatalogDialog onClose={onClose} title={title ? 'Chỉnh sửa đầu sách' : 'Thêm đầu sách mới'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-[104px_1fr]">
          <div>
            <CoverTile className="aspect-[3/4] w-26 rounded-xl border border-slate-200 shadow-sm" imageUrl={coverImageUrl || null} title={name || 'Sách mới'} />
            <label className="mt-2 block cursor-pointer text-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
              {isUploading ? 'Đang tải ảnh…' : 'Tải ảnh bìa'}
              <input accept="image/*" className="sr-only" disabled={isUploading || isSaving} onChange={handleFileChange} type="file" />
            </label>
          </div>
          <div className="grid gap-3">
            <TextField label="Tên đầu sách *" onChange={(event) => setName(event.target.value)} required value={name} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Tác giả" onChange={(event) => setAuthor(event.target.value)} value={author} />
              <TextField label="Nhãn tập" onChange={(event) => setVolumeLabel(event.target.value)} placeholder="Ví dụ: Tập 1" value={volumeLabel} />
            </div>
            <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
              <span className="block text-xs font-semibold text-slate-500">Thuộc bộ sách</span>
              <select className="mt-1 block w-full bg-transparent text-[15px] text-indigo-950 outline-none" onChange={(event) => setSeriesId(event.target.value)} value={seriesId}>
                <option value="">Sách độc lập / chưa gắn bộ</option>
                {series.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
          <span className="block text-xs font-semibold text-slate-500">Mô tả</span>
          <textarea className="mt-1 block min-h-22 w-full resize-y bg-transparent text-sm text-indigo-950 outline-none placeholder:text-slate-400" onChange={(event) => setDescription(event.target.value)} placeholder="Thông tin chung của đầu sách…" value={description} />
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button onClick={onClose} type="button" variant="ghost">Hủy</Button>
          <Button disabled={isUploading} loading={isSaving} type="submit">{title ? 'Lưu thay đổi' : 'Tạo đầu sách'}</Button>
        </div>
      </form>
    </CatalogDialog>
  )
}
