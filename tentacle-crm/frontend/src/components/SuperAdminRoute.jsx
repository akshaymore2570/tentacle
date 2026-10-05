import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'

export default function SuperAdminRoute({ children }) {
  const user = useAuth((s) => s.user)

  const isSuperAdmin =
    user?.isSuperAdmin === true ||
    (user?.roleNames || []).some(r => String(r).toLowerCase() === 'superadmin')

  if (!isSuperAdmin) return <Navigate to="/campaign" replace />
  return children
}
