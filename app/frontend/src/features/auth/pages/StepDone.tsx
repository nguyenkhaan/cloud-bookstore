import { Banner } from '@/features/auth/components/Banner'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common'

export function StepDone() {
  const navigate = useNavigate()
  return (
    <div className="mt-5 flex flex-col gap-4">
      <Banner tone="success">Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.</Banner>
      <Button className="min-h-11" fullWidth onClick={() => navigate('/login?activated=1', { replace: true })} size="lg" type="button" variant="primary">
        Đến trang đăng nhập
      </Button>
    </div>
  )
}
