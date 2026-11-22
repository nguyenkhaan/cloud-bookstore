import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Info, Printer, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, SelectBox, StatCard } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { ReportsSubNav } from '../components/ReportsSubNav'
import { exportTaxDeclarationExcel } from '../reports.export'
import { useTaxDeclarationQuery } from '../reports.hook'
import {
  formatVnDateTimeShort,
  formatVnd,
  getCurrentVnMonthRange,
} from '../reports.presentation'
import type { TaxPeriodType } from '../reports.type'

export default function TaxDeclarationReportPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const currentVn = useMemo(() => getCurrentVnMonthRange(), [])

  const [periodType, setPeriodType] = useState<TaxPeriodType>('MONTH')
  const [year, setYear] = useState<number>(currentVn.year)
  const [periodValue, setPeriodValue] = useState<number>(currentVn.month)

  const taxQuery = useTaxDeclarationQuery({ periodType, year, periodValue })
  const data = taxQuery.data

  const yearOptions = useMemo(() => {
    const base = currentVn.year
    return [base - 2, base - 1, base, base + 1]
  }, [currentVn.year])

  const handlePeriodTypeChange = (nextType: TaxPeriodType) => {
    setPeriodType(nextType)
    if (nextType === 'QUARTER') {
      setPeriodValue(Math.min(4, Math.max(1, Math.ceil(periodValue / 3))))
    } else {
      setPeriodValue(Math.min(12, Math.max(1, (periodValue - 1) * 3 + 1)))
    }
  }

  return (
    <MainLayout
      currentPath="reports"
      onNavigate={(id) => {
        const target = workspacePathFor(id)
        if (target) navigate(target)
      }}
      onSignOut={signOut}
      breadcrumbs={[
        { label: 'Không gian làm việc', to: '/dashboard' },
        { label: 'Báo cáo & thuế' },
        { label: 'Báo cáo Kê khai Thuế tự động' },
      ]}
      pageTitle="Báo cáo Kê khai Thuế tự động"
      pageHeaderContent={<ReportsSubNav active="tax-declaration" />}
      actionButton={
        <div className="print:hidden flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => data && exportTaxDeclarationExcel(data)}
            disabled={!data}
            className="min-h-10"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Xuất Excel
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="min-h-10"
          >
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
            In bảng kê PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-xs text-slate-500">
          Bảng tổng hợp nguồn dữ liệu kê khai · Kỳ {data?.periodLabel || `Tháng ${String(periodValue).padStart(2, '0')}/${year}`}
          {data?.generatedAtUtc ? ` · Sinh ${formatVnDateTimeShort(data.generatedAtUtc)}` : ''}
        </p>

        {/* Print-only Header */}
        <div className="hidden border-b border-slate-300 pb-4 print:block">
          <div className="text-sm font-bold text-slate-900">
            {data?.storeScopeLabel || 'Nhà sách Mây - Cơ sở 01'}
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            BẢNG KÊ TỔNG HỢP DỮ LIỆU KÊ KHAI THUẾ ({data?.periodLabel})
          </h2>
          <p className="text-xs text-slate-600">
            Từ {data?.fromDate} đến {data?.toDate}
            {data?.generatedAtUtc ? ` · In lúc ${formatVnDateTimeShort(data.generatedAtUtc)}` : ''}
          </p>
        </div>

        {/* Kỳ kê khai Card */}
        <Card title="Kỳ kê khai" className="print:hidden">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3">
              <SelectBox
                label="Loại kỳ"
                searchable={false}
                value={periodType}
                onChange={(val) => handlePeriodTypeChange(val as TaxPeriodType)}
                options={[
                  { value: 'MONTH', label: 'Theo tháng' },
                  { value: 'QUARTER', label: 'Theo quý' },
                ]}
              />
            </div>

            <div className="md:col-span-3">
              <SelectBox
                label={periodType === 'MONTH' ? 'Tháng' : 'Quý'}
                searchable={false}
                value={String(periodValue)}
                onChange={(val) => setPeriodValue(Number(val))}
                options={
                  periodType === 'MONTH'
                    ? Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                        value: String(m),
                        label: `Tháng ${String(m).padStart(2, '0')}`,
                      }))
                    : [1, 2, 3, 4].map((q) => ({
                        value: String(q),
                        label: `Quý ${q}`,
                      }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <SelectBox
                label="Năm"
                searchable={false}
                value={String(year)}
                onChange={(val) => setYear(Number(val))}
                options={yearOptions.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-[11px] font-medium text-slate-500">Phạm vi</div>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 truncate">
                {data?.storeScopeLabel || 'Nhà sách Mây - Cơ sở 01'}
              </div>
            </div>

            <div className="md:col-span-2">
              <Button
                type="button"
                onClick={() => taxQuery.refetch()}
                disabled={taxQuery.isFetching}
                className="h-11 w-full"
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${taxQuery.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Tổng hợp số liệu kỳ này
              </Button>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Có thể đổi sang kỳ Quý. Nguồn truy nguyên theo chứng từ đã hoàn tất và quyết toán trong kỳ.
          </p>
        </Card>

        {taxQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {taxQuery.error instanceof Error
              ? taxQuery.error.message
              : 'Không thể tải báo cáo kê khai thuế.'}
          </div>
        )}

        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Doanh thu chịu thuế"
            value={formatVnd(data?.totalTaxableRevenue)}
            valueColor="emerald"
            description="Bán + mất sách + dịch vụ + phạt"
          />
          <StatCard
            label="Chi phí đầu vào hợp lệ"
            value={formatVnd(data?.totalEligibleExpense)}
            valueColor="amber"
            description="Đủ chứng từ và được duyệt"
          />
          <StatCard
            label="Chênh lệch thu − chi"
            value={formatVnd(data?.netDifference)}
            valueColor="default"
            description="Không phải số thuế phải nộp"
          />
        </div>

        {/* Section A: Doanh thu chịu thuế */}
        <Card
          title="A. Doanh thu chịu thuế"
          subtitle="Mỗi khoản được nhận diện một lần; không cộng trùng các khoản khấu trừ tiền cọc."
        >
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-xs">
              <thead>
                <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold first:rounded-l-xl">Khoản mục</th>
                  <th className="px-4 py-2.5 font-semibold">Điều kiện ghi nhận</th>
                  <th className="px-4 py-2.5 font-semibold">Nguồn truy nguyên</th>
                  <th className="px-4 py-2.5 font-semibold last:rounded-r-xl">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.revenueItems ?? []).map((item) => (
                  <tr key={item.itemKey} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{item.title}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.recognitionRule}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">{item.sourceTrace}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{formatVnd(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/70 font-bold">
                  <td colSpan={3} className="px-4 py-3.5 text-slate-900">
                    Tổng doanh thu chịu thuế
                  </td>
                  <td className="px-4 py-3.5 text-slate-900">{formatVnd(data?.totalTaxableRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Section B: Chi phí đầu vào hợp lệ */}
        <Card title="B. Chi phí đầu vào hợp lệ">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-xs">
              <thead>
                <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold first:rounded-l-xl">Khoản mục</th>
                  <th className="px-4 py-2.5 font-semibold">Chứng từ bắt buộc</th>
                  <th className="px-4 py-2.5 font-semibold">Nguồn truy nguyên</th>
                  <th className="px-4 py-2.5 font-semibold last:rounded-r-xl">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.expenseItems ?? []).map((item) => (
                  <tr key={item.itemKey} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{item.title}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.requiredDocuments}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">{item.sourceTrace}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{formatVnd(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/70 font-bold">
                  <td colSpan={3} className="px-4 py-3.5 text-slate-900">
                    Tổng chi phí đầu vào hợp lệ
                  </td>
                  <td className="px-4 py-3.5 text-slate-900">{formatVnd(data?.totalEligibleExpense)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            {data?.hasFullSourceReconciliation ?? true ? (
              <Badge
                variant="success"
                size="md"
                icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Đã đối chiếu đủ nguồn chứng từ
              </Badge>
            ) : (
              <Badge
                variant="warning"
                size="md"
                icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Cần rà soát chứng từ đầu vào còn thiếu định danh / hóa đơn
              </Badge>
            )}
          </div>
        </Card>

        {/* Section C: Khoản loại trừ minh bạch */}
        <Card title="C. Khoản loại trừ minh bạch - KHÔNG đưa vào thuế">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-left text-xs">
              <thead>
                <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold first:rounded-l-xl">Luồng tiền giữ hộ</th>
                  <th className="px-4 py-2.5 font-semibold">Giá trị kỳ này</th>
                  <th className="px-4 py-2.5 font-semibold last:rounded-r-xl">Cách xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.excludedItems ?? []).map((item) => (
                  <tr key={item.itemKey} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{item.title}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{formatVnd(item.amount)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.treatmentNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs text-indigo-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
            <span>
              Tiền cọc là khoản bảo đảm hoàn lại, không phải phí dịch vụ. Chỉ phần đã quyết toán thành phí/phạt hoặc chuyển bán do mất sách được đưa vào mục A.
            </span>
          </div>
        </Card>

        {/* Disclaimer Yellow Banner */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            Báo cáo tổng hợp dữ liệu đầu vào kê khai, không tự áp dụng thuế suất hay suy diễn số thuế phải nộp. Người phụ trách đối chiếu chính sách thuế thực tế trước khi nộp.
          </span>
        </div>
      </div>
    </MainLayout>
  )
}
