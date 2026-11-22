import { Navigate } from 'react-router-dom'
import { reportsPaths } from '../reports.route'

export default function ReportsPage() {
  return <Navigate replace to={reportsPaths.revenueExpense} />
}
