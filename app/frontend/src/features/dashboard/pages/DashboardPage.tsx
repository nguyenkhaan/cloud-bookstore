import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, StatCard, SearchIcon } from '@/components/common';
import type { DashboardPageProps } from '@/features/dashboard/dashboard.type';

export function DashboardPage({ onSignOut }: DashboardPageProps) {
  const [currentTab, setCurrentTab] = useState('overview');

  return (
    <MainLayout
      onSignOut={onSignOut}
      currentPath={currentTab}
      onNavigate={(id) => setCurrentTab(id)}
      screenCode={currentTab === 'overview' ? 'SCR-REP-01 / TỔNG QUAN' : undefined}
      pageTitle={currentTab === 'overview' ? 'Tổng quan kinh doanh' : undefined}
      user={{
        name: 'Nguyễn Minh Anh',
        role: 'Quản trị viên',
      }}
    >
      {currentTab === 'overview' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Chào Minh Anh, đây là nhịp vận hành Nhà sách Mây hôm nay · Cập nhật 18/10/2026 10:24</span>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Đăng xuất
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Bán + Thuê đã quyết toán"
              value="8.420.000đ"
              valueColor="emerald"
              description="Bán 6.200.000đ + Thuê 2.220.000đ"
            />
            <StatCard
              label="Số dư két tiền mặt"
              value="12.680.000đ"
              valueColor="default"
              description="2 két đang hoạt động"
            />
            <StatCard
              label="Cọc đang giữ · Nợ phải trả"
              value="18.600.000đ"
              valueColor="amber"
              description="KHÔNG tính vào doanh thu"
            />
            <StatCard
              label="Phiếu thuê lưu hành"
              value="84"
              valueColor="default"
              description="12 phiếu quá hạn cần thu hồi"
            />
            <StatCard
              label="VietQR đối soát thành công"
              value="98,4%"
              valueColor="emerald"
              description="Mục tiêu > 95% · 123/125 lượt"
            />
          </div>

          <Card title="Hoạt động cần chú ý hôm nay">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs">
                <span className="font-bold text-rose-700">12 phiếu quá hạn</span>
                <p className="text-slate-600 mt-1 text-[11px]">8 khách đã quá hạn trên 7 ngày, ưu tiên liên hệ thu hồi.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
                <span className="font-bold text-amber-700">18 đầu sách chạm min</span>
                <p className="text-slate-600 mt-1 text-[11px]">5 đầu sách không còn bản khả dụng. Cần tạo phiếu nhập kho.</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                <span className="font-bold text-emerald-700">Đối soát VietQR</span>
                <p className="text-slate-600 mt-1 text-[11px]">Tất cả giao dịch trực tuyến đã khớp lệnh thành công.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <SearchIcon size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Phân hệ đang được chuẩn bị</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Layout chung đã được gắn kết sẵn sàng cho các trang tiếp theo theo đúng kiến trúc nghiệp vụ.
          </p>
        </div>
      )}
    </MainLayout>
  );
}

export default DashboardPage
