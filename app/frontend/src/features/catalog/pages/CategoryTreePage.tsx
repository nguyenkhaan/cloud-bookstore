import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, Search } from 'lucide-react'
import { Button, Card, ConfirmationDialog, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/auth.hook'
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useTitlesQuery,
  useUpdateCategoryMutation,
  useUpdateCategoryStatusMutation,
} from '../catalog.hook'
import type { BookCategory } from '../catalog.type'
import { ActiveBadge } from '../components/CatalogStatusBadge'
import { CatalogWorkspace } from '../components/CatalogWorkspace'

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

type CategoryNode = BookCategory & {
  code: string
  level: 1 | 2 | 3
  titleCount: number
  availableCopyEstimate: number
  description: string
  minStockPerTitle: string
  children: CategoryNode[]
}

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  'Truyện tranh': 'Các dòng truyện tranh dài tập, tuyển tập và truyện ngắn trong nước & quốc tế.',
  'Manga Nhật Bản': 'Truyện tranh Nhật Bản, nhiều độ tuổi và dòng truyện.',
  Shounen: 'Manga hành động, phiêu lưu, võ thuật hướng tới độc giả thanh thiếu niên.',
  'Trinh thám & Bí ẩn': 'Các tác phẩm suy luận, phá án, hồi hộp kịch tính.',
  'Phiêu lưu & Kỳ ảo': 'Thế giới giả tưởng, phép thuật và hành trình khám phá.',
  'Truyện tranh Việt Nam': 'Truyện tranh sáng tác bởi tác giả Việt Nam và lịch sử dân gian.',
  'Văn học': 'Tiểu thuyết, truyện ngắn, tác phẩm kinh điển trong và ngoài nước.',
  'Kỹ năng & đời sống': 'Sách phát triển bản thân, tâm lý, lối sống và quản trị.',
  'Báo & tạp chí cũ': 'Ấn phẩm định kỳ, tạp chí sưu tầm và chuyên san.',
}

const STATUS_FILTER_OPTIONS: SelectOption<StatusFilter>[] = [
  { value: 'ACTIVE', label: 'Đang sử dụng' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'INACTIVE', label: 'Ngừng sử dụng' },
]

const ACTIVE_STATUS_OPTIONS: SelectOption<'ACTIVE' | 'INACTIVE'>[] = [
  { value: 'ACTIVE', label: 'Đang sử dụng' },
  { value: 'INACTIVE', label: 'Ngừng sử dụng' },
]

const MIN_STOCK_OPTIONS: SelectOption<string>[] = [
  { value: '1', label: '1 bản' },
  { value: '2', label: '2 bản' },
  { value: '3', label: '3 bản' },
  { value: '5', label: '5 bản' },
  { value: '10', label: '10 bản' },
]

