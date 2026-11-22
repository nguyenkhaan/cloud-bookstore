import React, { useEffect, useState } from 'react'
import { notify } from '@/components/common/Toast'
import { useRentalPolicy, useUpdateRentalPolicy } from '../settings.hook'
import type { DamagePenaltyConfig } from '../settings.type'

interface ScrSys01RentalPolicyProps {
  isAdmin: boolean
}

const DEFAULT_DAMAGE_PENALTIES: DamagePenaltyConfig[] = [
  {
    conditionName: 'Mất bìa / Rách bìa nhẹ',
    penaltyPct: 20,
    basis: 'Giá bán thực tế cuốn',
    settlementRule: 'Trừ cọc khi quyết toán',
  },
  {
    conditionName: 'Vẽ bẩn / Ố vàng trang',
    penaltyPct: 40,
    basis: 'Giá bán thực tế cuốn',
    settlementRule: 'Trừ cọc khi quyết toán',
  },
  {
    conditionName: 'Rách nát nhiều trang / Ướt',
    penaltyPct: 70,
    basis: 'Giá bán thực tế cuốn',
    settlementRule: 'Trừ cọc khi quyết toán',
  },
  {
    conditionName: 'Mất sách',
    penaltyPct: 100,
    basis: 'Tiền cọc cuốn mất',
    settlementRule: 'Chuyển doanh thu bán; không tính thuê / trễ',
  },
]

