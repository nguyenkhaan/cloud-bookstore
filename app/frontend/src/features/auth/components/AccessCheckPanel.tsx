import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Button } from '../../../components/common/Button/Button'
import { http } from '../../../services/http'

// Công cụ tạm để kiểm tra phân quyền bằng UI. Xóa cùng AccessCheckController ở P02-S04.
const CHECKS = [
    { label: 'Chỉ Admin', path: '/access-check/admin' },
    { label: 'Quầy (Admin, Nhân viên)', path: '/access-check/counter' },
    { label: 'Kho (Admin, Quản lý kho)', path: '/access-check/inventory' },
]

export function AccessCheckPanel() {
    const [results, setResults] = useState<Record<string, string>>({})

    async function run(path: string) {
        try {
            await http.get(path)
            setResults((current) => ({ ...current, [path]: '200: được phép' }))
        } catch (error) {
            const status = isAxiosError(error) ? error.response?.status : undefined
            const text = status === 403 ? '403: không đủ quyền' : status === 401 ? '401: phiên không hợp lệ' : `Lỗi ${status ?? 'mạng'}`
            setResults((current) => ({ ...current, [path]: text }))
        }
    }

    return (
        <section className="mt-10 rounded-md border border-slate-300 bg-white p-5">
            <h2 className="font-serif text-xl text-slate-900">Kiểm tra phân quyền (tạm thời)</h2>
            <p className="mt-1 text-sm text-slate-600">Gọi thử từng API để xem vai trò hiện tại được phép hay bị chặn.</p>
            <ul className="mt-4 space-y-3">
                {CHECKS.map((check) => (
                    <li key={check.path} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-800">{check.label}</span>
                        <span className="flex items-center gap-3">
              <span className="min-w-40 text-right text-sm text-slate-700">{results[check.path] ?? ''}</span>
              <Button variant="ghost" onClick={() => run(check.path)}>
                Thử
              </Button>
            </span>
                    </li>
                ))}
            </ul>
        </section>
    )
}