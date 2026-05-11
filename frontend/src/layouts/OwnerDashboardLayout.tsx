import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useLang } from '../contexts/LanguageContext'

export default function OwnerDashboardLayout() {
  const { restaurant, logout } = useAuth()
  const navigate = useNavigate()
  const { t, lang, setLang, dir } = useLang()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { to: '/owner/menu',       label: t('menu') },
    { to: '/owner/stats',      label: t('stats') },
    { to: '/owner/promotions', label: t('promotions') },
    { to: '/owner/loyalty',    label: t('loyalty') },
    { to: '/owner/qr',         label: t('qrCodes') },
    { to: '/owner/settings',   label: t('settings') },
    { to: '/owner/feedback',   label: t('feedback') },
  ]

  const handleLogout = () => {
    setShowSignOutConfirm(false)
    logout()
    navigate('/owner/login', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-1.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-2 sm:py-1 sm:text-xs ${
      isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    }`

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between rounded-lg px-2 py-2 text-xs font-medium transition-colors touch-manipulation ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir={dir}>
      <div className="sticky top-0 z-20">
        {restaurant?.isSuspended && (
          <div
            className="border-b border-amber-300 bg-amber-100 px-3 py-2.5 text-center text-sm font-medium text-amber-900"
            role="alert"
          >
            {t('suspendedBanner')}
          </div>
        )}
        <header className="border-b border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
            <h1 className="min-w-0 flex-shrink truncate text-sm font-bold tracking-tight text-slate-900 sm:min-w-[8rem] sm:text-base">
              <span className="text-slate-500 font-semibold">Servo</span>
              <span className="mx-1.5 text-slate-300">·</span>
              {restaurant?.name ?? 'המסעדה שלך'}
            </h1>

            {/* Desktop nav */}
            <div className="ml-auto hidden flex-shrink-0 items-center gap-1 rounded-full bg-slate-100/70 px-1.5 py-0.5 sm:flex sm:gap-2">
              <nav className="flex items-center gap-0.5">
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navClass}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              {restaurant?.slug && (
                <a
                  href={`/restaurant/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-manipulation whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
                >
                  <span className="sm:hidden">{t('menu')}</span>
                  <span className="hidden sm:inline">{t('guestMenu')}</span>
                </a>
              )}
              {restaurant?._id && (
                <button
                  type="button"
                  className="touch-manipulation whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
                  onClick={() => navigate(`/kitchen/${restaurant._id}`)}
                >
                  {t('kitchen')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className="touch-manipulation whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
              >
                {t('langToggle')}
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="touch-manipulation whitespace-nowrap rounded border border-rose-100 bg-white px-1.5 py-1 text-[11px] font-medium text-rose-500 shadow-sm transition-colors hover:bg-rose-50 sm:px-2"
              >
                {t('signOut')}
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle owner navigation"
              aria-expanded={mobileMenuOpen}
            >
              <span className="mr-1 text-[11px]">{t('menu')}</span>
              <span className="flex flex-col gap-[3px]">
                <span className="block h-[1px] w-3 rounded-full bg-slate-700" />
                <span className="block h-[1px] w-3 rounded-full bg-slate-700" />
                <span className="block h-[1px] w-3 rounded-full bg-slate-700" />
              </span>
            </button>
          </div>

          {/* Mobile menu */}
          <div
            className={`border-t border-slate-200 bg-white px-2 pb-2 pt-1 shadow-sm shadow-slate-200/60 sm:hidden overflow-hidden transform-gpu origin-top transition-all duration-200 ease-out ${
              mobileMenuOpen ? 'max-h-96 scale-y-100 opacity-100' : 'max-h-0 scale-y-95 opacity-0 pointer-events-none'
            }`}
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={mobileNavClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              {restaurant?.slug && (
                <a
                  href={`/restaurant/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('guestMenu')}
                </a>
              )}
              {restaurant?._id && (
                <button
                  type="button"
                  className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(`/kitchen/${restaurant._id}`)
                  }}
                >
                  {t('kitchen')}
                </button>
              )}
              <button
                type="button"
                className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setLang(lang === 'he' ? 'en' : 'he')
                }}
              >
                {t('langToggle')}
              </button>
              <button
                type="button"
                className="mt-1 flex items-center justify-between rounded-lg border border-rose-100 bg-white px-2 py-2 text-xs font-medium text-rose-500 shadow-sm transition-colors hover:bg-rose-50"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setShowSignOutConfirm(true)
                }}
              >
                {t('signOut')}
              </button>
            </nav>
          </div>
        </header>
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">{t('signOutQuestion')}</h2>
            <p className="mt-2 text-xs text-slate-600">{t('signOutDesc')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setShowSignOutConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                onClick={handleLogout}
              >
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
