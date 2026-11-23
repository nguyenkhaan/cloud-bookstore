import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, TextField } from '@/components/common'
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import type { BookEdition, CreateEditionRequest, UpdateEditionRequest } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'
import { CoverUploadField } from './CoverUploadField'

type Props = {
  onClose: () => void
  onSave: (request: CreateEditionRequest | UpdateEditionRequest) => Promise<void>
  titleId: string
  edition?: BookEdition
}

export function EditionEditorDialog({ onClose, onSave, titleId, edition }: Props) {
  const [isbn, setIsbn] = useState(edition?.isbn ?? '')
  const [editionStatement, setEditionStatement] = useState(edition?.editionStatement ?? '')
  const [printingStatement, setPrintingStatement] = useState(edition?.printingStatement ?? '')
  const [publisher, setPublisher] = useState(edition?.publisher ?? '')
  const [publishYear, setPublishYear] = useState(edition?.publishYear?.toString() ?? '')
  const [format, setFormat] = useState(edition?.format ?? '')
  const [coverPrice, setCoverPrice] = useState(edition?.coverPrice?.toString() ?? '')
  const [previewUrl, setPreviewUrl] = useState(edition?.coverImageUrl ?? '')
  const [imageUpload, setImageUpload] = useState<CloudinaryUploadResultRequest | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!coverPrice || Number(coverPrice) < 0 || !Number.isSafeInteger(Number(coverPrice))) {
      setError('Nhập giá bìa hợp lệ.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      const fields = {
        isbn: isbn.trim() || null,
        editionStatement: editionStatement.trim() || null,
        printingStatement: printingStatement.trim() || null,
        publisher: publisher.trim() || null,
        publishYear: publishYear ? Number(publishYear) : null,
        format: format.trim() || null,
        coverPrice: Number(coverPrice),
        imageUpload,
      }
      await onSave(edition ? fields : { ...fields, titleId })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu ấn bản.')
    } finally {
      setIsSaving(false)
    }
  }

  return <CatalogDialog onClose={onClose} title={edition ? 'Chỉnh sửa ấn bản' : 'Thêm ấn bản'}>
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <CoverUploadField disabled={isSaving} imageUrl={previewUrl} onBusyChange={setIsUploading} onUpload={(upload, url) => { setImageUpload(upload); setPreviewUrl(url ?? '') }} ownerType="EDITION_IMAGE" title={editionStatement || 'Ấn bản'} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="ISBN (không bắt buộc)" maxLength={20} onChange={(event) => setIsbn(event.target.value)} value={isbn} />
        <TextField label="Năm xuất bản" min="1000" max="2100" onChange={(event) => setPublishYear(event.target.value)} type="number" value={publishYear} />
        <TextField label="Ấn bản" maxLength={100} onChange={(event) => setEditionStatement(event.target.value)} value={editionStatement} />
        <TextField label="Lần in / tái bản" maxLength={100} onChange={(event) => setPrintingStatement(event.target.value)} value={printingStatement} />
        <TextField label="Nhà xuất bản" maxLength={255} onChange={(event) => setPublisher(event.target.value)} value={publisher} />
        <TextField label="Định dạng" maxLength={100} onChange={(event) => setFormat(event.target.value)} value={format} />
        <TextField label="Giá bìa (đ) *" min="0" onChange={(event) => setCoverPrice(event.target.value)} required type="number" value={coverPrice} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button onClick={onClose} type="button" variant="ghost">Hủy</Button>
        <Button disabled={isUploading} loading={isSaving} type="submit">{edition ? 'Lưu thay đổi' : 'Tạo ấn bản'}</Button>
      </div>
    </form>
  </CatalogDialog>
}
