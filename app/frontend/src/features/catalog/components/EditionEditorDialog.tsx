import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, TextField } from '@/components/common'
import type { CreateEditionRequest } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'

type EditionEditorDialogProps = {
  onClose: () => void
  onSave: (request: CreateEditionRequest) => Promise<void>
  titleId: string
}

export function EditionEditorDialog({ onClose, onSave, titleId }: EditionEditorDialogProps) {
  const [isbn, setIsbn] = useState('')
  const [editionStatement, setEditionStatement] = useState('Ấn bản tiếng Việt')
  const [printingStatement, setPrintingStatement] = useState('')
  const [publisher, setPublisher] = useState('')
  const [publishYear, setPublishYear] = useState('')
  const [format, setFormat] = useState('Bìa mềm')
  const [coverPrice, setCoverPrice] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!publisher.trim() || !coverPrice || Number(coverPrice) < 0) {
      setError('Nhà xuất bản và giá bìa hợp lệ là bắt buộc.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await onSave({
        coverImageUrl: null,
        coverPrice: Number(coverPrice),
        editionStatement: editionStatement.trim() || null,
        format: format.trim() || null,
        isbn: isbn.trim() || null,
        printingStatement: printingStatement.trim() || null,
        publishYear: publishYear ? Number(publishYear) : null,
        publisher: publisher.trim(),
        titleId,
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể tạo ấn bản.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CatalogDialog onClose={onClose} title="Thêm ấn bản mới">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">ISBN dùng để tra cứu ấn bản, không phải mã định danh của từng cuốn vật lý.</p>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="ISBN (không bắt buộc)" onChange={(event) => setIsbn(event.target.value)} value={isbn} />
          <TextField label="Năm xuất bản" min="1000" max="9999" onChange={(event) => setPublishYear(event.target.value)} type="number" value={publishYear} />
          <TextField label="Ấn bản" onChange={(event) => setEditionStatement(event.target.value)} value={editionStatement} />
          <TextField label="Lần in / tái bản" onChange={(event) => setPrintingStatement(event.target.value)} value={printingStatement} />
          <TextField label="Nhà xuất bản *" onChange={(event) => setPublisher(event.target.value)} required value={publisher} />
          <TextField label="Định dạng" onChange={(event) => setFormat(event.target.value)} value={format} />
          <TextField label="Giá bìa (đ) *" min="0" onChange={(event) => setCoverPrice(event.target.value)} required type="number" value={coverPrice} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button onClick={onClose} type="button" variant="ghost">Hủy</Button>
          <Button loading={isSaving} type="submit">Tạo ấn bản</Button>
        </div>
      </form>
    </CatalogDialog>
  )
}
