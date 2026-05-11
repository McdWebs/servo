import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { apiFetch } from "../lib/api";
import { BarChartCard, StatCard } from "../components/stats";
import { useLang } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface OwnerStats {
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  totalOrders: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  totalRevenue: number;
  avgOrderValue: number | null;
  waiterCallsHandled: number;
  waiterCallsHandledThisWeek: number;
  avgWaiterResponseMinutes: number | null;
  chatSessionsTotal: number;
  chatSessionsThisWeek: number;
  currency: string;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OwnerStatsPage() {
  const { token } = useAuth();
  const { t } = useLang();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(
    async (showRefreshing = false) => {
      if (!token) return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<OwnerStats>("/api/owner/stats", { token });
        setStats(data);
      } catch (err) {
        setError((err as Error).message);
        setStats(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => fetchStats(true);

  async function handleExport() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/owner/orders/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("שגיאה בייצוא הזמנות");
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-8 w-24 rounded-full bg-slate-200" />
        </div>

        {/* Overview skeleton */}
        <section>
          <div className="mb-3 h-3 w-24 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1 h-3 w-12 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>

        {/* Charts skeleton */}
        <section className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4"
            >
              <div className="h-4 w-32 rounded-full bg-slate-200" />
              <div className="mt-4 h-32 rounded-lg bg-slate-100" />
            </div>
          ))}
        </section>

        {/* Revenue skeleton */}
        <section>
          <div className="mb-3 h-3 w-24 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="h-3 w-16 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-20 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </section>

        {/* Operations skeleton */}
        <section>
          <div className="mb-3 h-3 w-40 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1 h-3 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const currency = stats.currency || "USD";
  const revenueFormatter = (n: number) => formatCurrency(n, currency);

  const ordersChartData = [
    { name: t('today'), value: stats.ordersToday },
    { name: t('thisWeekLabel'), value: stats.ordersThisWeek },
    { name: t('thisMonthLabel'), value: stats.ordersThisMonth },
  ];

  const revenueChartData = [
    { name: t('today'), value: stats.revenueToday },
    { name: t('thisWeekLabel'), value: stats.revenueThisWeek },
    { name: t('thisMonthLabel'), value: stats.revenueThisMonth },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {t('restaurantStats')}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            {t('exportExcel')}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <span
              className={`inline-block h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            >
              ↻
            </span>
            {refreshing ? t('refreshing') : t('refresh')}
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t('statsOverview')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('ordersToday')}
            value={stats.ordersToday}
            accent="emerald"
          />
          <StatCard
            label={t('revenueToday')}
            value={formatCurrency(stats.revenueToday, currency)}
            accent="blue"
          />
          <StatCard
            label={t('avgOrderValue')}
            value={
              stats.avgOrderValue != null
                ? formatCurrency(stats.avgOrderValue, currency)
                : "—"
            }
            accent="violet"
          />
          <StatCard
            label={t('totalOrders')}
            value={stats.totalOrders}
            sublabel={t('allTime')}
            accent="slate"
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <BarChartCard title={t('ordersByPeriod')} data={ordersChartData} />
        <BarChartCard
          title={t('revenueByPeriod')}
          data={revenueChartData}
          valueFormatter={revenueFormatter}
          barColors={["#3b82f6", "#60a5fa", "#93c5fd"]}
        />
      </section>

      {/* Revenue breakdown */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t('revenue')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('today')}
            value={formatCurrency(stats.revenueToday, currency)}
            accent="slate"
          />
          <StatCard
            label={t('thisWeekLabel')}
            value={formatCurrency(stats.revenueThisWeek, currency)}
            accent="slate"
          />
          <StatCard
            label={t('thisMonthLabel')}
            value={formatCurrency(stats.revenueThisMonth, currency)}
            accent="slate"
          />
          <StatCard
            label={t('totalRevenue')}
            value={formatCurrency(stats.totalRevenue, currency)}
            accent="emerald"
          />
        </div>
      </section>

      {/* Operations */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t('operationsEngagement')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('waiterCallsHandled')}
            value={stats.waiterCallsHandled}
            sublabel={t('allTime')}
            accent="amber"
          />
          <StatCard
            label={t('waiterCallsThisWeek')}
            value={stats.waiterCallsHandledThisWeek}
            accent="slate"
          />
          <StatCard
            label={t('avgResponseTime')}
            value={
              typeof stats.avgWaiterResponseMinutes === "number"
                ? `${stats.avgWaiterResponseMinutes.toFixed(1)} min`
                : "—"
            }
            accent="slate"
          />
          <StatCard
            label={t('chatSessions')}
            value={stats.chatSessionsTotal}
            sublabel={`${stats.chatSessionsThisWeek} ${t('thisWeekSuffix')}`}
            accent="violet"
          />
        </div>
      </section>
    </div>
  );
}
