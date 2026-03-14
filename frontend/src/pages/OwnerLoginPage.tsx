import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function OwnerLoginPage() {
  const { login, token, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: Location } }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && token) {
    return <Navigate to="/owner" replace />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string) ?? ''
    const password = (formData.get('password') as string) ?? ''

    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      const from = (location.state as any)?.from?.pathname ?? '/owner'
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
          <h1
            className="mt-6 text-3xl"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
          >
            Welcome Back
          </h1>
          <p className="mt-2 text-sm" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            Sign in to manage your establishment
          </p>
        </div>

        {/* Form card */}
        <div
          className="relative rounded-[4px] p-8 flourish-sm"
          style={{
            backgroundColor: '#251E19',
            border: '1px solid #4A3F35',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
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
              <label htmlFor="email" className="label-academia">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-academia"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="label-academia">
                Password
              </label>
              <input
                id="password"
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
                {submitting ? 'Signing In…' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="divider-ornate divider-ornate-alt mt-6" aria-hidden="true" />

          <p className="text-center text-sm mt-5" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            No establishment yet?{' '}
            <Link
              to="/owner/signup"
              className="transition-colors duration-200"
              style={{ color: '#C9A962' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#D4B872' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#C9A962' }}
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
