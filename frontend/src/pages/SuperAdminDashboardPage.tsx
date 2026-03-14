import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../components/SuperAdminAuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'
import { BarChartCard, StatCard } from '../components/stats'

interface ListItem {
  restaurant: Restaurant & { createdAt?: string; updatedAt?: string }
  ownerEmail: string | null
}

interface Stats {
  totalRestaurants: number
  totalOrders: number
  ordersToday: number
  ordersThisWeek?: number
  ordersThisMonth?: number
  openWaiterCalls: number
  waiterCallsHandled?: number
  waiterCallsHandledThisWeek?: number
  avgWaiterResponseMinutes?: number | null
  totalFeedback?: number
  chatSessionsTotal?: number
  chatSessionsThisWeek?: number
  totalRevenue?: number
}

interface FeedbackItem {
  _id: string
  restaurantId: string
  restaurantName: string
  ownerEmail: string
  type: 'feedback' | 'bug'
  message: string
  status: 'new' | 'read' | 'replied'
  adminReply?: string
  adminRepliedAt?: string
  createdAt: string
}

interface RestaurantDetail {
  restaurant: Restaurant & { createdAt?: string; updatedAt?: string }
  owner: { email: string; createdAt: string } | null
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'ILS', label: 'ILS (₪)' },
] as const

const inputClass = 'input-academia'
const labelClass = 'label-academia'

