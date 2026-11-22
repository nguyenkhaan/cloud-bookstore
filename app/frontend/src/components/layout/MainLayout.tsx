import React, { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { BreadcrumbItem } from '@/components/common/Breadcrumb';
import { Sidebar, navLabelFor } from '@/components/layout/Sidebar/Sidebar';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { AuthContext } from '@/context/AuthProvider';
import { resolveHrRoleCode } from '@/features/hr/hr-role.util';

export interface MainLayoutProps {
  children?: React.ReactNode;
  currentPath?: string;
  onNavigate?: (id: string) => void;
  onSignOut?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  pageTitle?: string;
  pageHeaderContent?: React.ReactNode;
  pageSubtitle?: string;
  actionButton?: React.ReactNode;
  user?: {
    name: string;
    role: string;
    roleCode?: string;
    avatarUrl?: string;
  };
}

export const MainLayout: React.FC<MainLayoutProps> = ({
                                                        children,
                                                        currentPath = 'pos',
                                                        onNavigate,
                                                        onSignOut,
                                                        breadcrumbs,
                                                        pageTitle,
                                                        pageHeaderContent,
                                                        pageSubtitle,
                                                        actionButton,
                                                        user,
                                                      }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const auth = useContext(AuthContext);
  const effectiveUser = user ?? auth?.session?.user;
  const userRoleCode = resolveHrRoleCode(effectiveUser, location.search);

  return (
      <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
        {isMobileOpen && (
            <div
                className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                onClick={() => setIsMobileOpen(false)}
            />
        )}

        <div
            className={`fixed inset-y-0 left-0 z-40 lg:static transition-transform duration-300 lg:translate-x-0 print:hidden ${
                isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <Sidebar
              activeHref={location.pathname}
              currentPath={currentPath}
              onNavigate={(id) => {
                onNavigate?.(id);
                setIsMobileOpen(false);
              }}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
              onSignOut={onSignOut}
              userRoleCode={userRoleCode}
          />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <Header
              breadcrumbs={breadcrumbs ?? [{ label: navLabelFor(currentPath) }]}
              onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)}
              isSidebarCollapsed={isCollapsed}
              user={user}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 overflow-y-auto">
            {(pageTitle || pageSubtitle || pageHeaderContent || actionButton) && (
                <div className="mb-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {pageTitle && (
                          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            {pageTitle}
                          </h1>
                      )}
                      {pageSubtitle && (
                          <p className="mt-1 text-xs text-slate-500">
                            {pageSubtitle}
                          </p>
                      )}
                    </div>

                    {actionButton && <div className="shrink-0">{actionButton}</div>}
                  </div>
                  {pageHeaderContent && <div className="mt-4">{pageHeaderContent}</div>}
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
