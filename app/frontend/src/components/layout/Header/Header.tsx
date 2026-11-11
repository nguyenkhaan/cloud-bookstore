import React, { useContext } from 'react';
import { BellIcon, PanelToggleIcon } from '@/components/common/Icons';
import { Avatar } from '@/components/common/Avatar';
import { Breadcrumb, type BreadcrumbItem } from '@/components/common/Breadcrumb';
import { AuthContext } from '@/context/AuthProvider';

export interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  shiftName?: string;
  isShiftOpen?: boolean;
  /** Overrides the signed-in user; by default the header reads it from the auth session. */
  user?: {
    name: string;
    role: string;
    avatarUrl?: string;
  };
  unreadNotifications?: number;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
                                                breadcrumbs = [],
                                                user,
                                                unreadNotifications = 3,
                                                onToggleSidebar,
                                              }) => {
  const auth = useContext(AuthContext);
  const currentUser = user ?? auth?.session?.user;

  return (
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 sm:px-6 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {onToggleSidebar && (
              <button
                  type="button"
                  onClick={onToggleSidebar}
                  aria-label="Toggle Sidebar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                <PanelToggleIcon size={18} />
              </button>
          )}

          <Breadcrumb
              className="min-w-0 items-center space-x-2 overflow-hidden whitespace-nowrap text-xs"
              items={breadcrumbs}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
              type="button"
              aria-label="Thông báo"
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <BellIcon size={18} />
            {unreadNotifications > 0 && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {currentUser && (
              <div className="flex items-center gap-2.5 pl-1 select-none">
                <Avatar imageUrl={currentUser.avatarUrl} name={currentUser.name} />
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-600">{currentUser.role}</div>
                </div>
              </div>
          )}
        </div>
      </header>
  );
};