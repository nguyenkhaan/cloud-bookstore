import { useState } from 'react';
import { MainLayout } from './components/layout';
import { SearchIcon } from './components/common/Icons';

export function App() {
  const [currentTab, setCurrentTab] = useState('pos');

  return (
    <MainLayout
      currentPath={currentTab}
      onNavigate={(id) => setCurrentTab(id)}
      screenCode={
        currentTab === 'overview'
          ? 'TỔNG QUAN'
          : undefined
      }
      pageTitle={
        currentTab === 'overview'
          ? 'Tổng quan kinh doanh'
          : undefined
      }
    >
      {currentTab === 'overview' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-500">
            Chào Minh Anh, đây là nhịp vận hành Nhà sách Mây hôm nay · Cập nhật 18/10/2026 10:24
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Bán + Thuê đã quyết toán</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">8.420.000đ</div>
              <div className="text-[10px] text-slate-400 mt-1">Bán 6.200.000đ + Thuê 2.220.000đ</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Số dư két tiền mặt</div>
              <div className="text-xl font-bold text-slate-900 mt-1">12.680.000đ</div>
              <div className="text-[10px] text-slate-400 mt-1">2 két đang hoạt động</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Cọc đang giữ · Nợ phải trả</div>
              <div className="text-xl font-bold text-amber-600 mt-1">18.600.000đ</div>
              <div className="text-[10px] text-slate-400 mt-1">KHÔNG tính vào doanh thu</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Phiếu thuê lưu hành</div>
              <div className="text-xl font-bold text-slate-900 mt-1">84</div>
              <div className="text-[10px] text-slate-400 mt-1">12 phiếu quá hạn cần thu hồi</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">VietQR đối soát thành công</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">98,4%</div>
              <div className="text-[10px] text-slate-400 mt-1">Mục tiêu &gt; 95% · 123/125 lượt</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Hoạt động cần chú ý hôm nay</h3>
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
          </div>
        </div>
      )}

      {currentTab !== 'overview' && (
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

export default App;