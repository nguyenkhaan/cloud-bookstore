import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { Button, Card, ConfirmationDialog, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import { catalogPaths } from '../catalog.route'
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useSuppliersQuery,
  useSupplierStatsQuery,
  useUpdateSupplierMutation,
  useUpdateSupplierStatusMutation,
} from '../catalog.hook'
import type { SupplierItem } from '../catalog.type'
import { CatalogDialog } from '../components/CatalogDialog'
import { WarehouseWorkspace } from '../components/WarehouseWorkspace'

const STATUS_FILTER_OPTIONS: SelectOption<'ACTIVE' | 'ALL' | 'INACTIVE'>[] = [
  { value: 'ACTIVE', label: 'Đang hợp tác' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'INACTIVE', label: 'Ngừng hợp tác' },
]

const DEBT_FILTER_OPTIONS: SelectOption<'ALL' | 'HAS_PENDING' | 'NO_PENDING'>[] = [
  { value: 'ALL', label: 'Công nợ: Tất cả' },
  { value: 'HAS_PENDING', label: 'Còn phiếu chờ xử lý' },
  { value: 'NO_PENDING', label: 'Không có phiếu chờ' },
]

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const canEdit = ['ADMIN', 'INVENTORY_MANAGER'].includes(session?.user?.roleCode ?? 'ADMIN')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | 'INACTIVE'>('ALL')
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_PENDING' | 'NO_PENDING'>('ALL')
  const [selectedId, setSelectedId] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newTaxCode, setNewTaxCode] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [addError, setAddError] = useState('')

  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTaxCode, setEditTaxCode] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editError, setEditError] = useState('')

  const suppliersQuery = useSuppliersQuery({
    search: search.trim() || undefined,
    isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
    hasPending: debtFilter === 'ALL' ? undefined : debtFilter === 'HAS_PENDING',
  })
  const statsQuery = useSupplierStatsQuery()

  const createSupplier = useCreateSupplierMutation()
  const updateSupplier = useUpdateSupplierMutation()
  const updateStatus = useUpdateSupplierStatusMutation()
  const deleteSupplier = useDeleteSupplierMutation()

  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data])
  const stats = statsQuery.data

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedId) ?? suppliers[0] ?? null,
    [suppliers, selectedId],
  )

  const handleSelectSupplier = (supplier: SupplierItem) => {
    setSelectedId(supplier.id)
    setEditName(supplier.name)
    setEditPhone(supplier.phone ?? '')
    setEditTaxCode(supplier.taxCode ?? '')
    setEditAddress(supplier.address ?? '')
    setEditError('')
  }

  const currentForm = useMemo(() => {
    if (!selectedSupplier) {
      return { name: '', phone: '', taxCode: '', address: '' }
    }
    if (selectedId === selectedSupplier.id) {
      return {
        name: editName,
        phone: editPhone,
        taxCode: editTaxCode,
        address: editAddress,
      }
    }
    return {
      name: selectedSupplier.name,
      phone: selectedSupplier.phone ?? '',
      taxCode: selectedSupplier.taxCode ?? '',
      address: selectedSupplier.address ?? '',
    }
  }, [selectedSupplier, selectedId, editName, editPhone, editTaxCode, editAddress])

  const ensureEditSynced = () => {
    if (selectedSupplier && selectedId !== selectedSupplier.id) {
      setSelectedId(selectedSupplier.id)
      setEditName(selectedSupplier.name)
      setEditPhone(selectedSupplier.phone ?? '')
      setEditTaxCode(selectedSupplier.taxCode ?? '')
      setEditAddress(selectedSupplier.address ?? '')
    }
  }

  const handleSaveSelected = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedSupplier) return
    const trimmedName = currentForm.name.trim()
    if (!trimmedName) {
      setEditError('Tên nhà cung cấp không được để trống.')
      return
    }
    setEditError('')
    try {
      const updated = await updateSupplier.mutateAsync({
        supplierId: selectedSupplier.id,
        request: {
          name: trimmedName,
          phone: currentForm.phone.trim() || null,
          taxCode: currentForm.taxCode.trim() || null,
          address: currentForm.address.trim() || null,
          isActive: selectedSupplier.isActive,
        },
      })
      handleSelectSupplier(updated)
      notify.success(`Đã lưu cập nhật hồ sơ nhà cung cấp "${updated.name}".`)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể cập nhật nhà cung cấp.')
    }
  }

  const handleToggleActive = async () => {
    if (!selectedSupplier) return
    const nextState = !selectedSupplier.isActive
    setEditError('')
    try {
      const updated = await updateStatus.mutateAsync({
        supplierId: selectedSupplier.id,
        isActive: nextState,
      })
      handleSelectSupplier(updated)
      notify.success(
        nextState
          ? `Đã mở lại hợp tác với "${updated.name}".`
          : `Đã ngừng hợp tác với "${updated.name}".`,
      )
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể đổi trạng thái nhà cung cấp.')
    }
  }

  const handleCreateSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newName.trim()) {
      setAddError('Vui lòng nhập tên nhà cung cấp.')
      return
    }
    setAddError('')
    try {
      const created = await createSupplier.mutateAsync({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        taxCode: newTaxCode.trim() || null,
        address: newAddress.trim() || null,
        isActive: true,
      })
      handleSelectSupplier(created)
      setIsAddDialogOpen(false)
      setNewName('')
      setNewPhone('')
      setNewTaxCode('')
      setNewAddress('')
      notify.success(`Đã thêm nhà cung cấp "${created.name}" (${created.code}).`)
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Không thể tạo nhà cung cấp.')
    }
  }

  const handleDelete = async () => {
    if (!selectedSupplier) return
    setDeleteError('')
    try {
      await deleteSupplier.mutateAsync(selectedSupplier.id)
      setConfirmDeleteOpen(false)
      setSelectedId('')
      notify.success(`Đã xóa nhà cung cấp "${selectedSupplier.name}".`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa nhà cung cấp.')
    }
  }

  return (
    <WarehouseWorkspace
      action={
        canEdit ? (
          <Button onClick={() => setIsAddDialogOpen(true)}>+ Thêm nhà cung cấp</Button>
        ) : undefined
      }
      title="Đối tác & Nhà cung cấp"
    >
      <p className="text-xs text-slate-500">
        Quản lý hồ sơ pháp lý, đầu mối liên hệ và lịch sử phiếu nhập hàng từ đối tác.
      </p>

      <section className="grid gap-5 md:grid-cols-3">
        <Card padding="lg">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Đối tác đang hợp tác</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2.5 text-2xl font-black text-slate-900">{stats?.activeCount ?? 0}</p>
          <p className="mt-2 text-xs text-slate-500">
            Tổng {stats?.totalCount ?? 0} đối tác ({stats?.inactiveCount ?? 0} ngừng hợp tác)
          </p>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng giá trị đã nhập</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2.5 text-2xl font-black text-slate-900">
            {formatVnd(stats?.totalImportAmount ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Chứng từ hợp lệ đã xác nhận hoàn tất</p>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phiếu nhập đang xử lý</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2.5 text-2xl font-black text-amber-600">
            {formatVnd(stats?.totalPendingAmount ?? 0)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {stats?.pendingReceiptCount ?? 0} phiếu nháp / chờ duyệt
          </p>
        </Card>
      </section>

      <Card className="overflow-hidden" padding="none">
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Danh sách nhà cung cấp</h2>
            <span className="text-xs text-slate-500">{suppliers.length} đối tác</span>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                aria-label="Tìm nhà cung cấp"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên NCC, mã số thuế, số điện thoại..."
                type="search"
                value={search}
              />
            </div>

            <SelectBox
              hideLabel
              label="Lọc trạng thái hợp tác"
              onChange={(val) => setStatusFilter(val)}
              options={STATUS_FILTER_OPTIONS}
              searchable={false}
              value={statusFilter}
            />

            <SelectBox
              hideLabel
              label="Lọc công nợ"
              onChange={(val) => setDebtFilter(val)}
              options={DEBT_FILTER_OPTIONS}
              searchable={false}
              value={debtFilter}
            />
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3 text-left" scope="col">Đối tác / Mã</th>
                <th className="px-4 py-3 text-left" scope="col">Số điện thoại & Địa chỉ</th>
                <th className="px-4 py-3 text-left" scope="col">Mã số thuế</th>
                <th className="px-4 py-3 text-left" scope="col">Tổng giá trị nhập</th>
                <th className="px-4 py-3 text-left" scope="col">Đang xử lý</th>
                <th className="px-5 py-3 text-left" scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliersQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400" colSpan={6}>
                    Đang tải danh sách nhà cung cấp...
                  </td>
                </tr>
              ) : suppliersQuery.error ? (
                <tr>
                  <td className="px-5 py-10 text-center text-rose-700" colSpan={6}>
                    {suppliersQuery.error instanceof Error
                      ? suppliersQuery.error.message
                      : 'Không thể tải danh sách nhà cung cấp.'}
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Chưa có nhà cung cấp nào phù hợp với bộ lọc. Nhấn &ldquo;+ Thêm nhà cung cấp&rdquo; để tạo mới.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => {
                  const isSelected = selectedSupplier?.id === supplier.id
                  return (
                    <tr
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                      }`}
                      key={supplier.id}
                      onClick={() => handleSelectSupplier(supplier)}
                    >
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {supplier.name} - <span className="font-mono text-indigo-700">{supplier.code}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {[supplier.phone, supplier.address].filter(Boolean).join(' - ') || '—'}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-600">{supplier.taxCode || '—'}</td>
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {formatVnd(supplier.totalImportAmount)} ({supplier.receiptCount} phiếu)
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {formatVnd(supplier.pendingAmount)}
                      </td>
                      <td className="px-5 py-4">
                        {supplier.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            Đang hợp tác
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                            Ngừng hợp tác
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSupplier && (
        <Card padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hồ sơ nhà cung cấp đang chọn</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedSupplier.code} - {selectedSupplier.name}
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button
                  disabled={updateStatus.isPending}
                  onClick={() => void handleToggleActive()}
                  type="button"
                  variant="outline"
                >
                  {selectedSupplier.isActive ? 'Ngừng hợp tác' : 'Kích hoạt lại'}
                </Button>
                {selectedSupplier.receiptCount === 0 && (
                  <Button
                    onClick={() => {
                      setDeleteError('')
                      setConfirmDeleteOpen(true)
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Xóa
                  </Button>
                )}
              </div>
            )}
          </div>

          <form className="mt-5 space-y-5" onSubmit={(e) => void handleSaveSelected(e)}>
            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
                {editError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                disabled={!canEdit}
                label="Tên pháp lý / Tên nhà cung cấp *"
                onChange={(e) => {
                  ensureEditSynced()
                  setEditName(e.target.value)
                }}
                required
                value={currentForm.name}
              />
              <TextField
                disabled={!canEdit}
                label="Số điện thoại liên hệ"
                onChange={(e) => {
                  ensureEditSynced()
                  setEditPhone(e.target.value)
                }}
                value={currentForm.phone}
              />
              <TextField
                disabled={!canEdit}
                label="Mã số thuế"
                onChange={(e) => {
                  ensureEditSynced()
                  setEditTaxCode(e.target.value)
                }}
                value={currentForm.taxCode}
              />
            </div>

            <TextField
              disabled={!canEdit}
              label="Địa chỉ trụ sở"
              onChange={(e) => {
                ensureEditSynced()
                setEditAddress(e.target.value)
              }}
              value={currentForm.address}
            />

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-950 flex items-center gap-2.5">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-600 text-[10px] font-bold text-indigo-700">
                i
              </span>
              <span>
                Phiếu nhập đã duyệt không bị thay đổi khi cập nhật hồ sơ nhà cung cấp.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {canEdit && (
                <Button loading={updateSupplier.isPending} type="submit" variant="primary">
                  Lưu hồ sơ
                </Button>
              )}
              <Button
                onClick={() =>
                  navigate(`${catalogPaths.stockReceipts}?supplierId=${encodeURIComponent(selectedSupplier.id)}`)
                }
                type="button"
                variant="outline"
              >
                Xem các phiếu nhập
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isAddDialogOpen && (
        <CatalogDialog onClose={() => setIsAddDialogOpen(false)} title="Thêm nhà cung cấp mới">
          <form className="space-y-4" onSubmit={(e) => void handleCreateSupplier(e)}>
            {addError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                {addError}
              </p>
            )}
            <TextField
              label="Tên nhà cung cấp *"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="VD: NXB Kim Đồng"
              required
              value={newName}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Số điện thoại"
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="VD: 028 3930 5247"
                value={newPhone}
              />
              <TextField
                label="Mã số thuế"
                onChange={(e) => setNewTaxCode(e.target.value)}
                placeholder="VD: 0100108240"
                value={newTaxCode}
              />
            </div>
            <TextField
              label="Địa chỉ trụ sở"
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
              value={newAddress}
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsAddDialogOpen(false)} type="button" variant="ghost">
                Hủy
              </Button>
              <Button loading={createSupplier.isPending} type="submit" variant="primary">
                Tạo nhà cung cấp
              </Button>
            </div>
          </form>
        </CatalogDialog>
      )}

      {confirmDeleteOpen && selectedSupplier && (
        <ConfirmationDialog
          actions={
            <>
              <Button onClick={() => setConfirmDeleteOpen(false)} variant="ghost">
                Hủy
              </Button>
              <Button
                loading={deleteSupplier.isPending}
                onClick={() => void handleDelete()}
                variant="danger"
              >
                {deleteSupplier.isPending ? 'Đang xóa…' : 'Xóa nhà cung cấp'}
              </Button>
            </>
          }
          error={deleteError}
          message={`Bạn có chắc chắn muốn xóa nhà cung cấp "${selectedSupplier.name}"? Chỉ nhà cung cấp chưa phát sinh phiếu nhập kho mới có thể xóa.`}
          onClose={() => setConfirmDeleteOpen(false)}
          title={`Xóa ${selectedSupplier.name}`}
        />
      )}
    </WarehouseWorkspace>
  )
}
