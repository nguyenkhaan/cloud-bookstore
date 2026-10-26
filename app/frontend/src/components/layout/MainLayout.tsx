import React, { useState } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header, type BreadcrumbItem } from './Header/Header';
import { Footer } from './Footer/Footer';

export interface MainLayoutProps {
  children?: React.ReactNode;
  currentPath?: string;
  onNavigate?: (id: string) => void;
  breadcrumbs?: (string | BreadcrumbItem)[];
  pageTitle?: string;
  screenCode?: string;
  actionButton?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPath = 'pos',
  onNavigate,
  breadcrumbs,
  pageTitle,
  screenCode,
  actionButton,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getBreadcrumbs = (): (string | BreadcrumbItem)[] => {
    if (breadcrumbs) return breadcrumbs;
    switch (currentPath) {
      case 'overview':
        return ['Không gian làm việc', 'Tổng quan', 'Tổng quan kinh doanh'];
      case 'pos':
        return ['Không gian làm việc', 'POS', 'Nhận trả sách & Quyết toán tiền cọc'];
      case 'approvals':
        return ['Không gian làm việc', 'Phê duyệt', 'Trung tâm Phê duyệt ngoại lệ'];
      case 'inventory':
        return ['Không gian làm việc', 'Kho & đầu sách', 'Danh mục ấn bản'];
      case 'customers':
        return ['Không gian làm việc', 'Khách hàng', 'Danh sách thành viên'];
      case 'hr':
        return ['Không gian làm việc', 'Nhân sự', 'Chấm công & Lương ca'];
      case 'audit':
        return ['Không gian làm việc', 'Nhật ký kiểm toán', 'Lịch sử giao dịch'];
      case 'reports':
        return ['Không gian làm việc', 'Báo cáo & thuế', 'Báo cáo doanh thu'];
      case 'settings':
        return ['Không gian làm việc', 'Cấu hình', 'Tham số hệ thống'];
      default:
        return ['Không gian làm việc', 'Hệ thống'];
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 lg:static transition-transform duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentPath={currentPath}
          onNavigate={(id) => {
            onNavigate?.(id);
            setIsMobileOpen(false);
          }}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          breadcrumbs={getBreadcrumbs()}
          onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)}
          isSidebarCollapsed={isCollapsed}
        />

        <main className="flex-1 px-6 py-6 overflow-y-auto">
          {(pageTitle || screenCode || actionButton) && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {screenCode && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-0.5">
                    {screenCode}
                  </div>
                )}
                {pageTitle && (
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {pageTitle}
                  </h1>
                )}
              </div>

              {actionButton && <div>{actionButton}</div>}
            </div>
          )}

          <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-between">
            <div>{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};