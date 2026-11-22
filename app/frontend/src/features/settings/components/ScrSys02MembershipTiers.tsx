import React, { useEffect, useState } from 'react'
import { notify } from '@/components/common/Toast'
import { useMembershipPolicy, useUpdateMembershipPolicy } from '../settings.hook'
import type { MembershipTierItem } from '../settings.type'

interface ScrSys02MembershipTiersProps {
  isAdmin: boolean
}

export const ScrSys02MembershipTiers: React.FC<ScrSys02MembershipTiersProps> = ({ isAdmin }) => {
  const { data: policy, isLoading, isError, refetch } = useMembershipPolicy()
  const [initialized, setInitialized] = useState(false)
  const updateMutation = useUpdateMembershipPolicy()

  const [tiers, setTiers] = useState<MembershipTierItem[]>([])
  const [changeReason, setChangeReason] = useState<string>('Áp dụng ngưỡng liên tục và quyền lợi chiết khấu theo phân hạng thành viên.')
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  const hasAllTiers = policy?.tiers?.length === 3 &&
    ['REGULAR', 'SILVER', 'GOLD'].every(name => policy.tiers.some(tier => tier.name === name))

  useEffect(() => {
    if (policy && hasAllTiers && !initialized) {
      setInitialized(true)
      setTiers(policy.tiers)
      if (policy.changeReason) {
        setChangeReason(policy.changeReason)
      }
    }
  }, [policy, hasAllTiers, initialized])

  const handleTierChange = (index: number, field: keyof MembershipTierItem, value: number) => {
    setTiers((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, [field]: value } : t))
    )
  }

  const handleSave = async () => {
    if (!isAdmin) {
      notify.error('Chỉ Admin mới có quyền thay đổi cấu hình hạng thành viên.')
      return
    }

    if (!changeReason.trim()) {
      notify.error('Vui lòng nhập lý do điều chỉnh để lưu vào lịch sử.')
      return
    }

    if (tiers.some(tier =>
      !Number.isFinite(tier.minSpend) || tier.minSpend < 0 ||
      (tier.maxSpend != null && (!Number.isFinite(tier.maxSpend) || tier.maxSpend < 0)) ||
      !Number.isInteger(tier.maxBooks) || tier.maxBooks <= 0 ||
      !Number.isInteger(tier.maxRentalDays) || tier.maxRentalDays <= 0 ||
      [tier.rentDiscountPct, tier.saleDiscountPct].some(pct => !Number.isFinite(pct) || pct < 0 || pct > 100)
    )) {
      notify.error('Chi tiêu phải không âm; số sách và ngày thuê phải là số nguyên dương; chiết khấu từ 0 đến 100%.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        tiers,
        changeReason: changeReason.trim(),
      })
      setShowConfirmModal(false)
      notify.success('Chính sách hạng thành viên và tỷ lệ chiết khấu đã được lưu thành công.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu.')
    }
  }

  if (!isLoading && (isError || !hasAllTiers)) {
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

  const regularTier = tiers.find((t) => t.name === 'REGULAR') !
  const silverTier = tiers.find((t) => t.name === 'SILVER') !
  const goldTier = tiers.find((t) => t.name === 'GOLD') !

  return (
    <div className="flex flex-col gap-6">
      {/* 3 Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Normal Tier Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hạng Thường</h3>
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
              Chi tiêu &lt; {new Intl.NumberFormat('vi-VN').format(silverTier.minSpend)}đ
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {regularTier.maxBooks} cuốn / {regularTier.maxRentalDays} ngày
          </div>
          <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm phí thuê</span>
              <span className="font-bold text-slate-900">{regularTier.rentDiscountPct}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm giá mua sách</span>
              <span className="font-bold text-slate-900">{regularTier.saleDiscountPct}%</span>
            </div>
          </div>
        </div>

        {/* Silver Tier Card */}
        <div className="bg-white border border-indigo-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs ring-1 ring-indigo-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hạng Bạc</h3>
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {new Intl.NumberFormat('vi-VN').format(silverTier.minSpend)}đ – {new Intl.NumberFormat('vi-VN').format(goldTier.minSpend)}đ
            </span>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
            {silverTier.maxBooks} cuốn / {silverTier.maxRentalDays} ngày
          </div>
          <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm phí thuê</span>
              <span className="font-bold text-indigo-600">{silverTier.rentDiscountPct}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm giá mua sách</span>
              <span className="font-bold text-indigo-600">{silverTier.saleDiscountPct}%</span>
            </div>
          </div>
        </div>

        {/* Gold Tier Card */}
        <div className="bg-white border border-amber-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs ring-1 ring-amber-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Gold</h3>
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
              Chi tiêu ≥ {new Intl.NumberFormat('vi-VN').format(goldTier.minSpend)}đ
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
            {goldTier.maxBooks} cuốn / {goldTier.maxRentalDays} ngày
          </div>
          <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm phí thuê</span>
              <span className="font-bold text-amber-600">{goldTier.rentDiscountPct}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Giảm giá mua sách</span>
              <span className="font-bold text-amber-600">{goldTier.saleDiscountPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Bảng cấu hình hạng</h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Hạng</th>
                <th className="py-3 px-4">Khoảng chi tiêu hợp lệ</th>
                <th className="py-3 px-4">Cuốn tối đa</th>
                <th className="py-3 px-4">Ngày tối đa</th>
                <th className="py-3 px-4">Giảm thuê</th>
                <th className="py-3 px-4">Giảm mua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tiers.map((tier, idx) => (
                <tr key={tier.name} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{tier.displayName}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {idx === 0 && `0đ ≤ chi tiêu < ${new Intl.NumberFormat('vi-VN').format(silverTier.minSpend)}đ`}
                    {idx === 1 && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="100000"
                          disabled={!isAdmin}
                          value={tier.minSpend}
                          onChange={(e) => handleTierChange(idx, 'minSpend', Number(e.target.value))}
                          className="w-28 border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold focus:border-indigo-600 focus:outline-none"
                        />
                        <span>đ ≤ chi tiêu &lt; {new Intl.NumberFormat('vi-VN').format(goldTier.minSpend)}đ</span>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="flex items-center gap-1.5">
                        <span>Chi tiêu ≥</span>
                        <input
                          type="number"
                          step="100000"
                          disabled={!isAdmin}
                          value={tier.minSpend}
                          onChange={(e) => handleTierChange(idx, 'minSpend', Number(e.target.value))}
                          className="w-28 border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold focus:border-indigo-600 focus:outline-none"
                        />
                        <span>đ</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      disabled={!isAdmin}
                      value={tier.maxBooks}
                      onChange={(e) => handleTierChange(idx, 'maxBooks', Number(e.target.value))}
                      className="w-16 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      disabled={!isAdmin}
                      value={tier.maxRentalDays}
                      onChange={(e) => handleTierChange(idx, 'maxRentalDays', Number(e.target.value))}
                      className="w-16 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        value={tier.rentDiscountPct}
                        onChange={(e) => handleTierChange(idx, 'rentDiscountPct', Number(e.target.value))}
                        className="w-16 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-indigo-600 focus:border-indigo-600 focus:outline-none"
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        value={tier.saleDiscountPct}
                        onChange={(e) => handleTierChange(idx, 'saleDiscountPct', Number(e.target.value))}
                        className="w-16 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-indigo-600 focus:border-indigo-600 focus:outline-none"
                      />
                      <span>%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-xl border border-emerald-100 flex items-start gap-2">
          <span className="font-bold shrink-0">ⓘ</span>
          <span>
            Ngưỡng hợp lệ: dưới {new Intl.NumberFormat('vi-VN').format(silverTier.minSpend)}đ → Thường; từ {new Intl.NumberFormat('vi-VN').format(silverTier.minSpend)}đ đến dưới {new Intl.NumberFormat('vi-VN').format(goldTier.minSpend)}đ → Bạc; từ {new Intl.NumberFormat('vi-VN').format(goldTier.minSpend)}đ → Vàng. Không có khoảng trống hoặc chồng lấn.
          </span>
        </div>
      </div>

      {/* Rules & Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Cách tính chi tiêu xét hạng */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900">Cách tính chi tiêu xét hạng</h2>
          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p>✓ Tiền mua sách sau chiết khấu, giao dịch hoàn tất.</p>
            <p>✓ Phí thuê đã quyết toán khi trả sách.</p>
            <p>✓ Phí gia hạn đã quyết toán khi trả sách.</p>
          </div>
          <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl border border-amber-100">
            <p className="font-bold mb-0.5">ⓘ Lưu ý loại trừ:</p>
            <p>Loại trừ: tiền cọc nhận / hoàn, tiền phạt, tiền thu mua trả khách và phí thuê / gia hạn chưa quyết toán.</p>
          </div>
        </div>

        {/* Card: Tác động khi lưu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900">Tác động khi lưu</h2>
          <div className="text-xs text-slate-500">
            Cập nhật gần nhất: {policy?.lastUpdatedAt ? new Date(policy.lastUpdatedAt).toLocaleDateString('vi-VN') : '18/10/2026'} · {policy?.lastUpdatedByName ?? 'Admin'}
          </div>
          <div className="pt-2">
            <button
              type="button"
              disabled={!isAdmin || updateMutation.isPending}
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi hạng'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full flex flex-col gap-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận lưu thay đổi hạng thành viên
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Các ngưỡng chi tiêu và mức chiết khấu mới sẽ có hiệu lực ngay lập tức.
              </p>
            </div>

            <div>
              <label htmlFor="tier-change-reason" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Lý do thay đổi cấu hình *
              </label>
              <textarea
                id="tier-change-reason"
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Nhập lý do điều chỉnh hạng và chiết khấu..."
                className="w-full text-xs text-slate-900 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending || !changeReason.trim()}
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Xác nhận áp dụng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
