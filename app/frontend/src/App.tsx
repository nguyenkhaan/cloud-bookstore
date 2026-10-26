import { useState } from 'react';
import { MainLayout } from './components/layout';
import { PrinterIcon, SearchIcon } from './components/common/Icons';

export function App() {
  const [currentTab, setCurrentTab] = useState('pos');

  return (
    <MainLayout
      currentPath={currentTab}
      onNavigate={(id) => setCurrentTab(id)}
      screenCode={
        currentTab === 'pos'
          ? 'SCR-POS-05 / POS'
          : currentTab === 'overview'
          ? 'SCR-REP-01 / TỔNG QUAN'
          : currentTab === 'approvals'
          ? 'SCR-APP-01 / PHÊ DUYỆT'
          : undefined
      }
      pageTitle={
        currentTab === 'pos'
          ? 'Nhận trả sách & Quyết toán tiền cọc'
          : currentTab === 'overview'
          ? 'Tổng quan kinh doanh'
          : currentTab === 'approvals'
          ? 'Trung tâm Phê duyệt ngoại lệ'
          : undefined
      }
      actionButton={
        currentTab === 'pos' ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <PrinterIcon size={15} />
            <span>In biên lai quyết toán · Ctrl P</span>
          </button>
        ) : currentTab === 'approvals' ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span>Lịch sử phê duyệt</span>
          </button>
        ) : null
      }
    >
      {currentTab === 'pos' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-500">
            RENT-20261008-0038 • Nguyễn Thu Hà - 0909 234 567 • Hạn trả 17/10/2026 23:59
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Kiểm định toàn bộ phiếu
                  </h2>
                  <span className="text-slate-400 cursor-pointer text-xs">•••</span>
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  Đã xác nhận 3/3 bản • 2 bản đã quét và 1 bản khai báo mất
                </div>

                <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-700 mb-3">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-mono text-base font-bold">|||'</span>
                    <span>Quét Barcode từng cuốn trả...</span>
                  </div>
                  <kbd className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-600 shadow-2xs">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-600 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Máy quét đang lắng nghe • Chế độ minh họa</span>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 mb-4">
                  <span className="font-semibold">⚠️ Trễ hạn trên 2 giờ</span> - Đã tính
                  phạt trễ 150%. Trễ 10 giờ 43 phút → 1 ngày trễ. Cuốn mất không tính phí thuê
                  / phạt trễ.
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                        <th className="py-2.5 px-3 font-semibold">Barcode / Tên sách</th>
                        <th className="py-2.5 px-3 font-semibold">Cọc từng cuốn</th>
                        <th className="py-2.5 px-3 font-semibold">Xác nhận</th>
                        <th className="py-2.5 px-3 font-semibold">Tình trạng thực tế</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Khấu trừ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          <span className="font-semibold">BC-2101</span> · Doraemon tập 01
                        </td>
                        <td className="py-3 px-3 text-slate-600">80.000đ</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Đã quét
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Nguyên vẹn ▾</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">0đ</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          <span className="font-semibold">BC-2102</span> · Conan tập 10
                        </td>
                        <td className="py-3 px-3 text-slate-600">100.000đ</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Đã quét
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Hỏng nhẹ - 20% ▾</td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">
                          20.000đ
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          <span className="font-semibold">BC-2103</span> · Nhà giả kim
                        </td>
                        <td className="py-3 px-3 text-slate-600">120.000đ</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            Đã khai báo
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">Mất sách - 100% ▾</td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">
                          120.000đ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Đánh dấu mất cuốn đang chọn
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Gửi duyệt phạt ngoại lệ
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Tranh chấp cần Quản lý duyệt
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Quyết toán tiền cọc
                  </h2>
                  <span className="text-slate-400 cursor-pointer text-xs">•••</span>
                </div>
                <div className="mb-4">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Đã xác nhận toàn bộ sách
                  </span>
                </div>

                <div className="space-y-2 text-xs border-b border-slate-100 pb-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">A · Tiền cọc ban đầu</span>
                    <span className="font-semibold text-slate-800">300.000đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">B · Phí thuê thực tế</span>
                    <span className="font-medium text-slate-700">- 31.500đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">C · Phí gia hạn</span>
                    <span className="font-medium text-slate-700">- 13.500đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">D · Phạt trả trễ</span>
                    <span className="font-medium text-rose-600">- 7.500đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">E · Bồi thường hư hỏng</span>
                    <span className="font-medium text-rose-600">- 20.000đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">F · Cọc giữ do mất sách</span>
                    <span className="font-medium text-rose-600">- 120.000đ</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                    HOÀN KHÁCH = MAX(0, A-B-C-D-E-F)
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    107.500đ
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold mb-4">
                  <button
                    type="button"
                    className="rounded-lg bg-white py-1.5 text-center text-slate-800 shadow-2xs"
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    className="rounded-lg py-1.5 text-center text-slate-500 hover:text-slate-800"
                  >
                    Chuyển khoản ngoài
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
                  >
                    Xác nhận trả & Hoàn cọc tiền mặt
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Xác nhận trả & Hoàn cọc chuyển khoản
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {currentTab === 'approvals' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-500">
            8 yêu cầu đang chờ · Quản lý / Admin xét duyệt theo bằng chứng và thẩm quyền
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Chờ xử lý</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">08</div>
              <div className="text-[10px] text-slate-400 mt-0.5">5 nhóm nghiệp vụ</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Ưu tiên tại quầy</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">03</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Thu ngân đang chờ kết quả</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Đã duyệt hôm nay</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">12</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Có đầy đủ ghi chú và nhật ký</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">Thời gian chờ trung bình</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">6 phút</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Từ lúc tạo yêu cầu</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 hover:bg-slate-200"
            >
              Thu mua vượt hạn mức · 2
            </button>
            <button
              type="button"
              className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 font-semibold text-indigo-700"
            >
              Phạt hư hỏng · 2
            </button>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 hover:bg-slate-200"
            >
              Đảo bản 24h · 1
            </button>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 hover:bg-slate-200"
            >
              Đối soát kho · 1
            </button>
            <button
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 hover:bg-slate-200"
            >
              Nhân sự & Công · 2
            </button>
          </div>
        </div>
      )}

      {currentTab !== 'pos' && currentTab !== 'overview' && currentTab !== 'approvals' && (
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