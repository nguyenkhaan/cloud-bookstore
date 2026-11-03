import { useId, useRef, useState } from 'react'
import { Button } from '@/components/common'
import {
  useDeleteBookSeriesImageMutation,
  useDeleteBookSeriesMutation,
  useReplaceBookSeriesImageMutation,
  useUpdateBookSeriesStatusMutation,
} from '@/features/bookseries/bookseries.hook'
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '@/features/bookseries/bookseries.service'
import type { BookSeriesResponse } from '@/features/bookseries/bookseries.type'
import { describeError } from '@/features/bookseries/bookseries.utils'

type Props = { series: BookSeriesResponse }

export function BookSeriesRowActions({ series }: Props) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const replaceImage = useReplaceBookSeriesImageMutation()
  const deleteImage = useDeleteBookSeriesImageMutation()
  const updateStatus = useUpdateBookSeriesStatusMutation()
  const deleteSeries = useDeleteBookSeriesMutation()

  const busy = replaceImage.isPending || deleteImage.isPending || updateStatus.isPending || deleteSeries.isPending
  const onError = (action: string) => (error: unknown) => setMessage(`${action} thất bại: ${describeError(error)}`)

  const handleFile = (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const invalid = validateImageFile(file)
    if (invalid) {
      setMessage(invalid)
      return
    }
    setMessage(null)
    replaceImage.mutate({ id: series.id, file }, { onError: onError('Đổi ảnh') })
  }

  return (
    <div className="flex min-w-[14rem] flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          size="xs"
          variant="outline"
          loading={replaceImage.isPending}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          aria-label={`${series.imageUrl ? 'Đổi ảnh' : 'Thêm ảnh'} cho ${series.name}`}
        >
          {series.imageUrl ? 'Đổi ảnh' : 'Thêm ảnh'}
        </Button>
        {series.imageUrl && (
          <Button
            size="xs"
            variant="ghost"
            loading={deleteImage.isPending}
            disabled={busy}
            onClick={() => {
              setMessage(null)
              deleteImage.mutate(series.id, { onError: onError('Xoá ảnh') })
            }}
            aria-label={`Xoá ảnh của ${series.name}`}
          >
            Xoá ảnh
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          loading={updateStatus.isPending}
          disabled={busy}
          onClick={() => {
            setMessage(null)
            updateStatus.mutate(
              { id: series.id, isActive: !series.isActive },
              { onError: onError('Đổi trạng thái') },
            )
          }}
          aria-label={`${series.isActive ? 'Ngưng' : 'Kích hoạt'} ${series.name}`}
        >
          {series.isActive ? 'Ngưng' : 'Kích hoạt'}
        </Button>
        {confirmDelete ? (
          <>
            <Button
              size="xs"
              variant="danger"
              loading={deleteSeries.isPending}
              disabled={busy}
              onClick={() => {
                setMessage(null)
                deleteSeries.mutate(series.id, {
                  onError: onError('Xoá'),
                  onSettled: () => setConfirmDelete(false),
                })
              }}
              aria-label={`Xác nhận xoá ${series.name}`}
            >
              Xác nhận xoá
            </Button>
            <Button size="xs" variant="ghost" disabled={deleteSeries.isPending} onClick={() => setConfirmDelete(false)}>
              Huỷ
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            className="text-rose-700"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            aria-label={`Xoá ${series.name}`}
          >
            Xoá
          </Button>
        )}
      </div>
      <div aria-live="polite">
        {message && <p role="alert" className="text-xs text-rose-700">{message}</p>}
      </div>
    </div>
  )
}
