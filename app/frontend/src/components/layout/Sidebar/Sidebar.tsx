import React from 'react';
import logoImg from '../../../assets/images/logo.jpg';
import {
  DashboardIcon,
  PosIcon,
  InventoryIcon,
  CustomerIcon,
  StaffIcon,
  ApprovalIcon,
  AuditIcon,
  ReportIcon,
  SettingsIcon,
  HeadphonesIcon,
  PanelToggleIcon,
  ExternalLinkIcon,
} from '../../common/Icons';
import { Badge, type BadgeVariant } from '../../common/Badge';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  badgeVariant?: BadgeVariant;
}

export interface SidebarProps {
  currentPath?: string;
  onNavigate?: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  storeName?: string;
  branchName?: string;
  storeAddress?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: DashboardIcon },
  { id: 'pos', label: 'Quầy giao dịch', icon: PosIcon },
  { id: 'inventory', label: 'Kho & đầu sách', icon: InventoryIcon },
  { id: 'customers', label: 'Khách hàng', icon: CustomerIcon },
  { id: 'hr', label: 'Nhân sự & tiền lương', icon: StaffIcon },
  { id: 'approvals', label: 'Phê duyệt', icon: ApprovalIcon, badge: '08', badgeVariant: 'orange' },
  { id: 'audit', label: 'Nhật ký kiểm toán', icon: AuditIcon },
  { id: 'reports', label: 'Báo cáo & thuế', icon: ReportIcon },
  { id: 'settings', label: 'Cấu hình hệ thống', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = 'pos',
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  storeName = 'Nhà sách Mây',
  branchName = 'Cơ sở 01',
  storeAddress = 'Quận 3, TP. Hồ Chí Minh',
}) => {
  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen sticky top-0`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="shrink-0 cursor-pointer">
            <img
              src={logoImg}
              alt="ComicPOS Logo"
              className="h-8 w-8 rounded-lg object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                ComicPOS
              </span>
              <span className="text-[9px] font-semibold tracking-wider text-slate-400 mt-1 uppercase">
                Old Books • New Stories
              </span>
            </div>
          )}
        </div>

        {!isCollapsed ? (
          <div className="mb-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2.5 px-3 transition-colors">
            <div className="text-xs font-semibold text-slate-800">
              {storeName} • {branchName}
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
                className={`group flex w-full items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
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

                {!isCollapsed && item.badge && (
                  <Badge variant={item.badgeVariant || 'orange'} size="xs">
                    {item.badge}
                  </Badge>
                )}
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
                <div className="text-xs font-semibold text-slate-800">
                  Luôn sẵn sàng hỗ trợ
                </div>
                <div className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                  Hướng dẫn nghiệp vụ và phím tắt tại quầy.
                </div>
                <a
                  href="#support"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  <span>Mở trung tâm trợ giúp</span>
                  <ExternalLinkIcon size={11} />
                </a>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`flex w-full items-center rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${
            isCollapsed ? 'justify-center' : 'gap-2.5'
          }`}
          title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          <PanelToggleIcon size={17} className={isCollapsed ? 'rotate-180' : ''} />
          {!isCollapsed && <span>Thu gọn thanh bên</span>}
        </button>
      </div>
    </aside>
  );
};