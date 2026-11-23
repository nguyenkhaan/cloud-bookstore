import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, ConfirmationDialog } from '@/components/common'
import { useDeleteTitleMutation } from '../catalog.hook'
import type { BookTitle } from '../catalog.type'

export function TitleRowDeleteAction({ title }: { title: BookTitle }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteTitle = useDeleteTitleMutation()

  const handleDelete = async () => {
    setDeleteError('')
    try {
      await deleteTitle.mutateAsync(title.id)
      setIsOpen(false)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa đầu sách.')
    }
  }

  return (
    <>
      <button
        aria-label={`Xóa ${title.name}`}
        className="group grid h-11 w-11 place-items-center text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
        onClick={() => {
          setDeleteError('')
          setIsOpen(true)
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition group-hover:border-rose-200 group-hover:bg-rose-50 group-hover:text-rose-700 motion-reduce:transition-none">
          <Trash2 aria-hidden="true" size={15} />
        </span>
      </button>

      {isOpen && (
        <ConfirmationDialog
          actions={<><Button onClick={() => setIsOpen(false)} type="button" variant="ghost">Hủy</Button><Button loading={deleteTitle.isPending} onClick={() => void handleDelete()} type="button" variant="danger">{deleteTitle.isPending ? 'Đang xóa…' : 'Xóa đầu sách'}</Button></>}
          error={deleteError}
          message={`Chỉ có thể xóa đầu sách “${title.name}” khi chưa có ấn bản. Nếu đã có ấn bản, hãy chuyển sang ngừng sử dụng.`}
          onClose={() => setIsOpen(false)}
          title="Xóa đầu sách"
          triggerRef={triggerRef}
        />
      )}
    </>
  )
}
