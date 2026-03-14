import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../components/SuperAdminAuthContext'

export default function SuperAdminLoginPage() {
  const { loginSuperAdmin, token, loading } = useSuperAdminAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && token) {
    return <Navigate to="/super-admin" replace />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string) ?? ''
    const password = (formData.get('password') as string) ?? ''

    setSubmitting(true)
    setError(null)
    try {
      await loginSuperAdmin(email, password)
      const from = location.state?.from?.pathname ?? '/super-admin'
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#1C1714' }}>
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <p
            className="text-2xl tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: 'var(--font-display)', color: '#C9A962' }}
          >
            Servo
          </p>
          <div className="divider-ornate mx-auto w-48" aria-hidden="true" />
          <span
            className="overline-volume mt-6 block"
            style={{ color: '#9C8B7A' }}
          >
            Restricted Access
          </span>
          <h1
            className="mt-2 text-3xl"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
          >
            Grand Chamberlain
          </h1>
          <p className="mt-2 text-sm" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            Platform administration portal
          </p>
        </div>

        {/* Form card */}
        <div
          className="relative rounded-[4px] p-8 flourish-lg"
          style={{
            backgroundColor: '#251E19',
            border: '1px solid #4A3F35',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="rounded-[4px] px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(139,38,53,0.12)',
                  border: '1px solid rgba(139,38,53,0.35)',
                  color: '#C96070',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="sa-email" className="label-academia">
                Admin Email
              </label>
              <input
                id="sa-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-academia"
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sa-password" className="label-academia">
                Passphrase
              </label>
              <input
                id="sa-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-academia"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-brass w-full"
                disabled={submitting}
              >
                {submitting ? 'Verifying…' : 'Enter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
