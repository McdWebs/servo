import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSuperAdminAuth } from './SuperAdminAuthContext'

export default function SuperAdminRoute() {
  const { token, loading } = useSuperAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1714' }}>
        <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>Loading…</p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