export const ScrSys01RentalPolicy: React.FC<ScrSys01RentalPolicyProps> = ({ isAdmin }) => {
  const { data: policy, isLoading, isError, refetch } = useRentalPolicy()
  const [initialized, setInitialized] = useState(false)
  const updateMutation = useUpdateRentalPolicy()

  const [activeSubTab, setActiveSubTab] = useState<'policy' | 'penalties' | 'history'>('policy')
  const [maxExtensions, setMaxExtensions] = useState<number>(2)
  const [extensionDays, setExtensionDays] = useState<number>(7)
  const [graceHours, setGraceHours] = useState<number>(2)
  const [latePenaltyRate, setLatePenaltyRate] = useState<number>(150)
  const [damagePenalties, setDamagePenalties] = useState<DamagePenaltyConfig[]>(DEFAULT_DAMAGE_PENALTIES)
  const [changeReason, setChangeReason] = useState<string>('Áp dụng thống nhất chính sách thuê và khung phạt đã công bố.')
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  useEffect(() => {
    if (policy && !initialized) {
      setInitialized(true)
      setMaxExtensions(policy.maxExtensions)
      setExtensionDays(policy.extensionDaysPerTime)
      setGraceHours(policy.gracePeriodHours)
      setLatePenaltyRate(policy.latePenaltyRatePct)
      if (policy.damagePenalties) {
        setDamagePenalties(policy.damagePenalties)
      }
      if (policy.changeReason) {
        setChangeReason(policy.changeReason)
      }
    }
  }, [policy, initialized])

  const handleResetDefaults = () => {
    setMaxExtensions(2)
    setExtensionDays(7)
    setGraceHours(2)
    setLatePenaltyRate(150)
    setDamagePenalties(DEFAULT_DAMAGE_PENALTIES)
    setChangeReason('Khôi phục về tham số mặc định của hệ thống.')
    notify.success('Đã khôi phục các tham số mặc định. Nhấn "Lưu thay đổi tham số" để áp dụng.')
  }

  const handleSaveConfirm = async () => {
    if (!isAdmin) {
      notify.error('Chỉ Admin mới có quyền thay đổi chính sách.')
      return
    }

    if (!changeReason.trim()) {
      notify.error('Vui lòng nhập lý do thay đổi để lưu vào nhật ký kiểm toán.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        maxExtensions: Number(maxExtensions),
        extensionDaysPerTime: Number(extensionDays),
        gracePeriodHours: Number(graceHours),
        latePenaltyRatePct: Number(latePenaltyRate),
        damagePenalties,
        changeReason: changeReason.trim(),
      })
      setShowConfirmModal(false)
      notify.success('Lưu chính sách thành công. Các tham số đã được cập nhật cho các phiếu mới.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi cập nhật chính sách.')
    }
  }

  if (!isLoading && (isError || !policy)) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <p>Không thể tải cấu hình. Vui lòng thử lại trước khi chỉnh sửa.</p>
        <button type="button" onClick={() => void refetch()} className="mt-2 min-h-11 rounded-lg border px-4 font-semibold">
          Thử lại
        </button>
      </div>
    )
  }

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sub Tabs */}
      <div className="flex items-center gap-4 bg-indigo-50/60 p-2 rounded-xl text-xs font-medium text-slate-600 border border-indigo-100/80">
        <button
          type="button"
          onClick={() => setActiveSubTab('policy')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
            activeSubTab === 'policy' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          ▣ Chính sách cho thuê
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveSubTab('penalties')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
            activeSubTab === 'penalties' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Xử phạt & Bồi thường
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
            activeSubTab === 'history' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Lịch sử áp dụng
        </button>
      </div>

      {/* Main Grid: Left content (2 cols) & Right sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: 2 spans */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card: Chính sách cho thuê */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Chính sách cho thuê</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tỷ lệ tiền cọc (Cố định) */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Tỷ lệ tiền cọc · Cố định</span>
                <span className="text-sm font-bold text-slate-900 block">100% giá bán thực tế</span>
              </div>

              {/* Số lần gia hạn tối đa */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                <label htmlFor="max-extensions-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số lần gia hạn tối đa *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="max-extensions-input"
                    type="number"
                    min="0"
                    max="10"
                    disabled={!isAdmin}
                    value={maxExtensions}
                    onChange={(e) => setMaxExtensions(Number(e.target.value))}
                    className="w-20 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs text-slate-500">lần (Mặc định: 2 lần)</span>
                </div>
              </div>

              {/* Số ngày gia hạn mỗi lần */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                <label htmlFor="extension-days-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số ngày gia hạn mỗi lần *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="extension-days-input"
                    type="number"
                    min="1"
                    max="30"
                    disabled={!isAdmin}
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(Number(e.target.value))}
                    className="w-20 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs text-slate-500">ngày (Mặc định: 7 ngày)</span>
                </div>
              </div>

              {/* Thời điểm thu phí thuê */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Thời điểm thu phí thuê</span>
                <span className="text-sm font-bold text-slate-900 block">Khi trả & Quyết toán</span>
              </div>
            </div>

            {/* Note alert */}
            <div className="bg-indigo-50 text-indigo-700 text-xs p-3.5 rounded-xl flex items-start gap-2 border border-indigo-100">
              <span className="font-bold shrink-0">ⓘ</span>
              <span>
                Tổng thời hạn sau gia hạn vẫn phải nằm trong hạn mức hạng: Thường 16 ngày, Bạc 24 ngày, Vàng 36 ngày.
              </span>
            </div>
          </div>

          {/* Card: Xử phạt trả trễ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Xử phạt trả trễ</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Khung giờ miễn phạt */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                <label htmlFor="grace-hours-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Khung giờ miễn phạt *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="grace-hours-input"
                    type="number"
                    min="0"
                    max="24"
                    disabled={!isAdmin}
                    value={graceHours}
                    onChange={(e) => setGraceHours(Number(e.target.value))}
                    className="w-20 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs text-slate-500">giờ sau 23:59 ngày đến hạn</span>
                </div>
              </div>

              {/* Hệ số phạt trả trễ */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                <label htmlFor="late-rate-input" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Hệ số phạt trả trễ *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="late-rate-input"
                    type="number"
                    min="100"
                    max="300"
                    step="10"
                    disabled={!isAdmin}
                    value={latePenaltyRate}
                    onChange={(e) => setLatePenaltyRate(Number(e.target.value))}
                    className="w-20 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs text-slate-500">% đơn giá thuê/ngày gốc</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Trong 2 giờ kể từ hạn 23:59: miễn phạt. Trễ trên 2 giờ: số ngày trễ làm tròn lên × {latePenaltyRate}% × đơn giá thuê gốc.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                ≤ 2 giờ · Phạt 0đ
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                &gt; 2 giờ · Tính phạt {latePenaltyRate}%
              </span>
            </div>
          </div>

          {/* Card: Khung phạt bồi thường theo tình trạng */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Khung phạt bồi thường theo tình trạng</h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-indigo-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Tình trạng thực tế</th>
                    <th className="py-3 px-4">Tỷ lệ</th>
                    <th className="py-3 px-4">Căn cứ</th>
                    <th className="py-3 px-4">Quy tắc xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {damagePenalties.map((item, idx) => (
                    <tr key={item.conditionName} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.conditionName}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.penaltyPct}
                              onChange={(e) => {
                                const newPct = Number(e.target.value)
                                setDamagePenalties((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, penaltyPct: newPct } : p))
                                )
                              }}
                              className="w-14 text-xs font-bold text-rose-600 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-600"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          `${item.penaltyPct}%`
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.basis}</td>
                      <td className="py-3 px-4 text-slate-500">{item.settlementRule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50 text-indigo-700 text-xs p-3.5 rounded-xl flex items-start gap-2 border border-indigo-100">
              <span className="font-bold shrink-0">ⓘ</span>
              <span>
                Hoàn cọc = max(0, cọc − các khoản trừ). Không thu thêm nếu khoản trừ đã chạm trần tiền cọc. Tranh chấp / ngoài khung phải gửi Quản lý phê duyệt.
              </span>
            </div>
          </div>
        </div>

        {/* Right column: 1 span */}
        <div className="flex flex-col gap-6">
          {/* Card: Phạm vi áp dụng */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">Phạm vi áp dụng</h2>

            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Phiên bản chính sách · {policy?.policyVersion ?? 'POL-008'}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>Cập nhật gần nhất: {policy?.lastUpdatedAt ? new Date(policy.lastUpdatedAt).toLocaleDateString('vi-VN') : '01/10/2026'}</p>
              <p>{policy?.lastUpdatedByName ?? 'Nguyễn Minh Anh · Admin'}</p>
            </div>

            <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-100">
              <p className="font-semibold mb-0.5">ⓘ Lưu ý hiệu lực:</p>
              <p>Phiếu đang lưu hành và phiếu lịch sử giữ nguyên chính sách đã chốt khi tạo.</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={!isAdmin || updateMutation.isPending}
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi tham số'}
              </button>

              <button
                type="button"
                disabled={!isAdmin}
                onClick={handleResetDefaults}
                className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Khôi phục mặc định
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full flex flex-col gap-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận lưu chính sách · Trạng thái hỗ trợ
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tham số mới sẽ áp dụng từ thời điểm này, không ảnh hưởng các phiếu thuê đang lưu hành hoặc lịch sử.
              </p>
            </div>

            <div>
              <label htmlFor="change-reason-modal" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Lý do thay đổi để lưu nhật ký kiểm toán *
              </label>
              <textarea
                id="change-reason-modal"
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Nhập lý do điều chỉnh tham số..."
                className="w-full text-xs text-slate-900 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending || !changeReason.trim()}
                onClick={handleSaveConfirm}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                {updateMutation.isPending ? 'Đang ghi nhận...' : 'Xác nhận lưu cho phiếu mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