export default function SuperAdminDashboardPage() {
  const { token, superAdmin, logoutSuperAdmin } = useSuperAdminAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [list, setList] = useState<ListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySaving, setReplySaving] = useState(false)
  const [markingReadId, setMarkingReadId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'restaurants' | 'stats'>('restaurants')

  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<Stats>('/api/super-admin/stats', { token })
      setStats(data)
    } catch {
      setStats(null)
    }
  }, [token])

  const fetchList = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const data = await apiFetch<{ items: ListItem[]; total: number }>(
        `/api/super-admin/restaurants?${params.toString()}`,
        { token }
      )
      setList(data.items)
      setTotal(data.total)
    } catch (err) {
      setError((err as Error).message)
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [token, search])

  const fetchFeedback = useCallback(async () => {
    if (!token) return
    setFeedbackLoading(true)
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>('/api/super-admin/feedback', {
        token,
      })
      setFeedbackList(data.items)
    } catch {
      setFeedbackList([])
    } finally {
      setFeedbackLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleMarkFeedbackRead = useCallback(
    async (id: string) => {
      if (!token) return
      setMarkingReadId(id)
      try {
        await apiFetch(`/api/super-admin/feedback/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'read' }),
          token,
        })
        await fetchFeedback()
        await fetchStats()
      } catch {
        // ignore
      } finally {
        setMarkingReadId(null)
      }
    },
    [token, fetchFeedback, fetchStats]
  )

  const handleReplySubmit = useCallback(
    async (id: string) => {
      if (!token || !replyText.trim()) return
      setReplySaving(true)
      try {
        await apiFetch(`/api/super-admin/feedback/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ adminReply: replyText.trim() }),
          token,
        })
        setReplyingId(null)
        setReplyText('')
        await fetchFeedback()
        await fetchStats()
      } catch {
        // ignore
      } finally {
        setReplySaving(false)
      }
    },
    [token, replyText, fetchFeedback, fetchStats]
  )

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const openEdit = useCallback(
    async (id: string) => {
      if (!token) return
      setEditId(id)
      setEditError(null)
      try {
        const data = await apiFetch<RestaurantDetail>(`/api/super-admin/restaurants/${id}`, {
          token,
        })
        const r = data.restaurant
        setEditForm({
          name: r.name ?? '',
          slug: r.slug ?? '',
          currency: r.currency ?? 'USD',
          address: r.address ?? '',
          phone: r.phone ?? '',
          contactEmail: r.contactEmail ?? '',
          description: r.description ?? '',
          restaurantType: r.restaurantType ?? '',
          timezone: r.timezone ?? 'UTC',
          openingHoursNote: r.openingHoursNote ?? '',
          taxRatePercent: r.taxRatePercent ?? '',
          serviceChargePercent: r.serviceChargePercent ?? '',
          allowOrders: r.allowOrders ?? true,
          orderLeadTimeMinutes: r.orderLeadTimeMinutes ?? 15,
          aiInstructions: r.aiInstructions ?? '',
          isSuspended: r.isSuspended ?? false,
        })
      } catch (err) {
        setEditError((err as Error).message)
      }
    },
    [token]
  )

  const closeEdit = useCallback(() => {
    setEditId(null)
    setEditError(null)
    setEditSaving(false)
  }, [])

  const handleEditChange = useCallback((field: string, value: string | number | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleEditSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!token || !editId) return
      setEditSaving(true)
      setEditError(null)
      try {
        const body: Record<string, unknown> = {
          name: String(editForm.name).trim(),
          slug: String(editForm.slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          currency: String(editForm.currency).trim(),
          address: String(editForm.address).trim() || undefined,
          phone: String(editForm.phone).trim() || undefined,
          contactEmail: String(editForm.contactEmail).trim() || undefined,
          description: String(editForm.description).trim() || undefined,
          restaurantType: String(editForm.restaurantType).trim() || undefined,
          timezone: String(editForm.timezone).trim() || undefined,
          openingHoursNote: String(editForm.openingHoursNote).trim() || undefined,
          allowOrders: Boolean(editForm.allowOrders),
          orderLeadTimeMinutes: Number(editForm.orderLeadTimeMinutes) || 0,
          aiInstructions: String(editForm.aiInstructions).trim() || undefined,
          isSuspended: Boolean(editForm.isSuspended),
        }
        const tax = parseFloat(String(editForm.taxRatePercent))
        if (!Number.isNaN(tax) && tax >= 0) body.taxRatePercent = tax
        const service = parseFloat(String(editForm.serviceChargePercent))
        if (!Number.isNaN(service) && service >= 0) body.serviceChargePercent = service

        await apiFetch<Restaurant>(`/api/super-admin/restaurants/${editId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(body),
        })
        closeEdit()
        fetchList()
        fetchStats()
      } catch (err) {
        setEditError((err as Error).message)
      } finally {
        setEditSaving(false)
      }
    },
    [token, editId, editForm, closeEdit, fetchList, fetchStats]
  )

  const toggleSuspend = useCallback(
    async (id: string, suspended: boolean) => {
      if (!token) return
      try {
        await apiFetch(`/api/super-admin/restaurants/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ isSuspended: suspended }),
        })
        fetchList()
        fetchStats()
        if (editId === id) setEditForm((prev) => ({ ...prev, isSuspended: suspended }))
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [token, editId, fetchList, fetchStats]
  )

  const cancelDelete = useCallback(() => setDeleteId(null), [])

  const doDelete = useCallback(async () => {
    if (!token || !deleteId) return
    const idToDelete = deleteId
    setDeleteId(null)
    try {
      await apiFetch(`/api/super-admin/restaurants/${idToDelete}`, {
        method: 'DELETE',
        token,
      })
      fetchList()
      fetchStats()
      if (editId === idToDelete) closeEdit()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [token, deleteId, editId, closeEdit, fetchList, fetchStats])

  const handleSignOut = useCallback(() => {
    logoutSuperAdmin()
    navigate('/super-admin/login', { replace: true })
  }, [logoutSuperAdmin, navigate])

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1C1714', color: '#E8DFD4' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{ backgroundColor: '#251E19', borderBottom: '1px solid #4A3F35', boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1
            className="text-sm tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-display)', color: '#C9A962' }}
          >
            Servo — Grand Chamberlain
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              {superAdmin?.email ?? ''}
            </span>
            <button type="button" onClick={handleSignOut} className="btn-ghost" style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.55rem' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-[4px] px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(139,38,53,0.1)', border: '1px solid rgba(139,38,53,0.3)', color: '#C96070', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        {/* Tab nav */}
        <div className="mb-8 flex gap-1 rounded-[4px] p-1" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}>
          {(['restaurants', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="rounded-[4px] px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-all duration-200"
              style={{
                fontFamily: 'var(--font-display)',
                ...(activeTab === tab
                  ? { backgroundColor: 'rgba(201,169,98,0.12)', color: '#C9A962' }
                  : { backgroundColor: 'transparent', color: '#9C8B7A' }),
              }}
            >
              {tab === 'restaurants' ? 'Establishments' : 'Platform Stats'}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && (
          <section className="mb-8 space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="overline-volume">I</span>
                <h2 className="text-2xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Platform Overview</h2>
              </div>
              <button type="button" onClick={() => fetchStats()} className="btn-outline btn-brass-sm" style={{ height: '2.25rem', fontSize: '0.6rem' }}>↻ Refresh</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Establishments" value={stats?.totalRestaurants ?? '—'} accent="brass" />
              <StatCard label="Total orders" value={stats?.totalOrders ?? '—'} accent="brass" />
              <StatCard label="Orders today" value={stats?.ordersToday ?? '—'} />
              <StatCard label="Total revenue" value={typeof stats?.totalRevenue === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.totalRevenue) : '—'} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <BarChartCard title="Orders by Period" data={[{ name: 'Today', value: stats?.ordersToday ?? 0 }, { name: 'This week', value: stats?.ordersThisWeek ?? 0 }, { name: 'This month', value: stats?.ordersThisMonth ?? 0 }]} />
              <BarChartCard title="Platform Engagement (This Week)" data={[{ name: 'Waiter calls', value: stats?.waiterCallsHandledThisWeek ?? 0 }, { name: 'Chat sessions', value: stats?.chatSessionsThisWeek ?? 0 }]} barColors={['#C9A962', '#9C8B7A']} />
            </div>
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="overline-volume" style={{ marginBottom: 0 }}>II</span>
                <h3 className="text-lg" style={{ fontFamily: 'var(--font-heading)', color: '#9C8B7A', fontWeight: 400 }}>Operations & Support</h3>
                <div className="flex-1 h-px" style={{ backgroundColor: '#4A3F35' }} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Open waiter calls" value={stats?.openWaiterCalls ?? '—'} />
                <StatCard label="Waiter calls handled" value={stats?.waiterCallsHandled ?? '—'} />
                <StatCard label="Avg response (min)" value={typeof stats?.avgWaiterResponseMinutes === 'number' ? stats.avgWaiterResponseMinutes.toFixed(1) : '—'} />
                <StatCard label="Chat sessions" value={stats?.chatSessionsTotal ?? '—'} sublabel={`${stats?.chatSessionsThisWeek ?? 0} this week`} accent="brass" />
                <StatCard label="Feedback / bugs" value={stats?.totalFeedback ?? '—'} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'restaurants' && (
          <>
            <section className="overflow-hidden rounded-[4px] mb-8" style={{ border: '1px solid #4A3F35' }}>
              <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid #4A3F35', backgroundColor: '#251E19' }}>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Establishments</h2>
                  <span className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>{total} total</span>
                </div>
                <input
                  type="search"
                  placeholder="Search by name or slug…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input-academia sm:max-w-xs"
                  style={{ height: '2.5rem', fontSize: '13px' }}
                />
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="px-5 py-12 text-center text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>Loading…</div>
                ) : list.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>No establishments found.</div>
                ) : (
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #4A3F35', backgroundColor: 'rgba(74,63,53,0.3)' }}>
                        {['Name', 'Slug', 'Owner', 'Status', ''].map((h) => (
                          <th key={h} className={`px-5 py-3 text-left text-[10px] tracking-[0.2em] uppercase ${h === '' ? 'text-right' : ''}`} style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(({ restaurant, ownerEmail }) => (
                        <tr key={restaurant._id} style={{ borderBottom: '1px solid rgba(74,63,53,0.4)' }}>
                          <td className="px-5 py-3" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>{restaurant.name}</td>
                          <td className="px-5 py-3 text-xs" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A', fontStyle: 'italic' }}>{restaurant.slug}</td>
                          <td className="px-5 py-3 text-xs" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>{ownerEmail ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className={restaurant.isSuspended ? 'status-error' : 'status-ready'}>
                              {restaurant.isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {[
                                { label: 'Edit', onClick: () => openEdit(restaurant._id), danger: false },
                                { label: restaurant.isSuspended ? 'Resume' : 'Suspend', onClick: () => toggleSuspend(restaurant._id, !restaurant.isSuspended), danger: false },
                              ].map(({ label, onClick, danger }) => (
                                <button key={label} type="button" onClick={onClick}
                                  className="rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150"
                                  style={{ fontFamily: 'var(--font-display)', color: danger ? '#C96070' : '#9C8B7A', borderColor: danger ? 'rgba(139,38,53,0.3)' : '#4A3F35', backgroundColor: 'transparent' }}
                                >
                                  {label}
                                </button>
                              ))}
                              <button type="button" onClick={() => setDeleteId(restaurant._id)}
                                className="rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150"
                                style={{ fontFamily: 'var(--font-display)', color: '#C96070', borderColor: 'rgba(139,38,53,0.3)', backgroundColor: 'transparent' }}
                              >
                                Delete
                              </button>
                              <a href={`${baseUrl}/restaurant/${restaurant.slug}/menu`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150"
                                style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A', borderColor: '#4A3F35' }}
                              >
                                Guest Menu
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Feedback section */}
            <section className="rounded-[4px]" style={{ border: '1px solid #4A3F35' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #4A3F35', backgroundColor: '#251E19' }}>
                <h2 className="text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Owner Correspondence</h2>
                <p className="text-xs mt-1 italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>Feedback and bug reports from restaurant owners.</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {feedbackLoading ? (
                  <div className="px-5 py-8 text-center text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>Loading…</div>
                ) : feedbackList.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>No correspondence yet.</div>
                ) : (
                  <ul>
                    {feedbackList.map((item, i) => (
                      <li key={item._id} className="px-5 py-4" style={{ borderBottom: i < feedbackList.length - 1 ? '1px solid rgba(74,63,53,0.4)' : 'none' }}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="rounded-[2px] px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase"
                            style={{ fontFamily: 'var(--font-display)', backgroundColor: item.type === 'bug' ? 'rgba(139,38,53,0.12)' : 'rgba(74,63,53,0.3)', color: item.type === 'bug' ? '#C96070' : '#9C8B7A', border: `1px solid ${item.type === 'bug' ? 'rgba(139,38,53,0.3)' : '#4A3F35'}` }}>
                            {item.type === 'bug' ? 'Bug' : 'Feedback'}
                          </span>
                          <span className="text-xs" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4' }}>{item.restaurantName}</span>
                          <span className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>{item.ownerEmail}</span>
                          <span className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap mb-3" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>{item.message}</p>
                        {(item.status ?? 'new') === 'replied' && item.adminReply && (
                          <div className="mb-3 rounded-[4px] p-3" style={{ backgroundColor: 'rgba(107,142,101,0.06)', border: '1px solid rgba(107,142,101,0.2)' }}>
                            <p className="text-[10px] tracking-[0.12em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)', color: '#8EAF88' }}>Your Reply</p>
                            <p className="text-sm whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>{item.adminReply}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {(item.status ?? 'new') === 'new' && (
                            <button type="button" disabled={markingReadId === item._id} onClick={() => handleMarkFeedbackRead(item._id)}
                              className="rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 disabled:opacity-50"
                              style={{ fontFamily: 'var(--font-display)', color: '#C9A962', borderColor: 'rgba(201,169,98,0.3)', backgroundColor: 'rgba(201,169,98,0.06)' }}>
                              {markingReadId === item._id ? 'Updating…' : 'Mark as Read'}
                            </button>
                          )}
                          <button type="button" onClick={() => { setReplyingId(replyingId === item._id ? null : item._id); setReplyText(item.adminReply ?? '') }}
                            className="rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150"
                            style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A', borderColor: '#4A3F35', backgroundColor: 'transparent' }}>
                            {replyingId === item._id ? 'Cancel' : 'Reply'}
                          </button>
                        </div>
                        {replyingId === item._id && (
                          <div className="mt-3 rounded-[4px] p-3" style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}>
                            <textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply to the owner…" className="input-academia mb-3" style={{ minHeight: '4rem', fontSize: '13px' }} />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => { setReplyingId(null); setReplyText('') }} className="btn-ghost" style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.55rem' }}>Cancel</button>
                              <button type="button" disabled={replySaving || !replyText.trim()} onClick={() => handleReplySubmit(item._id)} className="btn-brass btn-brass-sm" style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.55rem' }}>
                                {replySaving ? 'Sending…' : 'Send Reply'}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && closeEdit()} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[4px]" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #4A3F35', backgroundColor: '#251E19' }}>
              <h2 id="edit-modal-title" className="text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Edit Establishment</h2>
              <button type="button" onClick={closeEdit} className="btn-ghost" style={{ height: '2rem', padding: '0 0.5rem', fontSize: '0.55rem' }} aria-label="Close">Close</button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
              {editError && (
                <div className="rounded-[4px] px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(139,38,53,0.1)', border: '1px solid rgba(139,38,53,0.3)', color: '#C96070', fontFamily: 'var(--font-body)' }}>{editError}</div>
              )}
              {[
                { id: 'edit-name', label: 'Name', field: 'name', type: 'text' },
                { id: 'edit-slug', label: 'Slug', field: 'slug', type: 'text' },
                { id: 'edit-address', label: 'Address', field: 'address', type: 'text' },
                { id: 'edit-phone', label: 'Phone', field: 'phone', type: 'text' },
                { id: 'edit-contactEmail', label: 'Contact Email', field: 'contactEmail', type: 'email' },
                { id: 'edit-restaurantType', label: 'Restaurant Type', field: 'restaurantType', type: 'text' },
                { id: 'edit-timezone', label: 'Timezone', field: 'timezone', type: 'text' },
                { id: 'edit-openingHoursNote', label: 'Opening Hours', field: 'openingHoursNote', type: 'text' },
              ].map(({ id, label, field, type }) => (
                <div key={id} className="space-y-1.5">
                  <label htmlFor={id} className="label-academia">{label}</label>
                  <input id={id} type={type} value={editForm[field] as string}
                    onChange={(e) => handleEditChange(field, e.target.value)} className="input-academia" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label htmlFor="edit-currency" className="label-academia">Currency</label>
                <select id="edit-currency" value={editForm.currency as string}
                  onChange={(e) => handleEditChange('currency', e.target.value)} className="input-academia">
                  {CURRENCIES.map((c) => (<option key={c.value} value={c.value} style={{ backgroundColor: '#251E19' }}>{c.label}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-description" className="label-academia">Description</label>
                <textarea id="edit-description" value={editForm.description as string}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="input-academia" rows={2} style={{ minHeight: '4rem', fontSize: '13px' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'edit-taxRatePercent', label: 'Tax %', field: 'taxRatePercent' }, { id: 'edit-serviceChargePercent', label: 'Service Charge %', field: 'serviceChargePercent' }].map(({ id, label, field }) => (
                  <div key={id} className="space-y-1.5">
                    <label htmlFor={id} className="label-academia">{label}</label>
                    <input id={id} type="number" min={0} step={0.01} value={editForm[field] as number}
                      onChange={(e) => handleEditChange(field, e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="input-academia" style={{ height: '2.75rem', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-orderLeadTimeMinutes" className="label-academia">Order Lead Time (min)</label>
                <input id="edit-orderLeadTimeMinutes" type="number" min={0} value={editForm.orderLeadTimeMinutes as number}
                  onChange={(e) => handleEditChange('orderLeadTimeMinutes', parseInt(e.target.value, 10) || 0)}
                  className="input-academia" style={{ height: '2.75rem', fontSize: '13px' }} />
              </div>
              {[
                { id: 'edit-allowOrders', label: 'Allow Orders', field: 'allowOrders' },
                { id: 'edit-isSuspended', label: 'Suspended', field: 'isSuspended' },
              ].map(({ id, label, field }) => (
                <label key={id} className="flex items-center gap-3 cursor-pointer">
                  <div className="relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0"
                    style={{ backgroundColor: Boolean(editForm[field]) ? '#C9A962' : '#4A3F35' }}
                    onClick={() => handleEditChange(field, !editForm[field])}>
                    <div className="absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200"
                      style={{ backgroundColor: Boolean(editForm[field]) ? '#1C1714' : '#3D332B', transform: Boolean(editForm[field]) ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }} />
                  </div>
                  <input id={id} type="checkbox" checked={Boolean(editForm[field])}
                    onChange={(e) => handleEditChange(field, e.target.checked)} className="sr-only" />
                  <span className="label-academia" style={{ marginBottom: 0 }}>{label}</span>
                </label>
              ))}
              <div className="space-y-1.5">
                <label htmlFor="edit-aiInstructions" className="label-academia">AI Instructions</label>
                <textarea id="edit-aiInstructions" value={editForm.aiInstructions as string}
                  onChange={(e) => handleEditChange('aiInstructions', e.target.value)}
                  className="input-academia" rows={2} style={{ minHeight: '4rem', fontSize: '13px' }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={editSaving} className="btn-brass btn-brass-sm">{editSaving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" onClick={closeEdit} className="btn-outline btn-brass-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && cancelDelete()} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="relative w-full max-w-sm rounded-[4px] p-8 flourish-sm" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}>
            <span className="overline-volume" style={{ color: '#C96070' }}>Irreversible Action</span>
            <h2 id="delete-modal-title" className="text-xl mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>Delete Establishment?</h2>
            <p className="text-sm mb-6" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              This will permanently delete the establishment, its owner account, menu, tables, and all orders. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={doDelete} className="btn-danger btn-brass-sm">Delete Permanently</button>
              <button type="button" onClick={cancelDelete} className="btn-outline btn-brass-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
