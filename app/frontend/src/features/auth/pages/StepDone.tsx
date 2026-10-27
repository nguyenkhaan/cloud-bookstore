import { Banner } from '@/features/auth/components/Banner'
import { useNavigate } from 'react-router-dom'

export function StepDone() {
  const navigate = useNavigate()
  return (
    <div className="cb-form">
      <Banner tone="success">Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.</Banner>
      <button className="cb-btn cb-btn--primary cb-btn--block" onClick={() => navigate('/login?activated=1', { replace: true })} type="button">
        Đến trang đăng nhập
      </button>
    </div>
  )
}
