import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'ILS', label: 'ILS (₪)' },
]

export default function OwnerSignupPage() {
  const { register, token, loading } = useAuth()
  const navigate = useNavigate()
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
    const restaurantName = (formData.get('restaurantName') as string) ?? ''
    const restaurantSlug = ((formData.get('restaurantSlug') as string) ?? '').trim() || undefined
    const currency = (formData.get('currency') as string) || undefined

    setSubmitting(true)
    setError(null)
    try {
      await register({ email, password, restaurantName, restaurantSlug, currency })
      navigate('/owner', { replace: true })
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
            Register Your Establishment
          </h1>
          <p className="mt-2 text-sm" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            Create your restaurant and begin building your menu
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
              <label htmlFor="restaurantName" className="label-academia">
                Establishment Name
              </label>
              <input
                id="restaurantName"
                name="restaurantName"
                required
                className="input-academia"
                placeholder="The Grand Bistro"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="restaurantSlug" className="label-academia">
                Public URL Slug
                <span className="ml-1 normal-case tracking-normal" style={{ color: '#4A3F35' }}>(optional)</span>
              </label>
              <input
                id="restaurantSlug"
                name="restaurantSlug"
                className="input-academia"
                placeholder="the-grand-bistro"
              />
              <p className="text-xs mt-1.5" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                Used in guest links: <em>/restaurant/your-slug/menu</em>
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="currency" className="label-academia">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue="USD"
                className="input-academia"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value} style={{ backgroundColor: '#251E19' }}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="divider-ornate divider-ornate-alt" aria-hidden="true" />

            <div className="space-y-1.5">
              <label htmlFor="email" className="label-academia">
                Owner Email
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
                autoComplete="new-password"
                required
                minLength={8}
                className="input-academia"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-brass w-full"
                disabled={submitting}
              >
                {submitting ? 'Registering…' : 'Create Establishment'}
              </button>
            </div>
          </form>

          <div className="divider-ornate divider-ornate-alt mt-6" aria-hidden="true" />

          <p className="text-center text-sm mt-5" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            Already registered?{' '}
            <Link
              to="/owner/login"
              className="transition-colors duration-200"
              style={{ color: '#C9A962' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#D4B872' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#C9A962' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
