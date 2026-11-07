import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '../workspace.route'
import type { WorkspaceItem } from '../workspace.route'

type WorkspacePlaceholderPageProps = {
  currentPath: WorkspaceItem
  title: string
}

export function WorkspacePlaceholderPage({ currentPath, title }: WorkspacePlaceholderPageProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  return (
    <MainLayout
      currentPath={currentPath}
      onNavigate={(item) => {
        const path = workspacePathFor(item)
        if (path) navigate(path)
      }}
      onSignOut={signOut}
      pageTitle={title}
      user={currentUser}
    >
      <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-sm font-bold text-slate-800">Phân hệ đang được chuẩn bị</h2>
        <p className="mt-1 max-w-sm text-xs text-slate-500">Layout chung đã được gắn kết sẵn sàng cho các trang tiếp theo theo đúng kiến trúc nghiệp vụ.</p>
      </div>
    </MainLayout>
  )
}
