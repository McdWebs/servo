import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1C1714' }}>
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flourish-sm relative w-full rounded-[4px] px-8 py-10" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <span className="overline-volume">Error 404</span>
          <p className="mt-4 text-7xl" style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.1em', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            404
          </p>
          <h1 className="mt-3 text-2xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>
            Page Not Found
          </h1>
          <div className="divider-ornate my-4" />
          <p className="text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            The page you are looking for does not exist or may have been moved.
          </p>
          <Link
            to="/owner/login"
            className="btn-brass btn-brass-sm mt-6 inline-flex items-center justify-center"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

