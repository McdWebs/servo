import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function OwnerDashboardLayout() {
  const { restaurant, logout } = useAuth()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setShowSignOutConfirm(false)
    logout()
    navigate('/owner/login', { replace: true })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors duration-200 rounded-[4px] ${
      isActive
        ? 'text-[#C9A962] bg-[#1C1714]'
        : 'text-[#9C8B7A] hover:text-[#C9A962]'
    }`

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2.5 text-xs tracking-[0.18em] uppercase transition-colors duration-200 rounded-[4px] ${
      isActive
        ? 'text-[#C9A962] bg-[#1C1714]'
        : 'text-[#9C8B7A] hover:text-[#C9A962]'
    }`

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1C1714', color: '#E8DFD4' }}>
      {/* Suspended banner */}
      {restaurant?.isSuspended && (
        <div
          role="alert"
          className="border-b px-3 py-2.5 text-center text-xs tracking-[0.15em] uppercase"
          style={{
            borderColor: 'rgba(139,38,53,0.4)',
            backgroundColor: 'rgba(139,38,53,0.12)',
            color: '#C96070',
            fontFamily: 'var(--font-display)',
          }}
        >
          Your establishment is currently suspended. The public menu and new orders are disabled.
          Contact the chamberlain if you believe this is in error.
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-20">
        <header
          className="border-b"
          style={{
            backgroundColor: '#251E19',
            borderColor: '#4A3F35',
            boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            {/* Wordmark */}
            <div className="min-w-0 flex-shrink">
              <h1
                className="truncate text-base tracking-[0.2em] uppercase"
                style={{ fontFamily: 'var(--font-display)', color: '#C9A962' }}
              >
                Servo
                <span
                  className="mx-2 text-[#4A3F35]"
                  style={{ fontFamily: 'var(--font-body)', letterSpacing: 0 }}
                >
                  ·
                </span>
                <span
                  className="text-[#E8DFD4] text-base normal-case tracking-[0.05em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {restaurant?.name ?? 'Your Restaurant'}
                </span>
              </h1>
            </div>

            {/* Desktop nav */}
            <div
              className="ml-auto hidden items-center gap-1 rounded-[4px] px-1.5 py-1 sm:flex"
              style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
            >
              <nav className="flex items-center" style={{ fontFamily: 'var(--font-display)' }}>
                <NavLink to="/owner/menu" className={navLinkClass}>
                  Menu
                </NavLink>
                <NavLink to="/owner/stats" className={navLinkClass}>
                  Stats
                </NavLink>
                <NavLink to="/owner/settings" className={navLinkClass}>
                  Settings
                </NavLink>
                <NavLink to="/owner/feedback" className={navLinkClass}>
                  Feedback
                </NavLink>
              </nav>

              {/* Divider */}
              <span className="mx-1 h-4 w-px" style={{ backgroundColor: '#4A3F35' }} aria-hidden="true" />

              {restaurant?.slug && (
                <a
                  href={`/restaurant/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase rounded-[4px] transition-colors duration-200 border"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#9C8B7A',
                    borderColor: '#4A3F35',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#C9A962'
                    e.currentTarget.style.borderColor = 'rgba(201,169,98,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9C8B7A'
                    e.currentTarget.style.borderColor = '#4A3F35'
                  }}
                >
                  Guest Menu
                </a>
              )}
              {restaurant?._id && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase rounded-[4px] transition-colors duration-200 border"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#9C8B7A',
                    borderColor: '#4A3F35',
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => navigate(`/kitchen/${restaurant._id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#C9A962'
                    e.currentTarget.style.borderColor = 'rgba(201,169,98,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9C8B7A'
                    e.currentTarget.style.borderColor = '#4A3F35'
                  }}
                >
                  Kitchen
                </button>
              )}

              {/* Divider */}
              <span className="mx-1 h-4 w-px" style={{ backgroundColor: '#4A3F35' }} aria-hidden="true" />

              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="px-3 py-1.5 text-[11px] tracking-[0.15em] uppercase rounded-[4px] transition-colors duration-200"
                style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A' }}
              >
                Sign Out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="ml-auto flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 transition-colors duration-200 sm:hidden"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#9C8B7A',
                borderColor: '#4A3F35',
                backgroundColor: 'transparent',
              }}
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              <span>Nav</span>
              <span className="flex flex-col gap-[3px]" aria-hidden="true">
                <span
                  className="block h-px w-3 transition-transform duration-200"
                  style={{
                    backgroundColor: '#9C8B7A',
                    transform: mobileMenuOpen ? 'rotate(45deg) translateY(4px)' : 'none',
                  }}
                />
                <span
                  className="block h-px w-3 transition-opacity duration-200"
                  style={{
                    backgroundColor: '#9C8B7A',
                    opacity: mobileMenuOpen ? 0 : 1,
                  }}
                />
                <span
                  className="block h-px w-3 transition-transform duration-200"
                  style={{
                    backgroundColor: '#9C8B7A',
                    transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-4px)' : 'none',
                  }}
                />
              </span>
            </button>
          </div>

          {/* Mobile dropdown */}
          <div
            className={`overflow-hidden border-t transform-gpu origin-top transition-all duration-200 ease-out sm:hidden ${
              mobileMenuOpen
                ? 'max-h-96 opacity-100'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
            style={{ borderColor: '#4A3F35', backgroundColor: '#251E19' }}
          >
            <nav
              className="flex flex-col gap-0.5 px-3 py-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <NavLink to="/owner/menu" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                Menu
              </NavLink>
              <NavLink to="/owner/stats" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                Stats
              </NavLink>
              <NavLink to="/owner/settings" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                Settings
              </NavLink>
              <NavLink to="/owner/feedback" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                Feedback
              </NavLink>

              <div className="my-1.5 h-px" style={{ backgroundColor: '#4A3F35' }} />

              {restaurant?.slug && (
                <a
                  href={`/restaurant/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2.5 text-xs tracking-[0.18em] uppercase rounded-[4px] transition-colors duration-200 border"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#9C8B7A',
                    borderColor: '#4A3F35',
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Guest Menu
                </a>
              )}
              {restaurant?._id && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2.5 text-xs tracking-[0.18em] uppercase rounded-[4px] transition-colors duration-200 border"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#9C8B7A',
                    borderColor: '#4A3F35',
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(`/kitchen/${restaurant._id}`)
                  }}
                >
                  Kitchen
                </button>
              )}
              <button
                type="button"
                className="flex items-center px-3 py-2.5 text-xs tracking-[0.18em] uppercase rounded-[4px] transition-colors duration-200"
                style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
                onClick={() => {
                  setMobileMenuOpen(false)
                  setShowSignOutConfirm(true)
                }}
              >
                Sign Out
              </button>
            </nav>
          </div>
        </header>
      </div>

      {/* Sign-out confirmation modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div
            className="relative w-full max-w-sm rounded-[4px] p-8 flourish-sm"
            style={{
              backgroundColor: '#251E19',
              border: '1px solid #4A3F35',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}
          >
            <span className="overline-volume">Confirmation Required</span>
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4' }}
            >
              Sign Out?
            </h2>
            <p className="text-sm mb-6" style={{ color: '#9C8B7A', fontFamily: 'var(--font-body)' }}>
              You will need to sign in again to access your establishment's dashboard.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-outline btn-brass-sm"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-brass btn-brass-sm"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
