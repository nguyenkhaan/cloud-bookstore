import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { WeeklyRoster } from '../components/WeeklyRoster'
import { hrPaths } from '../hr.route'

export default function ShiftRecordsPage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Khách', role: 'Nhân viên', roleCode: undefined }
  const isAdminView = currentUser.roleCode === 'ADMIN'

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự & tiền lương', to: hrPaths.root }, { label: 'Lập lịch phân ca' }]}
      currentPath="hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Lập lịch phân ca làm việc"
      user={currentUser}
    >
      <WeeklyRoster actorName={currentUser.name} isAdminView={isAdminView} />
    </MainLayout>
  )
}
