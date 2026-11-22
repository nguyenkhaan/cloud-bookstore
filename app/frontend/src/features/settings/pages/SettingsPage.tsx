import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { SettingsTabBar } from '../components/SettingsTabBar'
import { ScrSys01RentalPolicy } from '../components/ScrSys01RentalPolicy'
import { ScrSys02MembershipTiers } from '../components/ScrSys02MembershipTiers'
import { ScrSys03RbacMatrix } from '../components/ScrSys03RbacMatrix'
import { ScrSys04Integrations } from '../components/ScrSys04Integrations'
import { settingsPaths } from '../settings.route'
import type { SystemTabKey } from '../settings.type'
import { SettingsHistory } from '../components/SettingsHistory'

export default function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()

  const isAdmin = session?.user?.roleCode === 'ADMIN'

  // Determine active tab from current URL pathname
  const requestedTab: SystemTabKey = useMemo(() => {
    const path = location.pathname
    if (path.includes('/settings/tiers')) return 'tiers'
    if (path.includes('/settings/rbac')) return 'rbac'
    if (path.includes('/settings/integrations')) return 'integrations'
    return 'rental'
  }, [location.pathname])

  const activeTab: SystemTabKey = !isAdmin && (requestedTab === 'rbac' || requestedTab === 'integrations')
    ? 'rental'
    : requestedTab

  useEffect(() => {
    if (activeTab !== requestedTab) {
      navigate(settingsPaths.rental, { replace: true })
    }
  }, [activeTab, navigate, requestedTab])

  const [visitedTabs, setVisitedTabs] = useState<SystemTabKey[]>([activeTab])
  if (!visitedTabs.includes(activeTab)) {
    setVisitedTabs([...visitedTabs, activeTab])
  }

  const handleSelectTab = (tab: SystemTabKey) => {
    switch (tab) {
      case 'rental':
        navigate(settingsPaths.rental)
        break
      case 'tiers':
        navigate(settingsPaths.tiers)
        break
      case 'rbac':
        navigate(settingsPaths.rbac)
        break
      case 'integrations':
        navigate(settingsPaths.integrations)
        break
    }
  }

  const breadcrumbTitle = useMemo(() => {
    switch (activeTab) {
      case 'rental':
        return 'Cấu hình Tham số Thuê, Trả & Khung phạt'
      case 'tiers':
        return 'Cấu hình Hạng thành viên & Chiết khấu'
      case 'rbac':
        return 'Ma trận phân quyền RBAC'
      case 'integrations':
        return 'Cấu hình Tích hợp'
    }
  }, [activeTab])

  return (
    <MainLayout
      currentPath="settings"
      onNavigate={(id) => navigate(`/${id}`)}
      onSignOut={signOut}
      pageTitle={breadcrumbTitle}
      pageHeaderContent={<SettingsTabBar activeTab={activeTab} isAdmin={isAdmin} onSelectTab={handleSelectTab} />}
      breadcrumbs={[
        { label: 'Cấu hình hệ thống', to: settingsPaths.rental },
        { label: breadcrumbTitle },
      ]}
      user={
        session?.user
          ? {
              name: session.user.name,
              role: session.user.role,
              avatarUrl: session.user.avatarUrl,
            }
          : undefined
      }
    >
      <div className="flex w-full flex-col gap-6 pb-12">
        {visitedTabs.includes('rental') && (
          <div hidden={activeTab !== 'rental'}>
            <ScrSys01RentalPolicy isAdmin={isAdmin} />
          </div>
        )}
        {visitedTabs.includes('tiers') && (
          <div hidden={activeTab !== 'tiers'}>
            <ScrSys02MembershipTiers isAdmin={isAdmin} />
          </div>
        )}
        {visitedTabs.includes('rbac') && (
          <div hidden={activeTab !== 'rbac'}>
            <ScrSys03RbacMatrix isAdmin={isAdmin} />
          </div>
        )}
        {visitedTabs.includes('integrations') && (
          <div hidden={activeTab !== 'integrations'}>
            <ScrSys04Integrations isAdmin={isAdmin} />
          </div>
        )}
        <SettingsHistory group={activeTab === 'tiers' ? 'membership' : activeTab} isAdmin={isAdmin} />
      </div>
    </MainLayout>
  )
}
