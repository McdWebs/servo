import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import { BarChartCard, StatCard } from '../components/stats'

interface OwnerStats {
  ordersToday: number
  ordersThisWeek: number
  ordersThisMonth: number
  totalOrders: number
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  totalRevenue: number
  avgOrderValue: number | null
  waiterCallsHandled: number
  waiterCallsHandledThisWeek: number
  avgWaiterResponseMinutes: number | null
  chatSessionsTotal: number
  chatSessionsThisWeek: number
  currency: string
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[4px] ${className}`}
      style={{ backgroundColor: '#3D332B' }}
    />
  )
}

export default function OwnerStatsPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (!token) return
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<OwnerStats>('/api/owner/stats', { token })
      setStats(data)
    } catch (err) {
      setError((err as Error).message)
      setStats(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleRefresh = () => fetchStats(true)

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-10 w-28" />
        </div>
        <section>
          <SkeletonBlock className="h-3 w-24 mb-4" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-[4px] p-4" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}>
                <SkeletonBlock className="h-2.5 w-20 mb-3" />
                <SkeletonBlock className="h-6 w-16 mb-1" />
                <SkeletonBlock className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-[4px] p-5" style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}>
              <SkeletonBlock className="h-4 w-40 mb-4" />
              <SkeletonBlock className="h-[200px] w-full" />
            </div>
          ))}
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[4px] px-5 py-4 text-sm"
        style={{ backgroundColor: 'rgba(139,38,53,0.1)', border: '1px solid rgba(139,38,53,0.3)', color: '#C96070', fontFamily: 'var(--font-body)' }}
      >
        {error}
      </div>
    )
  }

  if (!stats) return null

  const currency = stats.currency || 'USD'
  const revenueFormatter = (n: number) => formatCurrency(n, currency)

  const ordersChartData = [
    { name: 'Today', value: stats.ordersToday },
    { name: 'This week', value: stats.ordersThisWeek },
    { name: 'This month', value: stats.ordersThisMonth },
  ]

  const revenueChartData = [
    { name: 'Today', value: stats.revenueToday },
    { name: 'This week', value: stats.revenueThisWeek },
    { name: 'This month', value: stats.revenueThisMonth },
  ]

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="overline-volume">Volume I</span>
          <h2
            className="text-3xl"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
          >
            Ledger of Commerce
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-outline btn-brass-sm self-start sm:self-auto"
          style={{ minWidth: '7rem' }}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Overview KPIs */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="overline-volume" style={{ marginBottom: 0 }}>I</span>
          <h3
            className="text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: '#9C8B7A', fontWeight: 400 }}
          >
            Today's Overview
          </h3>
          <div className="flex-1 h-px" style={{ backgroundColor: '#4A3F35' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Orders today" value={stats.ordersToday} accent="brass" />
          <StatCard label="Revenue today" value={formatCurrency(stats.revenueToday, currency)} accent="brass" />
          <StatCard
            label="Avg order value"
            value={stats.avgOrderValue != null ? formatCurrency(stats.avgOrderValue, currency) : '—'}
          />
          <StatCard label="Total orders" value={stats.totalOrders} sublabel="All time" />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <BarChartCard title="Orders by Period" data={ordersChartData} />
        <BarChartCard
          title="Revenue by Period"
          data={revenueChartData}
          valueFormatter={revenueFormatter}
          barColors={['#C9A962', '#9C8B7A', '#4A3F35']}
        />
      </section>

      {/* Revenue */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="overline-volume" style={{ marginBottom: 0 }}>II</span>
          <h3
            className="text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: '#9C8B7A', fontWeight: 400 }}
          >
            Revenue
          </h3>
          <div className="flex-1 h-px" style={{ backgroundColor: '#4A3F35' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Today" value={formatCurrency(stats.revenueToday, currency)} />
          <StatCard label="This week" value={formatCurrency(stats.revenueThisWeek, currency)} />
          <StatCard label="This month" value={formatCurrency(stats.revenueThisMonth, currency)} />
          <StatCard label="Total revenue" value={formatCurrency(stats.totalRevenue, currency)} accent="brass" sublabel="All time" />
        </div>
      </section>

      {/* Operations */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="overline-volume" style={{ marginBottom: 0 }}>III</span>
          <h3
            className="text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: '#9C8B7A', fontWeight: 400 }}
          >
            Operations & Engagement
          </h3>
          <div className="flex-1 h-px" style={{ backgroundColor: '#4A3F35' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Waiter calls handled" value={stats.waiterCallsHandled} sublabel="All time" />
          <StatCard label="Waiter calls (this week)" value={stats.waiterCallsHandledThisWeek} />
          <StatCard
            label="Avg response time"
            value={typeof stats.avgWaiterResponseMinutes === 'number' ? `${stats.avgWaiterResponseMinutes.toFixed(1)} min` : '—'}
          />
          <StatCard
            label="Chat sessions"
            value={stats.chatSessionsTotal}
            sublabel={`${stats.chatSessionsThisWeek} this week`}
            accent="brass"
          />
        </div>
      </section>
    </div>
  )
}
