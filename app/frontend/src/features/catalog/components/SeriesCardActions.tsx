import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmationDialog, TextField } from '@/components/common'
import { uploadImage } from '@/features/uploads/upload.service'
import type { UploadedImage } from '@/features/uploads/upload.type'
import { CatalogApiError } from '../catalog.service'
import { useReplaceSeriesImageMutation, useUpdateSeriesMutation, useUpdateSeriesStatusMutation } from '../catalog.hook'
import type { BookSeries } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'

type DialogKind = 'delete' | 'edit' | null
type EditTab = 'details' | 'image'

export function SeriesCardActions({ series }: { series: BookSeries }) {
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null)
  const [activeTab, setActiveTab] = useState<EditTab>('details')
  const [name, setName] = useState(series.name)
  const [description, setDescription] = useState(series.description ?? '')
  const [isActive, setIsActive] = useState(series.isActive)
  const [detailsError, setDetailsError] = useState('')
  const [imageError, setImageError] = useState('')
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const updateSeries = useUpdateSeriesMutation()
  const updateStatus = useUpdateSeriesStatusMutation()
  const replaceSeriesImage = useReplaceSeriesImageMutation()
  const isSaving = updateSeries.isPending || updateStatus.isPending
  const isImageBusy = isImageUploading || replaceSeriesImage.isPending
  const previewUrl = uploadedPreviewUrl ?? series.imageUrl

  const openEdit = () => {
    setName(series.name)
    setDescription(series.description ?? '')
    setIsActive(series.isActive)
    setDetailsError('')
    setImageError('')
    setPendingImage(null)
    setUploadedPreviewUrl(null)
    setActiveTab('details')
    setActiveDialog('edit')
  }

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setDetailsError('Tên bộ sách là bắt buộc.')
      return
    }

    setDetailsError('')
    try {
      await updateSeries.mutateAsync({ seriesId: series.id, request: { name: trimmedName, description: description.trim() || null } })
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Không thể lưu thông tin bộ sách.')
      return
    }

    if (isActive !== series.isActive) {
      try {
        await updateStatus.mutateAsync({ seriesId: series.id, isActive })
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : ''
        setDetailsError(`Thông tin chung đã được lưu, nhưng không thể cập nhật trạng thái.${detail}`)
        return
      }
    }

    setActiveDialog(null)
  }

  const attachImage = async (uploaded: UploadedImage) => {
    setImageError('')
    try {
      await replaceSeriesImage.mutateAsync({ seriesId: series.id, imageUpload: uploaded.imageUpload })
      setPendingImage(null)
    } catch (error) {
      if (error instanceof CatalogApiError && error.status === 409) {
        setPendingImage(null)
        setUploadedPreviewUrl(null)
        setImageError('Ảnh đã tải không còn hiệu lực. Vui lòng chọn ảnh để tải lại.')
        return
      }
      setImageError(error instanceof Error ? error.message : 'Không thể lưu ảnh bìa. Bạn có thể thử lưu lại.')
    }
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImageError('')
    setIsImageUploading(true)
    try {
      const uploaded = await uploadImage('BOOK_SERIES_IMAGE', file)
      setPendingImage(uploaded)
      setUploadedPreviewUrl(uploaded.previewUrl)
      await attachImage(uploaded)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Không thể tải ảnh bìa lên.')
    } finally {
      setIsImageUploading(false)
    }
  }

  return (
    <>
      <div aria-label={`Thao tác cho ${series.name}`} className="absolute right-3 top-3 z-10 flex items-center gap-1" role="group">
        <button
          aria-label={`Chỉnh sửa ${series.name}`}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
          onClick={openEdit}
          ref={editTriggerRef}
          type="button"
        >
          <Pencil aria-hidden="true" size={17} />
        </button>
        <button
          aria-label={`Xóa ${series.name}`}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
          onClick={() => setActiveDialog('delete')}
          ref={deleteTriggerRef}
          type="button"
        >
          <Trash2 aria-hidden="true" size={17} />
        </button>
      </div>

      {activeDialog === 'edit' && (
        <CatalogDialog onClose={() => setActiveDialog(null)} title="Chỉnh sửa bộ sách" triggerRef={editTriggerRef}>
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs leading-5 text-slate-500">Chỉnh sửa thông tin và ảnh nhận diện cho <span className="font-semibold text-slate-700">{series.name}</span>.</p>
          </div>
          <div aria-label="Nội dung chỉnh sửa" className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
            <TabButton active={activeTab === 'details'} controls={`series-${series.id}-details`} id={`series-${series.id}-details-tab`} label="Thông tin chung" onClick={() => setActiveTab('details')} />
            <TabButton active={activeTab === 'image'} controls={`series-${series.id}-image`} id={`series-${series.id}-image-tab`} label="Ảnh bìa" onClick={() => setActiveTab('image')} />
          </div>

          {activeTab === 'details' ? (
            <form aria-labelledby={`series-${series.id}-details-tab`} className="space-y-4 pt-5" id={`series-${series.id}-details`} role="tabpanel" onSubmit={handleDetailsSubmit}>
              {detailsError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{detailsError}</p>}
              <TextField label="Tên bộ sách *" maxLength={255} onChange={(event) => setName(event.target.value)} required value={name} />
              <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
                <span className="block text-xs font-semibold text-slate-500">Mô tả</span>
                <textarea className="mt-1 block min-h-24 w-full resize-y bg-transparent text-sm text-indigo-950 outline-none" onChange={(event) => setDescription(event.target.value)} value={description} />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <span><span className="block text-sm font-semibold text-slate-800">Đang hoạt động</span><span className="mt-0.5 block text-xs text-slate-500">Bộ sách hiện có thể được sử dụng trong danh mục.</span></span>
                <input aria-label="Đang hoạt động" checked={isActive} className="h-5 w-5 accent-indigo-600" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button onClick={() => setActiveDialog(null)} type="button" variant="ghost">Hủy</Button>
                <Button loading={isSaving} type="submit">{isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>
              </div>
            </form>
          ) : (
            <section aria-labelledby={`series-${series.id}-image-tab`} className="pt-5" id={`series-${series.id}-image`} role="tabpanel">
              <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="grid aspect-[2/3] w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-400">
                  {previewUrl ? <img alt={`Ảnh bìa bộ sách ${series.name}`} className="h-full w-full object-cover" src={previewUrl} /> : <ImagePlus aria-hidden="true" size={26} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900">Ảnh bìa bộ sách</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{previewUrl ? 'Ảnh hiện tại sẽ được thay thế sau khi bạn chọn ảnh mới.' : 'Bộ sách này chưa có ảnh bìa.'}</p>
                  {imageError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">{imageError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isImageBusy} onChange={handleImageChange} ref={imageInputRef} type="file" />
                    <Button disabled={isImageBusy} loading={isImageBusy} onClick={() => imageInputRef.current?.click()} type="button" variant="outline">
                      {isImageUploading ? 'Đang tải ảnh…' : replaceSeriesImage.isPending ? 'Đang lưu ảnh…' : previewUrl ? 'Thay ảnh' : 'Chọn ảnh'}
                    </Button>
                    {pendingImage && !isImageBusy && <Button onClick={() => void attachImage(pendingImage)} type="button" variant="outline">Thử lưu ảnh</Button>}
                    {series.imageUrl && <Button disabled type="button" variant="ghost">Xóa ảnh</Button>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4"><Button onClick={() => setActiveDialog(null)} type="button" variant="ghost">Đóng</Button></div>
            </section>
          )}
        </CatalogDialog>
      )}

      {activeDialog === 'delete' && (
        <ConfirmationDialog
          actions={<><Button onClick={() => setActiveDialog(null)} type="button" variant="ghost">Hủy</Button><Button disabled type="button" variant="danger">Xóa bộ sách</Button></>}
          message={`Chỉ có thể xóa bộ sách “${series.name}” khi chưa chứa đầu sách/tập. Nếu đã có tập, hãy chuyển sang ngừng sử dụng.`}
          onClose={() => setActiveDialog(null)}
          title="Xóa bộ sách"
          triggerRef={deleteTriggerRef}
        />
      )}
    </>
  )
}

function TabButton({ active, controls, id, label, onClick }: { active: boolean; controls: string; id: string; label: string; onClick: () => void }) {
  return <button aria-controls={controls} aria-selected={active} className={`min-h-11 flex-1 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${active ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`} id={id} onClick={onClick} role="tab" type="button">{label}</button>
}