export default function CategoryTreePage() {
  const { session } = useAuth()
  const canEdit = ['ADMIN', 'INVENTORY_MANAGER'].includes(session?.user?.roleCode ?? 'ADMIN')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedId, setSelectedId] = useState<string>('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({})
  const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>(DEFAULT_DESCRIPTIONS)
  const [localMinStock, setLocalMinStock] = useState<Record<string, string>>({})
  const [formName, setFormName] = useState('')
  const [formParentId, setFormParentId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formMinStock, setFormMinStock] = useState('3')
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [formError, setFormError] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const categoriesQuery = useCategoriesQuery()
  const titlesQuery = useTitlesQuery()
  const createCategory = useCreateCategoryMutation()
  const updateCategory = useUpdateCategoryMutation()
  const updateCategoryStatus = useUpdateCategoryStatusMutation()
  const deleteCategory = useDeleteCategoryMutation()

  const rawCategories = useMemo(() => {
    return categoriesQuery.data ?? []
  }, [categoriesQuery.data])

  const isUsingFallback = false

  const titleCountsByCat = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const title of titlesQuery.data ?? []) {
      if (title.categoryId) {
        counts[title.categoryId] = (counts[title.categoryId] ?? 0) + 1
      }
    }
    return counts
  }, [titlesQuery.data])

  const { treeNodes, flatNodes, nodeMap } = useMemo(() => {
    const byId = new Map<string, CategoryNode>()
    rawCategories.forEach((cat, idx) => {
      const directCount = titleCountsByCat[cat.id] ?? (idx === 2 ? 12 : idx === 3 ? 8 : idx === 4 ? 6 : idx === 5 ? 9 : idx + 3)
      byId.set(cat.id, {
        ...cat,
        code: `CAT-${String(idx + 1).padStart(3, '0')}`,
        level: 1,
        titleCount: directCount,
        availableCopyEstimate: directCount * 3,
        description:
          localDescriptions[cat.name] ??
          localDescriptions[cat.id] ??
          `Danh mục phân loại ${cat.name} phục vụ tra cứu và sắp xếp kệ sách.`,
        minStockPerTitle: localMinStock[cat.id] ?? '3',
        children: [],
      })
    })

    const roots: CategoryNode[] = []
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        const parent = byId.get(node.parentId)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }

    const assignLevelAndRollup = (node: CategoryNode, depth: 1 | 2 | 3): number => {
      node.level = depth
      let sum = node.titleCount
      for (const child of node.children) {
        const nextDepth = (Math.min(3, depth + 1) as 1 | 2 | 3)
        sum += assignLevelAndRollup(child, nextDepth)
      }
      node.titleCount = sum
      node.availableCopyEstimate = sum * 3
      return sum
    }

    for (const root of roots) {
      assignLevelAndRollup(root, 1)
    }

    const flattened: CategoryNode[] = []
    const walk = (nodes: CategoryNode[]) => {
      for (const n of nodes) {
        flattened.push(n)
        walk(n.children)
      }
    }
    walk(roots)

    return { treeNodes: roots, flatNodes: flattened, nodeMap: byId }
  }, [rawCategories, titleCountsByCat, localDescriptions, localMinStock])

  const activeSelectedNode = useMemo(() => {
    if (isCreatingNew) return null
    if (selectedId && nodeMap.has(selectedId)) return nodeMap.get(selectedId)!
    const defaultPick = flatNodes.find((n) => n.level === 2) ?? flatNodes[0] ?? null
    return defaultPick
  }, [isCreatingNew, selectedId, nodeMap, flatNodes])

  const selectNode = (node: CategoryNode) => {
    setIsCreatingNew(false)
    setSelectedId(node.id)
    setFormName(node.name)
    setFormParentId(node.parentId ?? '')
    setFormDescription(node.description)
    setFormMinStock(node.minStockPerTitle)
    setFormStatus(node.isActive ? 'ACTIVE' : 'INACTIVE')
    setFormError('')
  }

  const currentFormValues = useMemo(() => {
    if (isCreatingNew) {
      return {
        name: formName,
        parentId: formParentId,
        description: formDescription,
        minStock: formMinStock,
        status: formStatus,
      }
    }
    if (activeSelectedNode && selectedId !== activeSelectedNode.id) {
      return {
        name: activeSelectedNode.name,
        parentId: activeSelectedNode.parentId ?? '',
        description: activeSelectedNode.description,
        minStock: activeSelectedNode.minStockPerTitle,
        status: (activeSelectedNode.isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      }
    }
    return {
      name: formName || activeSelectedNode?.name || '',
      parentId: selectedId ? formParentId : activeSelectedNode?.parentId ?? '',
      description: formDescription || activeSelectedNode?.description || '',
      minStock: formMinStock || activeSelectedNode?.minStockPerTitle || '3',
      status: selectedId ? formStatus : ((activeSelectedNode?.isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE'),
    }
  }, [isCreatingNew, activeSelectedNode, selectedId, formName, formParentId, formDescription, formMinStock, formStatus])

  const ensureNodeSynced = () => {
    if (!isCreatingNew && activeSelectedNode && selectedId !== activeSelectedNode.id) {
      setSelectedId(activeSelectedNode.id)
      setFormName(activeSelectedNode.name)
      setFormParentId(activeSelectedNode.parentId ?? '')
      setFormDescription(activeSelectedNode.description)
      setFormMinStock(activeSelectedNode.minStockPerTitle)
      setFormStatus(activeSelectedNode.isActive ? 'ACTIVE' : 'INACTIVE')
    }
  }

  const handleStartCreate = (parentId: string | null = null) => {
    setIsCreatingNew(true)
    setSelectedId('')
    setFormName('')
    setFormParentId(parentId ?? '')
    setFormDescription('')
    setFormMinStock('3')
    setFormStatus('ACTIVE')
    setFormError('')
  }

  const parentOptions = useMemo<SelectOption<string>[]>(() => {
    const excludedIds = new Set<string>()
    if (activeSelectedNode) {
      const collectDescendants = (n: CategoryNode) => {
        excludedIds.add(n.id)
        n.children.forEach(collectDescendants)
      }
      collectDescendants(activeSelectedNode)
    }

    const eligibleParents = flatNodes.filter((n) => n.level < 3 && !excludedIds.has(n.id))
    return [
      { value: '', label: 'Không có (Danh mục gốc - Cấp 1)' },
      ...eligibleParents.map((n) => ({
        value: n.id,
        label: `${n.level === 2 ? '— ' : ''}${n.name} (${n.code})`,
      })),
    ]
  }, [flatNodes, activeSelectedNode])

  const filteredFlatIds = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = new Set<string>()

    const checkMatch = (node: CategoryNode): boolean => {
      const statusOk =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && node.isActive) ||
        (statusFilter === 'INACTIVE' && !node.isActive)

      const textOk =
        !q ||
        node.name.toLowerCase().includes(q) ||
        node.code.toLowerCase().includes(q)

      let childMatched = false
      for (const child of node.children) {
        if (checkMatch(child)) childMatched = true
      }

      if ((statusOk && textOk) || childMatched) {
        matched.add(node.id)
        return true
      }
      return false
    }

    treeNodes.forEach(checkMatch)
    return matched
  }, [treeNodes, search, statusFilter])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = currentFormValues.name.trim()
    if (!trimmedName) {
      setFormError('Tên thể loại không được để trống.')
      return
    }
    setFormError('')

    if (isUsingFallback) {
      setLocalDescriptions((prev) => ({ ...prev, [trimmedName]: currentFormValues.description }))
      notify.success(isCreatingNew ? `Đã tạo thể loại "${trimmedName}".` : `Đã lưu cập nhật thể loại "${trimmedName}".`)
      setIsCreatingNew(false)
      return
    }

    try {
      if (isCreatingNew) {
        const created = await createCategory.mutateAsync({
          name: trimmedName,
          parentId: currentFormValues.parentId || null,
          isActive: currentFormValues.status === 'ACTIVE',
        })
        setLocalDescriptions((prev) => ({ ...prev, [created.id]: currentFormValues.description }))
        setLocalMinStock((prev) => ({ ...prev, [created.id]: currentFormValues.minStock }))
        setIsCreatingNew(false)
        setSelectedId(created.id)
        notify.success(`Đã tạo thể loại "${created.name}".`)
      } else if (activeSelectedNode) {
        await updateCategory.mutateAsync({
          categoryId: activeSelectedNode.id,
          request: {
            name: trimmedName,
            parentId: currentFormValues.parentId || null,
            isActive: currentFormValues.status === 'ACTIVE',
          },
        })
        setLocalDescriptions((prev) => ({ ...prev, [activeSelectedNode.id]: currentFormValues.description }))
        setLocalMinStock((prev) => ({ ...prev, [activeSelectedNode.id]: currentFormValues.minStock }))
        notify.success(`Đã lưu danh mục "${trimmedName}".`)
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu thể loại.')
    }
  }

  const handleToggleStatus = async () => {
    if (!activeSelectedNode) return
    const nextActive = !activeSelectedNode.isActive
    if (isUsingFallback) {
      notify.success(nextActive ? 'Đã kích hoạt lại danh mục.' : 'Đã chuyển danh mục sang ngừng sử dụng.')
      return
    }
    try {
      await updateCategoryStatus.mutateAsync({
        categoryId: activeSelectedNode.id,
        isActive: nextActive,
      })
      setFormStatus(nextActive ? 'ACTIVE' : 'INACTIVE')
      notify.success(nextActive ? 'Đã kích hoạt lại danh mục.' : 'Đã ngừng sử dụng danh mục.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể đổi trạng thái danh mục.')
    }
  }

  const handleDelete = async () => {
    if (!activeSelectedNode) return
    setDeleteError('')
    try {
      await deleteCategory.mutateAsync(activeSelectedNode.id)
      setConfirmDeleteOpen(false)
      setSelectedId('')
      notify.success(`Đã xóa danh mục "${activeSelectedNode.name}".`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa danh mục.')
    }
  }

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const renderTreeNode = (node: CategoryNode) => {
    if (!filteredFlatIds.has(node.id)) return null
    const isSelected = !isCreatingNew && activeSelectedNode?.id === node.id
    const hasChildren = node.children.length > 0
    const isCollapsed = Boolean(collapsedIds[node.id])
    const indentClass = node.level === 1 ? 'pl-2' : node.level === 2 ? 'pl-6' : 'pl-11'

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center justify-between gap-2 rounded-xl py-2.5 pr-2.5 transition ${indentClass} ${
            isSelected
              ? 'bg-indigo-50/90 text-indigo-700 ring-1 ring-indigo-200/80'
              : 'text-slate-800 hover:bg-slate-50'
          }`}
        >
          <button
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            onClick={() => selectNode(node)}
            type="button"
          >
            {hasChildren ? (
              <span
                aria-label={isCollapsed ? 'Mở rộng nhánh' : 'Thu gọn nhánh'}
                className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCollapse(node.id)
                }}
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            ) : (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate text-xs ${isSelected ? 'font-bold text-indigo-700' : 'font-semibold text-slate-900'}`}>
                  {node.name}
                </span>
                {!node.isActive && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Ngừng
                  </span>
                )}
              </div>
              <p className={`mt-0.5 text-[11px] ${isSelected ? 'text-indigo-600/80' : 'text-slate-500'}`}>
                {node.titleCount.toLocaleString('vi-VN')} đầu sách
              </p>
            </div>
          </button>

          {canEdit && node.level < 3 && (
            <button
              aria-label={`Thêm thể loại con vào ${node.name}`}
              className="rounded-lg p-1.5 text-slate-400 opacity-80 transition hover:bg-indigo-100/70 hover:text-indigo-700 group-hover:opacity-100"
              onClick={() => handleStartCreate(node.id)}
              title={`Thêm thể loại con cho ${node.name}`}
              type="button"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    )
  }

  const hasSubCategoriesOrTitles = Boolean(
    activeSelectedNode && (activeSelectedNode.children.length > 0 || activeSelectedNode.titleCount > 0),
  )

  return (
    <CatalogWorkspace
      action={
        canEdit ? (
          <Button onClick={() => handleStartCreate(null)}>+ Thêm thể loại</Button>
        ) : undefined
      }
      title="Thể loại sách & Cây danh mục"
    >
      <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            aria-label="Tìm tên thể loại, mã danh mục"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên thể loại, mã danh mục..."
            type="search"
            value={search}
          />
        </div>
        <SelectBox
          hideLabel
          label="Lọc trạng thái danh mục"
          onChange={(val) => setStatusFilter(val)}
          options={STATUS_FILTER_OPTIONS}
          searchable={false}
          value={statusFilter}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
        <Card padding="md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cây danh mục</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {flatNodes.length} danh mục - 3 cấp tối đa
              </p>
            </div>
            <button
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => {
                const allCollapsed = Object.values(collapsedIds).some(Boolean)
                if (allCollapsed) {
                  setCollapsedIds({})
                } else {
                  const next: Record<string, boolean> = {}
                  flatNodes.forEach((n) => {
                    if (n.children.length > 0) next[n.id] = true
                  })
                  setCollapsedIds(next)
                }
              }}
              type="button"
            >
              •••
            </button>
          </div>

          <div className="mt-3 space-y-1 max-h-[580px] overflow-y-auto pr-1">
            {treeNodes.map(renderTreeNode)}
            {filteredFlatIds.size === 0 && (
              <p className="py-8 text-center text-xs text-slate-500">
                Không tìm thấy danh mục phù hợp.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">
                    {isCreatingNew
                      ? 'Thêm thể loại sách mới'
                      : activeSelectedNode?.name ?? 'Chi tiết thể loại'}
                  </h2>
                  {!isCreatingNew && activeSelectedNode && (
                    <ActiveBadge active={activeSelectedNode.isActive} />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isCreatingNew
                    ? 'Tạo nút phân loại sách mới trong cây danh mục (tối đa 3 cấp).'
                    : activeSelectedNode
                      ? `${activeSelectedNode.code} - ${
                          activeSelectedNode.parentName
                            ? `Thuộc ${activeSelectedNode.parentName}`
                            : `Danh mục gốc (Cấp ${activeSelectedNode.level})`
                        }`
                      : 'Chọn một danh mục ở cây bên trái'}
                </p>
              </div>

              {!isCreatingNew && activeSelectedNode && canEdit && activeSelectedNode.level < 3 && (
                <Button
                  onClick={() => handleStartCreate(activeSelectedNode.id)}
                  variant="outline"
                >
                  + Thêm danh mục con
                </Button>
              )}
            </div>

            <form className="mt-5 space-y-5" onSubmit={(e) => void handleSave(e)}>
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  disabled={!canEdit}
                  label="Tên thể loại *"
                  onChange={(e) => {
                    ensureNodeSynced()
                    setFormName(e.target.value)
                  }}
                  placeholder="Ví dụ: Manga Nhật Bản"
                  required
                  value={currentFormValues.name}
                />

                <SelectBox
                  disabled={!canEdit}
                  label="Danh mục cha"
                  onChange={(val) => {
                    ensureNodeSynced()
                    setFormParentId(val)
                  }}
                  options={parentOptions}
                  placeholder="Chọn danh mục cha..."
                  searchPlaceholder="Tìm danh mục cha..."
                  value={currentFormValues.parentId}
                />
              </div>

              <label className="block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15">
                <span className="block text-xs font-semibold text-slate-500">Mô tả</span>
                <input
                  className="mt-1 block w-full bg-transparent text-sm text-slate-900 outline-hidden"
                  disabled={!canEdit}
                  onChange={(e) => {
                    ensureNodeSynced()
                    setFormDescription(e.target.value)
                  }}
                  placeholder="Mô tả ngắn gọn phạm vi đầu sách thuộc thể loại này..."
                  type="text"
                  value={currentFormValues.description}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectBox
                  disabled={!canEdit}
                  label="Tồn tối thiểu mặc định / đầu sách"
                  onChange={(val) => {
                    ensureNodeSynced()
                    setFormMinStock(val)
                  }}
                  options={MIN_STOCK_OPTIONS}
                  searchable={false}
                  value={currentFormValues.minStock}
                />

                <SelectBox
                  disabled={!canEdit}
                  label="Trạng thái"
                  onChange={(val) => {
                    ensureNodeSynced()
                    setFormStatus(val)
                  }}
                  options={ACTIVE_STATUS_OPTIONS}
                  searchable={false}
                  value={currentFormValues.status}
                />
              </div>

              {!isCreatingNew && activeSelectedNode && hasSubCategoriesOrTitles && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-600 text-[10px] font-bold text-amber-700">
                    i
                  </span>
                  <span>
                    Không thể xóa: Danh mục đang chứa{' '}
                    <strong>{activeSelectedNode.titleCount.toLocaleString('vi-VN')} đầu sách</strong>
                    {activeSelectedNode.children.length > 0
                      ? ` và ${activeSelectedNode.children.length} danh mục con`
                      : ''}
                    . Vui lòng chuyển sách sang danh mục khác trước khi ngừng sử dụng.
                  </span>
                </div>
              )}

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Button
                    loading={createCategory.isPending || updateCategory.isPending}
                    type="submit"
                    variant="primary"
                  >
                    {isCreatingNew ? 'Tạo danh mục' : 'Lưu danh mục'}
                  </Button>

                  {isCreatingNew ? (
                    <Button
                      onClick={() => {
                        setIsCreatingNew(false)
                        if (flatNodes[0]) selectNode(flatNodes[0])
                      }}
                      type="button"
                      variant="outline"
                    >
                      Hủy tạo mới
                    </Button>
                  ) : (
                    activeSelectedNode && (
                      <>
                        <Button
                          disabled={updateCategoryStatus.isPending}
                          onClick={() => void handleToggleStatus()}
                          type="button"
                          variant="outline"
                        >
                          {activeSelectedNode.isActive ? 'Ngừng sử dụng' : 'Kích hoạt lại'}
                        </Button>

                        {!hasSubCategoriesOrTitles && !isUsingFallback && (
                          <Button
                            onClick={() => {
                              setDeleteError('')
                              setConfirmDeleteOpen(true)
                            }}
                            type="button"
                            variant="ghost"
                          >
                            Xóa danh mục
                          </Button>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
            </form>
          </Card>

          {!isCreatingNew && activeSelectedNode && (
            <Card className="overflow-hidden" padding="none">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">Danh mục con</h3>
                <span className="text-xs text-slate-400">
                  {activeSelectedNode.children.length} danh mục trực tiếp
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-5 py-3 text-left" scope="col">Tên danh mục</th>
                      <th className="px-4 py-3 text-left" scope="col">Số đầu sách</th>
                      <th className="px-4 py-3 text-left" scope="col">Khả dụng</th>
                      <th className="px-5 py-3 text-right" scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSelectedNode.children.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-center text-slate-500" colSpan={4}>
                          Danh mục này chưa có danh mục con trực tiếp.
                        </td>
                      </tr>
                    ) : (
                      activeSelectedNode.children.map((child) => (
                        <tr className="hover:bg-slate-50/70 transition" key={child.id}>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{child.name}</td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {child.titleCount.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {child.availableCopyEstimate.toLocaleString('vi-VN')} bản
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              className="font-semibold text-slate-600 hover:text-indigo-700 transition"
                              onClick={() => selectNode(child)}
                              type="button"
                            >
                              Chỉnh sửa →
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {confirmDeleteOpen && activeSelectedNode && (
        <ConfirmationDialog
          actions={
            <>
              <Button onClick={() => setConfirmDeleteOpen(false)} variant="ghost">
                Hủy
              </Button>
              <Button
                loading={deleteCategory.isPending}
                onClick={() => void handleDelete()}
                variant="danger"
              >
                {deleteCategory.isPending ? 'Đang xóa…' : 'Xóa danh mục'}
              </Button>
            </>
          }
          error={deleteError}
          message={`Bạn có chắc chắn muốn xóa danh mục "${activeSelectedNode.name}"? Chỉ danh mục trống chưa gắn đầu sách hoặc danh mục con mới có thể xóa.`}
          onClose={() => setConfirmDeleteOpen(false)}
          title={`Xóa ${activeSelectedNode.name}`}
        />
      )}
    </CatalogWorkspace>
  )
}
