import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { Header, type BreadcrumbItem } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';

export interface MainLayoutProps {
  children?: React.ReactNode;
  currentPath?: string;
  onNavigate?: (id: string) => void;
  onSignOut?: () => void;
  breadcrumbs?: (string | BreadcrumbItem)[];
  pageTitle?: string;
  screenCode?: string;
  actionButton?: React.ReactNode;
  user?: {
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPath = 'overview',
  onNavigate,
  onSignOut,
  breadcrumbs,
  pageTitle,
  actionButton,
  user,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getBreadcrumbs = (): (string | BreadcrumbItem)[] => {
    if (breadcrumbs) return breadcrumbs;
    switch (currentPath) {
      case 'overview':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Tổng quan' },
        ];
      case 'pos':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'POS' },
        ];
      case 'approvals':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Phê duyệt' },
        ];
      case 'inventory':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Kho & đầu sách', href: '/catalog/series' },
        ];
      case 'customers':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Khách hàng' },
        ];
      case 'hr':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Nhân sự' },
        ];
      case 'audit':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Nhật ký kiểm toán' },
        ];
      case 'reports':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Báo cáo & thuế' },
        ];
      case 'settings':
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Cấu hình' },
        ];
      default:
        return [
          { label: 'Không gian làm việc', href: '/dashboard' },
          { label: 'Hệ thống' },
        ];
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
          onSignOut={onSignOut}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          breadcrumbs={getBreadcrumbs()}
          onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)}
          isSidebarCollapsed={isCollapsed}
          user={user}
        />

        <main className="flex-1 px-6 py-6 overflow-y-auto">
          {(pageTitle || actionButton) && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {pageTitle && (
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {pageTitle}
                </h1>
              )}
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
