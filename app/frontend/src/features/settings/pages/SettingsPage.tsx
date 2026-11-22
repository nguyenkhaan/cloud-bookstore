import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
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
  const activeTab: SystemTabKey = useMemo(() => {
    const path = location.pathname
    if (path === settingsPaths.tiers) return 'tiers'
    if (path === settingsPaths.rbac) return 'rbac'
    if (path === settingsPaths.integrations) return 'integrations'
    return 'rental'
  }, [location.pathname])

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

  const screenCode = useMemo(() => {
    switch (activeTab) {
      case 'rental':
        return 'SCR-SYS-01'
      case 'tiers':
        return 'SCR-SYS-02'
      case 'rbac':
        return 'SCR-SYS-03'
      case 'integrations':
        return 'SCR-SYS-04'
    }
  }, [activeTab])

  if (!isAdmin && (activeTab === 'rbac' || activeTab === 'integrations')) {
    return <Navigate replace to={settingsPaths.rental} />
  }

  return (
    <MainLayout
      currentPath="settings"
      onNavigate={(id) => navigate(`/${id}`)}
      onSignOut={signOut}
      screenCode={screenCode}
      pageTitle={breadcrumbTitle}
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
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
        <SettingsTabBar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isAdmin={isAdmin}
        />

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
        {isAdmin && visitedTabs.includes('rbac') && (
          <div hidden={activeTab !== 'rbac'}>
            <ScrSys03RbacMatrix isAdmin={isAdmin} />
          </div>
        )}
        {isAdmin && visitedTabs.includes('integrations') && (
          <div hidden={activeTab !== 'integrations'}>
            <ScrSys04Integrations isAdmin={isAdmin} />
          </div>
        )}
        <SettingsHistory group={activeTab === 'tiers' ? 'membership' : activeTab} isAdmin={isAdmin} />
      </div>
    </MainLayout>
  )
}
