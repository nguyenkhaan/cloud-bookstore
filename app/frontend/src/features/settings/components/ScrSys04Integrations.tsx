import React, { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { notify } from '@/components/common/Toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useIntegrations, useUpdateIntegrations } from '../settings.hook'
import type {
  BookMetadataIntegration,
  SmtpIntegration,
  VietQrIntegration,
  ZaloOaIntegration,
} from '../settings.type'

interface ScrSys04IntegrationsProps {
  isAdmin: boolean
}

export const ScrSys04Integrations: React.FC<ScrSys04IntegrationsProps> = ({ isAdmin: roleIsAdmin }) => {
  const { can } = usePermissions()
  const isAdmin = roleIsAdmin && can('Settings.UpdateIntegrations')
  const canEdit = isAdmin
  const { data: config, isLoading, isError, refetch } = useIntegrations()
  const [initialized, setInitialized] = useState(false)
  const updateMutation = useUpdateIntegrations()

  const [activeTab, setActiveTab] = useState<'all' | 'payment' | 'notification' | 'books' | 'email'>('all')

  // Form states
  const [vietQr, setVietQr] = useState<VietQrIntegration>({
    bankName: 'Vietcombank · DEMO',
    accountNo: '•••• •••• 0000 · Mẫu',
    accountHolder: 'NHA SACH MAY · DEMO',
    apiKey: '••••••••••••••••',
    checksumSecret: '••••••••••••••••',
    expireMinutes: 15,
    webhookUrl: 'https://demo.comicpos.example/webhooks/vietqr',
    status: 'DEMO · Cấu hình đủ',
  })

  const [zaloOa, setZaloOa] = useState<ZaloOaIntegration>({
    appId: 'DEMO-APP-ID',
    oaId: 'DEMO-OA-ID',
    secretKey: '••••••••••••••••',
    accessToken: '••••••••••••••••••••••••••••••••',
    templatePaymentSuccess: 'DEMO_PAYMENT_SUCCESS',
    templateDueReminder: 'DEMO_DUE_REMINDER',
    templateOverdue: 'DEMO_OVERDUE',
    templateDepositSettled: 'DEMO_DEPOSIT_SETTLED',
    reminderSchedule: 'Trước 2 ngày và 1 ngày',
    status: 'DEMO · Token cần làm mới',
  })

  const [bookMetadata, setBookMetadata] = useState<BookMetadataIntegration>({
    priorityService: 'Google Books → Open Library',
    googleBooksApiKey: '••••••••••••••••',
    openLibraryEndpoint: 'https://openlibrary.org/api/books',
    status: 'DEMO · Tra cứu mẫu sẵn sàng',
  })

  const [smtp, setSmtp] = useState<SmtpIntegration>({
    host: 'smtp.example.com',
    port: 587,
    security: 'STARTTLS',
    senderEmail: 'noreply@comicpos.example',
    password: '••••••••••••••••',
    status: 'DEMO · Chưa kiểm thử',
  })

  const [changeReason, setChangeReason] = useState('Thiết lập môi trường minh họa, không sử dụng khóa sản xuất.')

  // Visibility toggles for masked secrets
  const [showVietQrKey, setShowVietQrKey] = useState(false)
  const [showVietQrSecret, setShowVietQrSecret] = useState(false)
  const [showZaloSecret, setShowZaloSecret] = useState(false)
  const [showZaloToken, setShowZaloToken] = useState(false)
  const [showGoogleKey, setShowGoogleKey] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)

  useEffect(() => {
    if (config && !initialized) {
      setInitialized(true)
      if (config.vietQr) setVietQr(config.vietQr)
      if (config.zaloOa) setZaloOa(config.zaloOa)
      if (config.bookMetadata) setBookMetadata(config.bookMetadata)
      if (config.smtp) setSmtp(config.smtp)
      if (config.changeReason) setChangeReason(config.changeReason)
    }
  }, [config, initialized])

  const handleTestConnection = (serviceName: string) => {
    notify.success(`Kiểm tra kết nối ${serviceName}: Môi trường DEMO đáp ứng tiêu chuẩn kết nối.`)
  }

  const handleSave = async (section: 'vietQr' | 'zaloOa' | 'bookMetadata' | 'smtp' | 'all') => {
    if (!canEdit) {
      notify.error('Chỉ Admin mới có quyền lưu cấu hình tích hợp.')
      return
    }

    if (!changeReason.trim()) {
      notify.error('Vui lòng nhập lý do thay đổi cấu hình.')
      return
    }

    try {
      const saved = await updateMutation.mutateAsync({
        ...(section === 'all' ? { vietQr, zaloOa, bookMetadata, smtp } : { [section]: { vietQr, zaloOa, bookMetadata, smtp }[section] }),
        changeReason: changeReason.trim(),
      })
      if (section === 'all' || section === 'vietQr') setVietQr(saved.vietQr)
      if (section === 'all' || section === 'zaloOa') setZaloOa(saved.zaloOa)
      if (section === 'all' || section === 'bookMetadata') setBookMetadata(saved.bookMetadata)
      if (section === 'all' || section === 'smtp') setSmtp(saved.smtp)
      notify.success('Đã lưu cấu hình tích hợp được chọn.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu cấu hình.')
    }
  }

  if (!isLoading && (isError || !config)) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <p>Không thể tải cấu hình. Vui lòng thử lại trước khi chỉnh sửa.</p>
        <button type="button" onClick={() => void refetch()} className="mt-2 min-h-11 rounded-lg border px-4 font-semibold">
          Thử lại
        </button>
      </div>
    )
  }

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Demo Notice Banner */}
      <div className="bg-amber-50 text-amber-800 text-xs p-3.5 rounded-xl flex items-start gap-2 border border-amber-100">
        <span className="font-bold shrink-0">ⓘ</span>
        <span>
          Môi trường DEMO · Tất cả tài khoản, khóa và trạng thái kết nối dưới đây là minh họa. Không chứa thông tin xác thực thật, không gọi ngân hàng, Zalo hay dịch vụ email.
        </span>
      </div>

      {/* Sub-tab Filter */}
      <div className="flex items-center gap-3 bg-indigo-50/60 p-2 rounded-xl text-xs font-medium text-slate-600 border border-indigo-100/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          ▣ Tất cả tích hợp
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'payment' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Thanh toán (VietQR)
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveTab('notification')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'notification' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Thông báo (Zalo OA)
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveTab('books')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'books' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Dữ liệu sách (Google Books)
        </button>
        <span className="text-slate-300">│</span>
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'email' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Email (SMTP)
        </button>
      </div>

      {/* 1. VietQR Gateway */}
      {(activeTab === 'all' || activeTab === 'payment') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">VietQR Gateway</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                DEMO · Cấu hình đủ
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Chưa kết nối thật
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="vietqr-bank" className="text-[11px] font-semibold text-slate-500 block mb-1">Ngân hàng thụ hưởng *</label>
              <input
                id="vietqr-bank"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={vietQr.bankName}
                onChange={(e) => setVietQr({ ...vietQr, bankName: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="vietqr-accno" className="text-[11px] font-semibold text-slate-500 block mb-1">Số tài khoản *</label>
              <input
                id="vietqr-accno"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={vietQr.accountNo}
                onChange={(e) => setVietQr({ ...vietQr, accountNo: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="vietqr-holder" className="text-[11px] font-semibold text-slate-500 block mb-1">Tên chủ tài khoản *</label>
              <input
                id="vietqr-holder"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={vietQr.accountHolder}
                onChange={(e) => setVietQr({ ...vietQr, accountHolder: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <label htmlFor="vietqr-apikey" className="text-[11px] font-semibold text-slate-500 block mb-1">API Key *</label>
                <input
                  id="vietqr-apikey"
                  type={showVietQrKey ? 'text' : 'password'}
                  disabled={!isAdmin || updateMutation.isPending}
                  value={vietQr.apiKey}
                  onChange={(e) => setVietQr({ ...vietQr, apiKey: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowVietQrKey(!showVietQrKey)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showVietQrKey ? 'Ẩn API Key' : 'Hiện API Key'}
              >
                {showVietQrKey ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <label htmlFor="vietqr-secret" className="text-[11px] font-semibold text-slate-500 block mb-1">Checksum Secret *</label>
                <input
                  id="vietqr-secret"
                  type={showVietQrSecret ? 'text' : 'password'}
                  disabled={!isAdmin || updateMutation.isPending}
                  value={vietQr.checksumSecret}
                  onChange={(e) => setVietQr({ ...vietQr, checksumSecret: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowVietQrSecret(!showVietQrSecret)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showVietQrSecret ? 'Ẩn Checksum Secret' : 'Hiện Checksum Secret'}
              >
                {showVietQrSecret ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="vietqr-expire" className="text-[11px] font-semibold text-slate-500 block mb-1">Thời gian hết hạn QR</label>
              <div className="flex items-center gap-2">
                <input
                  id="vietqr-expire"
                  type="number"
                  min="5"
                  max="60"
                  disabled={!isAdmin || updateMutation.isPending}
                  value={vietQr.expireMinutes}
                  onChange={(e) => setVietQr({ ...vietQr, expireMinutes: Number(e.target.value) })}
                  className="w-16 text-xs font-semibold text-slate-900 border border-slate-200 rounded px-2 py-0.5"
                />
                <span className="text-xs text-slate-500">phút</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <label htmlFor="vietqr-webhook" className="text-[11px] font-semibold text-slate-500 block mb-1">Webhook URL</label>
            <input
              id="vietqr-webhook"
              type="text"
              disabled={!isAdmin || updateMutation.isPending}
              value={vietQr.webhookUrl}
              onChange={(e) => setVietQr({ ...vietQr, webhookUrl: e.target.value })}
              className="w-full text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTestConnection('VietQR Gateway')}
                className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Kiểm tra kết nối dịch vụ
              </button>
              <button
                type="button"
                disabled={!isAdmin || updateMutation.isPending}
                onClick={() => handleSave('vietQr')}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                Lưu VietQR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Zalo OA · ZNS */}
      {(activeTab === 'all' || activeTab === 'notification') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Zalo OA · ZNS</h2>
            </div>
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                {zaloOa.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-appid" className="text-[11px] font-semibold text-slate-500 block mb-1">App ID</label>
              <input
                id="zalo-appid"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.appId}
                onChange={(e) => setZaloOa({ ...zaloOa, appId: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-oaid" className="text-[11px] font-semibold text-slate-500 block mb-1">OA ID</label>
              <input
                id="zalo-oaid"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.oaId}
                onChange={(e) => setZaloOa({ ...zaloOa, oaId: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <label htmlFor="zalo-secret" className="text-[11px] font-semibold text-slate-500 block mb-1">Secret Key</label>
                <input
                  id="zalo-secret"
                  type={showZaloSecret ? 'text' : 'password'}
                  disabled={!isAdmin || updateMutation.isPending}
                  value={zaloOa.secretKey}
                  onChange={(e) => setZaloOa({ ...zaloOa, secretKey: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowZaloSecret(!showZaloSecret)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showZaloSecret ? 'Ẩn Secret Key' : 'Hiện Secret Key'}
              >
                {showZaloSecret ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-2">
              <label htmlFor="zalo-token" className="text-[11px] font-semibold text-slate-500 block mb-1">Access Token</label>
              <input
                id="zalo-token"
                type={showZaloToken ? 'text' : 'password'}
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.accessToken}
                onChange={(e) => setZaloOa({ ...zaloOa, accessToken: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowZaloToken(!showZaloToken)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label={showZaloToken ? 'Ẩn Access Token' : 'Hiện Access Token'}
            >
              {showZaloToken ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-tpl-payment" className="text-[11px] font-semibold text-slate-500 block mb-1">Template · Thanh toán thành công</label>
              <input
                id="zalo-tpl-payment"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.templatePaymentSuccess}
                onChange={(e) => setZaloOa({ ...zaloOa, templatePaymentSuccess: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-tpl-reminder" className="text-[11px] font-semibold text-slate-500 block mb-1">Template · Nhắc hạn trả trước 1–2 ngày</label>
              <input
                id="zalo-tpl-reminder"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.templateDueReminder}
                onChange={(e) => setZaloOa({ ...zaloOa, templateDueReminder: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-tpl-overdue" className="text-[11px] font-semibold text-slate-500 block mb-1">Template · Báo quá hạn</label>
              <input
                id="zalo-tpl-overdue"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.templateOverdue}
                onChange={(e) => setZaloOa({ ...zaloOa, templateOverdue: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="zalo-tpl-settled" className="text-[11px] font-semibold text-slate-500 block mb-1">Template · Xác nhận quyết toán cọc</label>
              <input
                id="zalo-tpl-settled"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={zaloOa.templateDepositSettled}
                onChange={(e) => setZaloOa({ ...zaloOa, templateDepositSettled: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-amber-50 text-amber-800 text-xs p-3.5 rounded-xl border border-amber-100 flex items-start gap-2">
            <span className="font-bold shrink-0">ⓘ</span>
            <span>
              Trạng thái lỗi mẫu: Token hết hạn. Cập nhật token trước khi dùng dịch vụ thật; không ghi token vào nhật ký hay hiển thị công khai.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleTestConnection('Zalo OA')}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Kiểm tra kết nối Zalo
            </button>
            <button
              type="button"
              disabled={!isAdmin || updateMutation.isPending}
              onClick={() => handleSave('zaloOa')}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              Lưu Zalo OA
            </button>
          </div>
        </div>
      )}

      {/* 3 & 4: Metadata and SMTP in 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Books / Open Library */}
        {(activeTab === 'all' || activeTab === 'books') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Google Books / Open Library</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {bookMetadata.status}
              </span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="meta-priority" className="text-[11px] font-semibold text-slate-500 block mb-1">Dịch vụ ưu tiên</label>
              <input
                id="meta-priority"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={bookMetadata.priorityService}
                onChange={(e) => setBookMetadata({ ...bookMetadata, priorityService: e.target.value })}
                className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <label htmlFor="meta-apikey" className="text-[11px] font-semibold text-slate-500 block mb-1">Google Books API Key</label>
                <input
                  id="meta-apikey"
                  type={showGoogleKey ? 'text' : 'password'}
                  disabled={!isAdmin || updateMutation.isPending}
                  value={bookMetadata.googleBooksApiKey}
                  onChange={(e) => setBookMetadata({ ...bookMetadata, googleBooksApiKey: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleKey(!showGoogleKey)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showGoogleKey ? 'Ẩn Google Books API Key' : 'Hiện Google Books API Key'}
              >
                {showGoogleKey ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="meta-endpoint" className="text-[11px] font-semibold text-slate-500 block mb-1">Open Library Endpoint</label>
              <input
                id="meta-endpoint"
                type="text"
                disabled={!isAdmin || updateMutation.isPending}
                value={bookMetadata.openLibraryEndpoint}
                onChange={(e) => setBookMetadata({ ...bookMetadata, openLibraryEndpoint: e.target.value })}
                className="w-full text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('Metadata ISBN')}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Kiểm tra ISBN mẫu
              </button>
              <button
                type="button"
                disabled={!isAdmin || updateMutation.isPending}
                onClick={() => handleSave('bookMetadata')}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                Lưu metadata
              </button>
            </div>
          </div>
        )}

        {/* SMTP Mail Server */}
        {(activeTab === 'all' || activeTab === 'email') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">SMTP Mail Server</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {smtp.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <label htmlFor="smtp-host" className="text-[11px] font-semibold text-slate-500 block mb-1">Host</label>
                <input
                  id="smtp-host"
                  type="text"
                  disabled={!isAdmin || updateMutation.isPending}
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <label htmlFor="smtp-port" className="text-[11px] font-semibold text-slate-500 block mb-1">Port / Bảo mật</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="smtp-port"
                    type="number"
                    disabled={!isAdmin || updateMutation.isPending}
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                    className="w-14 text-xs font-semibold text-slate-900 border border-slate-200 rounded px-1.5 py-0.5"
                  />
                  <span className="text-xs text-slate-600">/ {smtp.security}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <label htmlFor="smtp-sender" className="text-[11px] font-semibold text-slate-500 block mb-1">Email người gửi</label>
              <input
                id="smtp-sender"
                type="email"
                disabled={!isAdmin || updateMutation.isPending}
                value={smtp.senderEmail}
                onChange={(e) => setSmtp({ ...smtp, senderEmail: e.target.value })}
                className="w-full text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <label htmlFor="smtp-pass" className="text-[11px] font-semibold text-slate-500 block mb-1">Mật khẩu ứng dụng</label>
                <input
                  id="smtp-pass"
                  type={showSmtpPassword ? 'text' : 'password'}
                  disabled={!isAdmin || updateMutation.isPending}
                  value={smtp.password}
                  onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={showSmtpPassword ? 'Ẩn Mật khẩu ứng dụng' : 'Hiện Mật khẩu ứng dụng'}
              >
                {showSmtpPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('SMTP')}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Gửi email kiểm thử
              </button>
              <button
                type="button"
                disabled={!isAdmin || updateMutation.isPending}
                onClick={() => handleSave('smtp')}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                Lưu SMTP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card: Bảo mật & Lưu cấu hình */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900">Bảo mật & Lưu cấu hình</h2>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="integrations-reason" className="text-xs font-semibold text-slate-700 block mb-1">
              Lý do thay đổi cấu hình *
            </label>
            <input
              id="integrations-reason"
              disabled={!isAdmin || updateMutation.isPending}
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Thiết lập môi trường minh họa, không sử dụng khóa sản xuất..."
              className="w-full text-xs text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 bg-white"
            />
          </div>

          <button
            type="button"
            disabled={!isAdmin || updateMutation.isPending || !changeReason.trim()}
            onClick={() => handleSave('all')}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs shrink-0"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu toàn bộ cấu hình'}
          </button>
        </div>
      </div>
    </div>
  )
}
