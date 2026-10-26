import React from 'react';
import { BellIcon, PanelToggleIcon } from '../../common/Icons';
import { Badge } from '../../common/Badge';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  breadcrumbs?: (string | BreadcrumbItem)[];
  shiftName?: string;
  isShiftOpen?: boolean;
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
  breadcrumbs = ['Không gian làm việc', 'POS', 'Nhận trả sách & Quyết toán tiền cọc'],
  shiftName = 'Ca sáng đang mở',
  isShiftOpen = true,
  user = {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
  },
  unreadNotifications = 3,
  onToggleSidebar,
}) => {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          >
            <PanelToggleIcon size={18} />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const label = typeof crumb === 'string' ? crumb : crumb.label;
            const href = typeof crumb === 'string' ? undefined : crumb.href;

            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-400 select-none">/</span>}
                {isLast ? (
                  <span className="font-medium text-slate-800">{label}</span>
                ) : href ? (
                  <a
                    href={href}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                  >
                    {label}
                  </a>
                ) : (
                  <span className="text-slate-500">{label}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {shiftName && (
          <Badge
            variant={isShiftOpen ? 'success' : 'neutral'}
            size="md"
            dot
            pulse={isShiftOpen}
          >
            {shiftName}
          </Badge>
        )}

        <button
          type="button"
          aria-label="Thông báo"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <BellIcon size={18} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2.5 pl-1 cursor-pointer select-none group">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-2 ring-indigo-50">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(-2)
                .join('')
                .toUpperCase()}
            </div>
          )}

          <div className="hidden text-left sm:block">
            <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {user.name}
            </div>
            <div className="text-[11px] text-slate-500">{user.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
