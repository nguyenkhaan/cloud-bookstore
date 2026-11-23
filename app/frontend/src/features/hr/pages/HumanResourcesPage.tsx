import { Navigate } from 'react-router-dom'
import { hrPaths } from '../hr.route'

export default function HumanResourcesPage() {
  return <Navigate replace to={hrPaths.attendance} />
}
