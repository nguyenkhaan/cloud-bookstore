import React from 'react';
import {
  DashboardIcon,
  InventoryIcon,
  HeadphonesIcon,
  PanelToggleIcon,
  ExternalLinkIcon,
  LogoutIcon,
} from '@/components/common/Icons';
import { Logo } from '@/components/common/Logo';
import { brand } from '@/lib/brand';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface SidebarProps {
  currentPath?: string;
  onNavigate?: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
  storeName?: string;
  branchName?: string;
  storeAddress?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: DashboardIcon },
  { id: 'inventory', label: 'Kho & đầu sách', icon: InventoryIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = 'overview',
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  onSignOut,
  storeName = brand.storeName,
  storeAddress = brand.address,
}) => {
  const handleSignOut = () => {
    onSignOut?.();
  };
  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen sticky top-0`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
        <div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <Logo variant={isCollapsed ? 'mark' : 'full'} />
        </div>

        {!isCollapsed ? (
          <div className="mb-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5 px-3 transition-colors">
            <div className="text-xs font-semibold text-slate-800">
              {storeName}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{storeAddress}</div>
          </div>
        ) : (
          <div className="my-2 h-px bg-slate-200" />
        )}

        {!isCollapsed ? (
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Không gian làm việc
          </div>
        ) : (
          <div className="h-2" />
        )}

        <nav className="space-y-1">
          {DEFAULT_NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`group flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    <Icon size={19} />
                  </div>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        {!isCollapsed && (
          <div className="mb-3 rounded-2xl border border-indigo-100/80 bg-linear-to-b from-indigo-50/60 to-indigo-50/20 p-3.5 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <HeadphonesIcon size={15} />
              </div>
              <div>
              <a
                href="mailto:bookstore@gmail.com"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
              >
                <span>Liên hệ trợ giúp</span>
                <ExternalLinkIcon size={11} />
              </a>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title={isCollapsed ? 'Đăng xuất' : undefined}
          >
            <LogoutIcon size={17} />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <PanelToggleIcon size={17} className={isCollapsed ? 'rotate-180' : ''} />
            {!isCollapsed && <span>Thu gọn thanh bên</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
