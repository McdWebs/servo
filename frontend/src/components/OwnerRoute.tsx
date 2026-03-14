import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function OwnerRoute() {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1714' }}>
        <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>Loading your restaurant…</p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/owner/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

