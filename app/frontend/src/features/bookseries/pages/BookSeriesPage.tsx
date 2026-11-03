import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, TextField } from '@/components/common'
import { ApiError } from '@/features/auth/auth.service'
import {
  useBookSeriesListQuery,
  useCreateBookSeriesMutation,
  useUploadBookSeriesImageMutation,
} from '@/features/bookseries/bookseries.hook'
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '@/features/bookseries/bookseries.service'
import type { UploadedImage } from '@/features/bookseries/bookseries.type'
import { describeError } from '@/features/bookseries/bookseries.utils'
import { BookSeriesRowActions } from '@/features/bookseries/components/BookSeriesRowActions'

const PAGE_SIZE = 10

type Status = { tone: 'error' | 'success'; message: string } | null

function formatBytes(bytes: number | string | null): string {
  if (bytes === null) return '—'
  return `${(Number(bytes) / 1024).toFixed(1)} KB`
}

export function BookSeriesPage() {
  const fileInputId = useId()
  const descriptionId = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [page, setPage] = useState(1)

  const listQuery = useBookSeriesListQuery({ page, pageSize: PAGE_SIZE })
  const uploadMutation = useUploadBookSeriesImageMutation()
  const createMutation = useCreateBookSeriesMutation()

  // Revoke the object URL when it is replaced or the page unmounts.
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview)
  }, [localPreview])

  const handleFileChange = (selected: File | null) => {
    setFile(selected)
    setLocalPreview(selected ? URL.createObjectURL(selected) : null)
    setUploaded(null)
    setStatus(null)
    setFileError(selected ? validateImageFile(selected) : null)
  }

  const handleUpload = () => {
    if (!file) return
    setStatus(null)
    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        setUploaded(result)
        setStatus({ tone: 'success', message: 'Đã upload ảnh lên Cloudinary. Bấm "Tạo BookSeries" để gắn ảnh.' })
      },
      onError: (error) => setStatus({ tone: 'error', message: `Upload thất bại: ${describeError(error)}` }),
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setStatus({ tone: 'error', message: 'Vui lòng nhập tên BookSeries.' })
      return
    }
    setStatus(null)
    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
        imageUpload: uploaded?.imageUpload ?? null,
      },
      {
        onSuccess: (created) => {
          setStatus({ tone: 'success', message: `Đã tạo BookSeries "${created.name}".` })
          setName('')
          setDescription('')
          setIsActive(true)
          handleFileChange(null)
          setPage(1)
        },
        onError: (error) => {
          // 409: the upload intent was already consumed and must not be reused.
          if (error instanceof ApiError && error.status === 409) setUploaded(null)
          setStatus({ tone: 'error', message: `Tạo thất bại: ${describeError(error)}` })
        },
      },
    )
  }

  const data = listQuery.data
  const busy = uploadMutation.isPending || createMutation.isPending

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">BookSeries · Test Cloudinary direct upload</h1>
          <p className="text-xs text-slate-500">Chọn ảnh → Upload lên Cloudinary → Tạo BookSeries kèm imageUpload.</p>
        </div>
        <Link className="text-xs font-semibold text-indigo-700 hover:underline" to="/dashboard">
          Về Dashboard
        </Link>
      </div>

      <Card title="Tạo BookSeries">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <div className="space-y-3">
            <TextField
              label="Tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
            />
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
              <label className="block text-xs font-semibold text-slate-500" htmlFor={descriptionId}>
                Mô tả
              </label>
              <textarea
                id={descriptionId}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full resize-y border-0 bg-transparent pt-1 text-[15px] text-indigo-950 outline-none"
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Đang hoạt động
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500" htmlFor={fileInputId}>
                Ảnh (JPEG/PNG/WebP, tối đa 10 MB)
              </label>
              <input
                id={fileInputId}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                aria-invalid={fileError ? true : undefined}
                aria-describedby={fileError ? `${fileInputId}-error` : undefined}
                className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700"
              />
              {fileError && (
                <p id={`${fileInputId}-error`} className="mt-1 text-xs text-rose-700">{fileError}</p>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {localPreview && (
                <img
                  src={uploaded?.previewUrl ?? localPreview}
                  alt="Ảnh xem trước"
                  className="h-28 w-28 rounded-lg border border-slate-200 object-cover"
                />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleUpload}
                disabled={!file || Boolean(fileError) || Boolean(uploaded) || createMutation.isPending}
                loading={uploadMutation.isPending}
              >
                {uploaded ? 'Đã upload' : uploadMutation.isPending ? 'Đang upload…' : 'Upload lên Cloudinary'}
              </Button>
            </div>

            {uploaded && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                <dt className="font-semibold text-slate-500">uploadIntentId</dt>
                <dd className="break-all text-slate-800">{uploaded.imageUpload.uploadIntentId}</dd>
                <dt className="font-semibold text-slate-500">publicId</dt>
                <dd className="break-all text-slate-800">{uploaded.imageUpload.publicId}</dd>
                <dt className="font-semibold text-slate-500">version</dt>
                <dd className="text-slate-800">{uploaded.imageUpload.version}</dd>
                <dt className="font-semibold text-slate-500">format / bytes</dt>
                <dd className="text-slate-800">
                  {uploaded.imageUpload.format ?? '—'} / {formatBytes(uploaded.imageUpload.bytes)}
                </dd>
              </dl>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="submit" variant="primary" size="lg" loading={createMutation.isPending} disabled={busy}>
              {createMutation.isPending ? 'Đang tạo…' : 'Tạo BookSeries'}
            </Button>
            {file && !uploaded && !fileError && (
              <span className="text-xs text-amber-700">Ảnh chưa được upload — BookSeries sẽ được tạo không có ảnh.</span>
            )}
          </div>

          <div aria-live="polite" className="md:col-span-2">
            {status && (
              <p
                role={status.tone === 'error' ? 'alert' : 'status'}
                className={status.tone === 'error' ? 'text-sm text-rose-700' : 'text-sm text-emerald-700'}
              >
                {status.message}
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card
        title="Danh sách BookSeries"
        subtitle={data ? `${data.totalCount} bản ghi` : undefined}
        action={
          <Button size="sm" onClick={() => listQuery.refetch()} loading={listQuery.isFetching}>
            Tải lại
          </Button>
        }
      >
        {listQuery.isPending ? (
          <p role="status" className="text-sm text-slate-500">Đang tải…</p>
        ) : listQuery.isError ? (
          <p role="alert" className="text-sm text-rose-700">Không tải được danh sách: {describeError(listQuery.error)}</p>
        ) : listQuery.data.items.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có BookSeries nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3">Ảnh</th>
                  <th scope="col" className="py-2 pr-3">Tên</th>
                  <th scope="col" className="py-2 pr-3">Mô tả</th>
                  <th scope="col" className="py-2 pr-3">Trạng thái</th>
                  <th scope="col" className="py-2 pr-3 text-right">Số Title</th>
                  <th scope="col" className="py-2 pr-3">Ngày tạo</th>
                  <th scope="col" className="py-2 pr-3">imageUrl</th>
                  <th scope="col" className="py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.data.items.map((series) => (
                  <tr key={series.id} className="align-top">
                    <td className="py-2 pr-3">
                      {series.imageUrl ? (
                        <img
                          src={series.imageUrl}
                          alt={`Ảnh của ${series.name}`}
                          loading="lazy"
                          className="h-16 w-16 rounded-md border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-[11px] text-slate-400">
                          Không ảnh
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-slate-900">{series.name}</td>
                    <td className="max-w-xs py-2 pr-3 break-words text-slate-600">{series.description || '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={series.isActive ? 'success' : 'neutral'}>
                        {series.isActive ? 'Hoạt động' : 'Ngưng'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{series.titlesCount}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                      {new Date(series.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="max-w-[16rem] py-2 pr-3 break-all text-xs text-slate-500">
                      {series.imageUrl ? (
                        <a href={series.imageUrl} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
                          {series.imageUrl}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-2">
                      <BookSeriesRowActions series={series} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && Number(data.totalPages ?? 1) > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-600">
            <Button size="sm" onClick={() => setPage((p) => p - 1)} disabled={!data.hasPreviousPage}>
              Trước
            </Button>
            <span>Trang {data.page} / {data.totalPages}</span>
            <Button size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.hasNextPage}>
              Sau
            </Button>
          </div>
        )}
      </Card>
    </main>
  )
}

export default BookSeriesPage
