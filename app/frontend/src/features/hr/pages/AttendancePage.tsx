import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { IntegratedAttendanceWorkspace } from '../components/IntegratedAttendanceWorkspace'
import { hrPaths } from '../hr.route'

export default function AttendancePage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Khách', role: 'Nhân viên', roleCode: undefined }
  const isAdminView = currentUser.roleCode === 'ADMIN'

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự & tiền lương', to: hrPaths.root }, { label: 'Chấm công' }]}
      currentPath="hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Điểm danh & Bảng chấm công"
      user={currentUser}
    >
      <IntegratedAttendanceWorkspace actorName={currentUser.name} isAdminView={isAdminView} />
    </MainLayout>
  )
}
