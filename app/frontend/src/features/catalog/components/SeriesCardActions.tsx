import { useRef, useState } from 'react'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmationDialog, TextField } from '@/components/common'
import type { BookSeries } from '../catalog.type'
import { CatalogDialog } from './CatalogDialog'

type DialogKind = 'delete' | 'edit' | null
type EditTab = 'details' | 'image'

export function SeriesCardActions({ series }: { series: BookSeries }) {
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null)
  const [activeTab, setActiveTab] = useState<EditTab>('details')
  const [name, setName] = useState(series.name)
  const [description, setDescription] = useState(series.description ?? '')
  const [isActive, setIsActive] = useState(series.isActive)

  const openEdit = () => {
    setActiveTab('details')
    setActiveDialog('edit')
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
            <form aria-labelledby={`series-${series.id}-details-tab`} className="space-y-4 pt-5" id={`series-${series.id}-details`} role="tabpanel" onSubmit={(event) => event.preventDefault()}>
              <TextField label="Tên bộ sách *" maxLength={255} onChange={(event) => setName(event.target.value)} required value={name} />
              <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
                <span className="block text-xs font-semibold text-slate-500">Mô tả</span>
                <textarea className="mt-1 block min-h-24 w-full resize-y bg-transparent text-sm text-indigo-950 outline-none" onChange={(event) => setDescription(event.target.value)} value={description} />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <span><span className="block text-sm font-semibold text-slate-800">Đang hoạt động</span><span className="mt-0.5 block text-xs text-slate-500">Bộ sách hiện có thể được sử dụng trong danh mục.</span></span>
                <input aria-label="Đang hoạt động" checked={isActive} className="h-5 w-5 accent-indigo-600" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
              </label>
              <PreviewNotice />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button onClick={() => setActiveDialog(null)} type="button" variant="ghost">Hủy</Button>
                <Button disabled type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          ) : (
            <section aria-labelledby={`series-${series.id}-image-tab`} className="pt-5" id={`series-${series.id}-image`} role="tabpanel">
              <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="grid aspect-[2/3] w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-400">
                  {series.imageUrl ? <img alt={`Ảnh bìa bộ sách ${series.name}`} className="h-full w-full object-cover" src={series.imageUrl} /> : <ImagePlus aria-hidden="true" size={26} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900">Ảnh bìa bộ sách</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{series.imageUrl ? 'Ảnh hiện tại sẽ được thay thế sau khi bạn chọn ảnh mới.' : 'Bộ sách này chưa có ảnh bìa.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled type="button" variant="outline">{series.imageUrl ? 'Thay ảnh' : 'Chọn ảnh'}</Button>
                    {series.imageUrl && <Button disabled type="button" variant="ghost">Xóa ảnh</Button>}
                  </div>
                </div>
              </div>
              <PreviewNotice />
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

function PreviewNotice() {
  return <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800" role="status">Bản xem trước giao diện: chưa gửi thay đổi tới hệ thống.</p>
}
