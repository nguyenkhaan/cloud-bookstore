import { catalogPaths } from '@/features/catalog/catalog.route'

export const workspacePaths = {
  overview: '/dashboard',
  pos: '/pos',
  inventory: catalogPaths.seriesList,
  customers: '/customers',
  hr: '/hr',
  approvals: '/approvals',
  audit: '/audit',
  reports: '/reports',
  settings: '/settings',
} as const

export type WorkspaceItem = keyof typeof workspacePaths

export function workspacePathFor(item: string): string | undefined {
  return workspacePaths[item as WorkspaceItem]
}
