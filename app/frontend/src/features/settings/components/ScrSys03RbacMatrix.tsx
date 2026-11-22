import { useState } from 'react'
import { Button, ConfirmationDialog, TextField } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useRbacMatrix, useUpdateRbacMatrix } from '../settings.hook'
import type { RbacMatrixItem } from '../settings.type'

export function ScrSys03RbacMatrix({ isAdmin }: { isAdmin: boolean }) {
  const query = useRbacMatrix()
  const mutation = useUpdateRbacMatrix()
  const [draft, setDraft] = useState<RbacMatrixItem[] | null>(null)
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const items = draft ?? query.data?.items ?? []
  const roles = [
    ['cashierAllowed', 'Nhân viên'], ['warehouseAllowed', 'Quản lý kho'], ['adminAllowed', 'Admin'],
  ] as const

  const save = async () => {
    if (!isAdmin || !draft || !reason.trim() || mutation.isPending) return
    try {
      await mutation.mutateAsync({ items: draft, changeReason: reason.trim() })
      setDraft(null)
      setReason('')
      setConfirm(false)
      notify.success('Đã áp dụng quyền mới. Request tiếp theo sử dụng quyền vừa lưu.')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Không thể lưu quyền.')
    }
  }

  if (!isAdmin) return <p role="alert">Chỉ Admin được quản trị phân quyền.</p>
  if (query.isError) return <div role="alert"><p>Không thể tải phân quyền. Chưa thể chỉnh sửa.</p><Button onClick={() => void query.refetch()}>Thử lại</Button></div>
  if (query.isPending) return <p role="status">Đang tải phân quyền…</p>

  return <section className="space-y-5" aria-labelledby="rbac-heading">
    <div>
      <h1 id="rbac-heading" className="text-2xl font-bold text-slate-900">Ma trận phân quyền</h1>
      <p className="mt-2 text-sm text-slate-600">Cấp hoặc thu hồi quyền theo từng thao tác đang được triển khai. Thay đổi có hiệu lực ngay khi lưu.</p>
      <p className="mt-1 text-xs text-slate-500">Các quyền chỉ dành Admin được khóa theo quy định. Các màn hình chưa có API nghiệp vụ chưa nằm trong bảng này.</p>
    </div>
    <TextField label="Tìm nghiệp vụ hoặc thao tác" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead><tr><th scope="col" className="p-3">Thao tác</th>{roles.map(([, title]) => <th key={title} scope="col" className="p-3 text-center">{title}</th>)}</tr></thead>
        <tbody>{items.filter(item => `${item.permissionName} ${item.moduleTitle}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(item =>
          <tr key={item.permissionCode} className="border-t border-slate-100">
            <th scope="row" className="min-w-52 p-3 font-medium text-slate-800">{item.permissionName}{item.adminOnly && <span className="block text-xs text-slate-500">Chỉ Admin · Quyền được bảo vệ</span>}</th>
            {roles.map(([key, title]) => <td key={key} className="p-1 text-center">
              <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
                <span className="sr-only">{title}: {item.permissionName}</span>
                <input type="checkbox" className="size-5 accent-indigo-600" checked={item[key]} disabled={item.adminOnly || mutation.isPending}
                  onChange={event => setDraft(items.map(row => row.permissionCode === item.permissionCode ? { ...row, [key]: event.target.checked } : row))} />
              </label>
            </td>)}
          </tr>)}</tbody>
      </table>
    </div>
    <TextField label="Lý do thay đổi quyền" value={reason} disabled={mutation.isPending} onChange={e => setReason(e.target.value)} />
    <div className="flex flex-wrap gap-3">
      <Button disabled={!draft || mutation.isPending} variant="secondary" onClick={() => setDraft(null)}>Hủy thay đổi</Button>
      <Button disabled={!draft || !reason.trim() || mutation.isPending} onClick={() => setConfirm(true)}>Xem lại & Lưu quyền</Button>
    </div>
    {confirm && <ConfirmationDialog title="Áp dụng quyền mới ngay?" message="Người đang đăng nhập cũng chịu quyền mới từ request tiếp theo. Lịch sử lưu người thay đổi, lý do và giá trị trước/sau."
      onClose={() => { if (!mutation.isPending) setConfirm(false) }} actions={<>
        <Button variant="secondary" disabled={mutation.isPending} onClick={() => setConfirm(false)}>Hủy</Button>
        <Button loading={mutation.isPending} onClick={() => void save()}>Xác nhận lưu</Button>
      </>} />}
  </section>
}
