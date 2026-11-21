import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { Button, Card, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { catalogPaths } from '../catalog.route'
import { CatalogDialog } from '../components/CatalogDialog'
import { CatalogWorkspace } from '../components/CatalogWorkspace'

export type SupplierProfile = {
  id: string
  code: string
  name: string
  legalName: string
  partnerType: 'PUBLISHER' | 'DISTRIBUTOR'
  contactPerson: string
  phone: string
  email: string
  taxCode: string
  address: string
  paymentTerms: string
  bankAccount: string
  monthlyImportAmount: number
  outstandingDebt: number
  unpaidReceiptCount: number
  isActive: boolean
}

const INITIAL_SUPPLIERS: SupplierProfile[] = [
  {
    id: 'sup-1',
    code: 'NCC-001',
    name: 'NXB Kim Đồng',
    legalName: 'Nhà xuất bản Kim Đồng',
    partnerType: 'PUBLISHER',
    contactPerson: 'Mai Thảo',
    phone: '028 3930 5247',
    email: 'doitac@kimdong.example',
    taxCode: '0100108240',
    address: '248 Cống Quỳnh, Quận 1, TP.HCM',
    paymentTerms: 'TERM_30',
    bankAccount: 'VCB - 5678 - NXB Kim Đồng',
    monthlyImportAmount: 16000000,
    outstandingDebt: 3000000,
    unpaidReceiptCount: 1,
    isActive: true,
  },
  {
    id: 'sup-2',
    code: 'NCC-002',
    name: 'NXB Trẻ',
    legalName: 'Công ty TNHH MTV Nhà xuất bản Trẻ',
    partnerType: 'PUBLISHER',
    contactPerson: 'Lê Thành',
    phone: '028 3931 6289',
    email: 'kinhdoanh@nxbtre.example',
    taxCode: '0300527159',
    address: '161B Lý Chính Thắng, Quận 3, TP.HCM',
    paymentTerms: 'TERM_30',
    bankAccount: 'ACB - 8892 - NXB Trẻ',
    monthlyImportAmount: 12000000,
    outstandingDebt: 3000000,
    unpaidReceiptCount: 1,
    isActive: true,
  },
  {
    id: 'sup-3',
    code: 'NCC-003',
    name: 'Phân phối Minh Long',
    legalName: 'Công ty TNHH Văn hóa Minh Long',
    partnerType: 'DISTRIBUTOR',
    contactPerson: 'Hoàng Mai',
    phone: '0908 212 333',
    email: 'phanphoi@minhlongbook.example',
    taxCode: '0102643512',
    address: '35 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    paymentTerms: 'TERM_15',
    bankAccount: 'TCB - 3310 - Văn hóa Minh Long',
    monthlyImportAmount: 8000000,
    outstandingDebt: 2000000,
    unpaidReceiptCount: 1,
    isActive: true,
  },
  {
    id: 'sup-4',
    code: 'NCC-004',
    name: 'Sách Nhã Nam',
    legalName: 'Công ty Cổ phần Văn hóa và Truyền thông Nhã Nam',
    partnerType: 'DISTRIBUTOR',
    contactPerson: 'Thu Vân',
    phone: '0903 889 122',
    email: 'hopdong@nhanam.example',
    taxCode: '0101601450',
    address: '015 Lô B Chung cư 43 Hồ Văn Huê, Phú Nhuận, TP.HCM',
    paymentTerms: 'IMMEDIATE',
    bankAccount: 'MBB - 1450 - Văn hóa Nhã Nam',
    monthlyImportAmount: 4000000,
    outstandingDebt: 0,
    unpaidReceiptCount: 0,
    isActive: true,
  },
  {
    id: 'sup-5',
    code: 'NCC-005',
    name: 'IPM Việt Nam',
    legalName: 'Công ty Cổ phần Xuất bản và Truyền thông IPM',
    partnerType: 'DISTRIBUTOR',
    contactPerson: 'Đức Minh',
    phone: '024 3783 4180',
    email: 'ipm@ipmvn.example',
    taxCode: '0102219081',
    address: '110 Nguyễn Ngọc Nại, Thanh Xuân, Hà Nội',
    paymentTerms: 'TERM_30',
    bankAccount: 'BIDV - 9081 - Xuất bản IPM',
    monthlyImportAmount: 0,
    outstandingDebt: 0,
    unpaidReceiptCount: 0,
    isActive: false,
  },
]

const STATUS_FILTER_OPTIONS: SelectOption<'ACTIVE' | 'ALL' | 'INACTIVE'>[] = [
  { value: 'ACTIVE', label: 'Đang hợp tác' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'INACTIVE', label: 'Ngừng hợp tác' },
]

const DEBT_FILTER_OPTIONS: SelectOption<'ALL' | 'HAS_DEBT' | 'NO_DEBT'>[] = [
  { value: 'ALL', label: 'Công nợ: Tất cả' },
  { value: 'HAS_DEBT', label: 'Còn công nợ' },
  { value: 'NO_DEBT', label: 'Không nợ' },
]

const PAYMENT_TERM_OPTIONS: SelectOption<string>[] = [
  { value: 'TERM_30', label: 'Công nợ 30 ngày' },
  { value: 'TERM_15', label: 'Công nợ 15 ngày' },
  { value: 'IMMEDIATE', label: 'Thanh toán ngay khi nhận hàng' },
]

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>(INITIAL_SUPPLIERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | 'INACTIVE'>('ACTIVE')
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT'>('ALL')
  const [selectedId, setSelectedId] = useState<string>(INITIAL_SUPPLIERS[0].id)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const [newName, setNewName] = useState('')
  const [newLegalName, setNewLegalName] = useState('')
  const [newContactPerson, setNewContactPerson] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTaxCode, setNewTaxCode] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPaymentTerms, setNewPaymentTerms] = useState('TERM_30')
  const [newBankAccount, setNewBankAccount] = useState('')
  const [addError, setAddError] = useState('')

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedId) ?? suppliers[0] ?? null,
    [suppliers, selectedId],
  )

  const [editLegalName, setEditLegalName] = useState(INITIAL_SUPPLIERS[0].legalName)
  const [editEmail, setEditEmail] = useState(INITIAL_SUPPLIERS[0].email)
  const [editPaymentTerms, setEditPaymentTerms] = useState(INITIAL_SUPPLIERS[0].paymentTerms)
  const [editAddress, setEditAddress] = useState(INITIAL_SUPPLIERS[0].address)
  const [editBankAccount, setEditBankAccount] = useState(INITIAL_SUPPLIERS[0].bankAccount)
  const [editPhone, setEditPhone] = useState(INITIAL_SUPPLIERS[0].phone)
  const [editTaxCode, setEditTaxCode] = useState(INITIAL_SUPPLIERS[0].taxCode)

  const handleSelectSupplier = (supplier: SupplierProfile) => {
    setSelectedId(supplier.id)
    setEditLegalName(supplier.legalName)
    setEditEmail(supplier.email)
    setEditPaymentTerms(supplier.paymentTerms)
    setEditAddress(supplier.address)
    setEditBankAccount(supplier.bankAccount)
    setEditPhone(supplier.phone)
    setEditTaxCode(supplier.taxCode)
  }

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return suppliers.filter((s) => {
      if (statusFilter === 'ACTIVE' && !s.isActive) return false
      if (statusFilter === 'INACTIVE' && s.isActive) return false
      if (debtFilter === 'HAS_DEBT' && s.outstandingDebt <= 0) return false
      if (debtFilter === 'NO_DEBT' && s.outstandingDebt > 0) return false
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.taxCode.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [suppliers, search, statusFilter, debtFilter])

  const stats = useMemo(() => {
    const activeList = suppliers.filter((s) => s.isActive)
    const publishers = activeList.filter((s) => s.partnerType === 'PUBLISHER').length
    const distributors = activeList.length - publishers
    const totalImport = suppliers.reduce((sum, s) => sum + s.monthlyImportAmount, 0)
    const totalDebt = suppliers.reduce((sum, s) => sum + s.outstandingDebt, 0)
    const unpaidReceipts = suppliers.reduce((sum, s) => sum + s.unpaidReceiptCount, 0)
    return {
      activeCount: activeList.length,
      publishers,
      distributors,
      totalImport,
      totalDebt,
      unpaidReceipts,
    }
  }, [suppliers])

  const handleSaveSelected = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedSupplier) return
    if (!editLegalName.trim()) {
      notify.error('Tên pháp lý nhà cung cấp không được để trống.')
      return
    }
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === selectedSupplier.id
          ? {
              ...s,
              legalName: editLegalName.trim(),
              email: editEmail.trim(),
              paymentTerms: editPaymentTerms,
              address: editAddress.trim(),
              bankAccount: editBankAccount.trim(),
              phone: editPhone.trim(),
              taxCode: editTaxCode.trim(),
            }
          : s,
      ),
    )
    notify.success(`Đã lưu cập nhật hồ sơ nhà cung cấp "${selectedSupplier.name}".`)
  }

  const handleToggleActive = () => {
    if (!selectedSupplier) return
    const nextState = !selectedSupplier.isActive
    setSuppliers((prev) =>
      prev.map((s) => (s.id === selectedSupplier.id ? { ...s, isActive: nextState } : s)),
    )
    notify.success(
      nextState
        ? `Đã mở lại hợp tác với "${selectedSupplier.name}".`
        : `Đã tạm ngừng hợp tác với "${selectedSupplier.name}".`,
    )
  }

  const handleCreateSupplier = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newName.trim()) {
      setAddError('Vui lòng nhập tên nhà cung cấp.')
      return
    }
    if (newTaxCode.trim() && suppliers.some((s) => s.taxCode === newTaxCode.trim())) {
      setAddError('Mã số thuế này đã tồn tại trong danh sách đối tác.')
      return
    }
    setAddError('')
    const nextNumber = suppliers.length + 1
    const created: SupplierProfile = {
      id: `sup-${Date.now()}`,
      code: `NCC-${String(nextNumber).padStart(3, '0')}`,
      name: newName.trim(),
      legalName: newLegalName.trim() || newName.trim(),
      partnerType: newName.toLowerCase().includes('nxb') ? 'PUBLISHER' : 'DISTRIBUTOR',
      contactPerson: newContactPerson.trim() || 'Phòng kinh doanh',
      phone: newPhone.trim() || '028 3800 0000',
      email: newEmail.trim() || 'lienhe@doitac.example',
      taxCode: newTaxCode.trim() || `01009988${nextNumber}`,
      address: newAddress.trim() || 'TP. Hồ Chí Minh',
      paymentTerms: newPaymentTerms,
      bankAccount: newBankAccount.trim() || 'Chưa cập nhật tài khoản',
      monthlyImportAmount: 0,
      outstandingDebt: 0,
      unpaidReceiptCount: 0,
      isActive: true,
    }
    setSuppliers((prev) => [created, ...prev])
    handleSelectSupplier(created)
    setIsAddDialogOpen(false)
    setNewName('')
    setNewLegalName('')
    setNewContactPerson('')
    setNewPhone('')
    setNewEmail('')
    setNewTaxCode('')
    setNewAddress('')
    setNewBankAccount('')
    notify.success(`Đã thêm nhà cung cấp "${created.name}" (${created.code}).`)
  }

  return (
    <CatalogWorkspace
      action={<Button onClick={() => setIsAddDialogOpen(true)}>+ Thêm nhà cung cấp</Button>}
      title="Đối tác & Nhà cung cấp"
    >
      <p className="-mt-3 text-xs text-slate-500">
        Quản lý hồ sơ pháp lý, đầu mối liên hệ và công nợ nhập hàng.
      </p>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5" padding="none">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Đối tác đang hợp tác</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.activeCount}</p>
          <p className="mt-2 text-xs text-slate-500">
            {stats.distributors} nhà phân phối - {stats.publishers} NXB
          </p>
        </Card>

        <Card className="p-5" padding="none">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Giá trị nhập tháng này</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatVnd(stats.totalImport)}</p>
          <p className="mt-2 text-xs text-slate-500">Chứng từ hợp lệ đã xác nhận</p>
        </Card>

        <Card className="p-5" padding="none">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Công nợ phải trả</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600">{formatVnd(stats.totalDebt)}</p>
          <p className="mt-2 text-xs text-slate-500">{stats.unpaidReceipts} phiếu chưa thanh toán</p>
        </Card>
      </section>

      <Card className="overflow-hidden" padding="none">
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Danh sách nhà cung cấp</h2>
            <span className="text-xs text-slate-400">•••</span>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
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
                <th className="px-4 py-3 text-left" scope="col">Đầu mối liên hệ</th>
                <th className="px-4 py-3 text-left" scope="col">Mã số thuế</th>
                <th className="px-4 py-3 text-left" scope="col">Nhập tháng này</th>
                <th className="px-4 py-3 text-left" scope="col">Công nợ</th>
                <th className="px-5 py-3 text-left" scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Không tìm thấy nhà cung cấp phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
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
                        {supplier.contactPerson} - {supplier.phone}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-600">{supplier.taxCode}</td>
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {formatVnd(supplier.monthlyImportAmount)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {formatVnd(supplier.outstandingDebt)}
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

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500">
          <span>
            Hiển thị 1–{filteredSuppliers.length} trong {suppliers.length} đối tác
          </span>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
              1
            </span>
          </div>
        </div>
      </Card>

      {selectedSupplier && (
        <Card className="p-5" padding="none">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hồ sơ nhà cung cấp đang chọn</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedSupplier.code} - {selectedSupplier.name}
              </p>
            </div>
            <Button onClick={handleToggleActive} type="button" variant="ghost">
              {selectedSupplier.isActive ? 'Ngừng hợp tác' : 'Kích hoạt lại'}
            </Button>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSaveSelected}>
            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Tên pháp lý"
                onChange={(e) => setEditLegalName(e.target.value)}
                required
                value={editLegalName}
              />
              <TextField
                label="Email nhận chứng từ"
                onChange={(e) => setEditEmail(e.target.value)}
                type="email"
                value={editEmail}
              />
              <SelectBox
                label="Điều khoản thanh toán"
                onChange={(val) => setEditPaymentTerms(val)}
                options={PAYMENT_TERM_OPTIONS}
                searchable={false}
                value={editPaymentTerms}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Địa chỉ"
                onChange={(e) => setEditAddress(e.target.value)}
                value={editAddress}
              />
              <TextField
                label="Số điện thoại & Mã số thuế"
                onChange={(e) => {
                  const parts = e.target.value.split('-')
                  setEditPhone(parts[0]?.trim() ?? '')
                  if (parts[1]) setEditTaxCode(parts[1].trim())
                }}
                value={`${editPhone} - MST: ${editTaxCode}`}
              />
              <TextField
                label="Tài khoản ngân hàng"
                onChange={(e) => setEditBankAccount(e.target.value)}
                value={editBankAccount}
              />
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-950 flex items-center gap-2.5">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-600 text-[10px] font-bold text-indigo-700">
                i
              </span>
              <span>
                Phiếu nhập đã duyệt không bị thay đổi khi cập nhật hồ sơ nhà cung cấp.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" variant="primary">
                Lưu hồ sơ
              </Button>
              <Button
                onClick={() => navigate(`${catalogPaths.stockReceipts}?supplierId=${encodeURIComponent(selectedSupplier.id)}`)}
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
          <form className="space-y-4" onSubmit={handleCreateSupplier}>
            {addError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                {addError}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Tên gọi đối tác *"
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: NXB Kim Đồng"
                required
                value={newName}
              />
              <TextField
                label="Tên pháp lý đầy đủ"
                onChange={(e) => setNewLegalName(e.target.value)}
                placeholder="VD: Nhà xuất bản Kim Đồng"
                value={newLegalName}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Người liên hệ"
                onChange={(e) => setNewContactPerson(e.target.value)}
                placeholder="VD: Mai Thảo"
                value={newContactPerson}
              />
              <TextField
                label="Số điện thoại *"
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="VD: 028 3930 5247"
                required
                value={newPhone}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Mã số thuế"
                onChange={(e) => setNewTaxCode(e.target.value)}
                placeholder="VD: 0100108240"
                value={newTaxCode}
              />
              <TextField
                label="Email nhận chứng từ"
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="doitac@example.com"
                type="email"
                value={newEmail}
              />
            </div>
            <TextField
              label="Địa chỉ trụ sở"
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
              value={newAddress}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectBox
                label="Điều khoản thanh toán"
                onChange={(val) => setNewPaymentTerms(val)}
                options={PAYMENT_TERM_OPTIONS}
                searchable={false}
                value={newPaymentTerms}
              />
              <TextField
                label="Tài khoản ngân hàng"
                onChange={(e) => setNewBankAccount(e.target.value)}
                placeholder="Ngân hàng - Số TK - Chủ TK"
                value={newBankAccount}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button onClick={() => setIsAddDialogOpen(false)} type="button" variant="ghost">
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Tạo nhà cung cấp
              </Button>
            </div>
          </form>
        </CatalogDialog>
      )}
    </CatalogWorkspace>
  )
}
