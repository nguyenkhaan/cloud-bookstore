import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { formatVnd } from '../hr-payroll.utils'
import type {
  PayslipAdvanceVoucher,
  PayslipAttendanceDay,
  PayslipOvertimeEntry,
} from '../hr-payroll.type'

export type PayslipSourceDrawerType = 'attendance' | 'overtime' | 'advance'

export interface PayslipSourceDrawerProps {
  drawerType: PayslipSourceDrawerType | null
  employeeName?: string
  employeeCode?: string
  attendanceSourceCode?: string
  periodRange?: string
  periodKey?: string
  payslipCode?: string
  standardHours?: number
  overtimeHours?: number
  hourlyRate?: number
  overtimeAmount?: number
  approvedBy?: string
  attendanceDays?: PayslipAttendanceDay[]
  overtimeEntries?: PayslipOvertimeEntry[]
  advanceVoucher?: PayslipAdvanceVoucher
  onClose: () => void
}

export function PayslipSourceDrawer({
  drawerType,
  employeeName = 'Trần Hoàng Phong',
  employeeCode = 'NV-0002',
  attendanceSourceCode = 'ATT-202609',
  periodRange = '01-30/09/2026',
  periodKey = '09/2026',
  payslipCode = 'PAY-202609-NV0002',
  standardHours = 160,
  overtimeHours = 4,
  hourlyRate = 30000,
  overtimeAmount = 180000,
  approvedBy = 'Nguyễn Minh Anh',
  attendanceDays = [],
  overtimeEntries = [],
  advanceVoucher,
  onClose,
}: PayslipSourceDrawerProps) {
  const titleId = useId()

  useEffect(() => {
    if (!drawerType) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerType, onClose])

  if (!drawerType) return null

  const titleMap: Record<PayslipSourceDrawerType, string> = {
    attendance: 'Bảng kê giờ công từng ngày',
    overtime: 'Chi tiết giờ làm thêm',
    advance: `Chứng từ tạm ứng ${advanceVoucher?.voucherCode ?? 'ADV-0921'}`,
  }

  const closeLabelMap: Record<PayslipSourceDrawerType, string> = {
    attendance: 'Đóng bảng công',
    overtime: 'Đóng chi tiết OT',
    advance: 'Đóng chứng từ',
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {titleMap[drawerType]}
            </h2>
            {drawerType === 'attendance' && (
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                <p>
                  {employeeName} · {employeeCode}
                </p>
                <p>
                  {attendanceSourceCode} · Kỳ {periodRange} · Đã khóa
                </p>
              </div>
            )}
            {drawerType === 'overtime' && (
              <p className="mt-1 text-xs text-slate-500">
                {attendanceSourceCode} · {employeeName} · {overtimeHours} giờ
                được duyệt
              </p>
            )}
            {drawerType === 'advance' && (
              <p className="mt-1 text-xs text-slate-500">
                Liên kết khoản khấu trừ nội bộ của kỳ {periodKey}
              </p>
            )}
          </div>
          <button
            aria-label="Đóng ngăn chi tiết"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs">
          {drawerType === 'attendance' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                      <th className="rounded-l-lg px-3 py-2.5">Ngày</th>
                      <th className="px-3 py-2.5">Check-in / Check-out</th>
                      <th className="px-3 py-2.5">Giờ chuẩn</th>
                      <th className="rounded-r-lg px-3 py-2.5">OT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceDays.map((day) => (
                      <tr key={day.date}>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {day.date}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {day.checkInOut}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {day.standardHours} giờ
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {day.otHours} giờ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm font-bold text-indigo-600">
                Tổng: {standardHours} giờ tiêu chuẩn · {overtimeHours} giờ OT
                được duyệt
              </p>
              <p className="text-xs text-slate-500">
                Bảng minh họa có nghỉ giữa ca 1 giờ/ngày. Phiếu lương sử dụng số
                giờ đã được Admin duyệt.
              </p>
            </>
          )}

          {drawerType === 'overtime' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                      <th className="rounded-l-lg px-3 py-2.5">Ngày</th>
                      <th className="px-3 py-2.5">Khoảng OT</th>
                      <th className="px-3 py-2.5">Giờ</th>
                      <th className="rounded-r-lg px-3 py-2.5">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overtimeEntries.map((entry) => (
                      <tr key={entry.date}>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          {entry.date}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {entry.timeRange}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {entry.hours} giờ
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {formatVnd(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm font-bold text-indigo-600">
                {overtimeHours} giờ × {formatVnd(hourlyRate)} × 1,5 ={' '}
                {formatVnd(overtimeAmount)}
              </p>
              <div className="space-y-0.5 text-xs text-slate-600">
                <p>{approvedBy} · Quản trị viên</p>
                <p>Đã đối chiếu và duyệt cùng bảng công {attendanceSourceCode}.</p>
              </div>
            </>
          )}

          {drawerType === 'advance' && advanceVoucher && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-slate-500">Nhân viên</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {advanceVoucher.employeeLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Số tiền tạm ứng</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatVnd(advanceVoucher.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Ngày nhận</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {advanceVoucher.receivedDate}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Hình thức chi</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {advanceVoucher.payoutMethod}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Người duyệt</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {advanceVoucher.approverLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Nội dung</p>
                <p className="mt-1 text-sm text-slate-800">
                  {advanceVoucher.content}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Chứng từ đính kèm</p>
                <p className="mt-1 text-sm font-medium text-indigo-600">
                  {advanceVoucher.attachmentName}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Khấu trừ trên phiếu {payslipCode}: -
                {formatVnd(advanceVoucher.amount)}. Chứng từ này không tạo khoản
                chi lần hai.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <Button
            className="min-h-[44px] w-full"
            onClick={onClose}
            type="button"
            variant="primary"
          >
            {closeLabelMap[drawerType]}
          </Button>
        </div>
      </div>
    </div>
  )
}
