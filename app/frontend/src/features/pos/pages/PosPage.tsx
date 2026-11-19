import { Navigate } from 'react-router-dom'
import { posPaths } from '../pos.route'

export default function PosPage() {
  return <Navigate replace to={posPaths.shift} />
}
