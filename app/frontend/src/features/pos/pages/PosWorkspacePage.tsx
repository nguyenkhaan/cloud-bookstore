import { useContext, useEffect, useMemo, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common'
import { MainLayout as AppLayout } from '@/components/layout'
import { AuthContext } from '@/context/AuthProvider'
import { normalizeRoleCode } from '@/features/auth/role'
import { usePermissions } from '@/hooks/usePermissions'
import { canReadAccess, resolveEffectiveScreenAccess } from '@/routes/screen-access.policy'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { posPaths } from '../pos.route'
import type { DamageApprovalPath, PosTab, QuickSeriesFixture, ReturnLineFixture } from '../pos-transaction.type'
import { DamageReviewModal } from '../components/DamageReviewModal'
import { PosBuybackPanel } from '../components/PosBuybackPanel'
import { PosRentalPanel } from '../components/PosRentalPanel'
import { PosRenewalPanel } from '../components/PosRenewalPanel'
import { PosReturnPanel } from '../components/PosReturnPanel'
import { PosSalePanel } from '../components/PosSalePanel'
import { PosWorkspaceTabs } from '../components/PosWorkspaceTabs'
import { QuickSeriesPickerModal } from '../components/QuickSeriesPickerModal'
import { getVisiblePosTabs } from '../pos-transaction.fixture'

export default function PosWorkspacePage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const permissions = usePermissions()
  const roleCode = auth?.session?.user?.roleCode
  const role = normalizeRoleCode(roleCode)
  const permissionStatus = permissions.isError
    ? 'error'
    : permissions.isPending
      ? 'loading'
      : 'ready'
  const visibleTabs = useMemo(
    () => getVisiblePosTabs(roleCode, permissions.permissionCodes, permissionStatus),
    [permissionStatus, permissions.permissionCodes, roleCode],
  )
  const firstVisibleTab = visibleTabs[0]?.id ?? 'buyback'
  const [activeTab, setActiveTab] = useState<PosTab>(firstVisibleTab)
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false)
  const [damageTarget, setDamageTarget] = useState<ReturnLineFixture | null>(null)
  const [damageApprovalStatus, setDamageApprovalStatus] = useState<string>()
  const [quickPickerPreview, setQuickPickerPreview] = useState<QuickSeriesFixture>()
  const currentUser = auth?.session?.user ?? { name: 'Nguyễn Minh Anh', role: 'Thu ngân' }
  const canOpenCustomerDisplay = role !== null && canReadAccess(
    resolveEffectiveScreenAccess('posCustomerDisplay', role, permissions.permissionCodes, permissionStatus),
  )
  const canStartSale = visibleTabs.some((tab) => tab.id === 'sale')

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(firstVisibleTab)
    }
  }, [activeTab, firstVisibleTab, visibleTabs])

  const changeTab = (tab: PosTab) => {
    if (visibleTabs.some((candidate) => candidate.id === tab)) setActiveTab(tab)
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Quầy giao dịch', to: posPaths.root }]}
      currentPath="pos"
      onNavigate={(item) => { const path = workspacePathFor(item, roleCode); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Quầy giao dịch"
      actionButton={(canOpenCustomerDisplay || canStartSale) ? (
        <div className="flex flex-wrap gap-2">
          {canOpenCustomerDisplay && (
            <a target="_blank" href={posPaths.customerDisplay}>
              <Button type="button" size="sm" variant="secondary" icon={<ExternalLink aria-hidden="true" className="size-3.5" />}>Màn hình chuyển khoản</Button>
            </a>
          )}
          {canStartSale && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setActiveTab('sale')} icon={<RotateCcw aria-hidden="true" className="size-3.5" />}>Giao dịch mới</Button>
          )}
        </div>
      ) : undefined}
      user={currentUser}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Ca đang mở · 08:00 · 18/10/2026</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Ưu tiên quét <strong className="text-slate-900">CopyBarcode</strong> của từng bản sách vật lý.</p>
          </div>
          <div className="text-left text-xs text-slate-500 sm:text-right"><div className="font-semibold text-slate-800">Alola, {currentUser.name}</div></div>
        </div>

        <PosWorkspaceTabs activeTab={activeTab} onChange={changeTab} tabs={visibleTabs} />

        {activeTab === 'sale' && <PosSalePanel quickPickerPreview={quickPickerPreview} onOpenQuickPicker={() => setIsQuickPickerOpen(true)} />}
        {activeTab === 'rental' && <PosRentalPanel />}
        {activeTab === 'renewal' && <PosRenewalPanel />}
        {activeTab === 'return' && <PosReturnPanel damageApprovalStatus={damageApprovalStatus} onOpenDamageReview={(line) => setDamageTarget(line)} />}
        {activeTab === 'buyback' && (
          <PosBuybackPanel
            onConsumeQuickPickerBatch={() => setQuickPickerPreview(undefined)}
            onOpenQuickPicker={() => setIsQuickPickerOpen(true)}
            quickPickerBatch={quickPickerPreview}
          />
        )}
      </div>
      <QuickSeriesPickerModal open={isQuickPickerOpen} onClose={() => setIsQuickPickerOpen(false)} onApply={(fixture) => setQuickPickerPreview(fixture)} />
      <DamageReviewModal open={damageTarget !== null} copy={damageTarget ?? undefined} onClose={() => setDamageTarget(null)} onConfirm={(path: DamageApprovalPath) => { setDamageApprovalStatus(path === 'local-admin' ? 'Admin đã duyệt tại chỗ' : 'Đã gửi Trung tâm Phê duyệt · Chờ Admin'); setDamageTarget(null) }} />
    </AppLayout>
  )
}
