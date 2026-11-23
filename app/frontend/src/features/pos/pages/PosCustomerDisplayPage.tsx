import { useCallback, useState } from 'react'
import { customerDisplayFixture } from '../pos-transaction.fixture'
import type { CustomerDisplayFixture } from '../pos-transaction.type'
import { PosCustomerDisplay } from '../components/PosCustomerDisplay'

export default function PosCustomerDisplayPage() {
  const [fixture, setFixture] = useState<CustomerDisplayFixture>(customerDisplayFixture)
  const onPaymentSuccess = useCallback(() => setFixture((current) => ({ ...current, paymentStatus: 'success' })), [])

  return <PosCustomerDisplay fixture={fixture} onPaymentSuccess={onPaymentSuccess} />
}
