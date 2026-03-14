import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'ILS', label: 'ILS (₪)' },
] as const

const RESTAURANT_TYPES = [
  { value: '', label: 'Select type…' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Mexican', label: 'Mexican' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'American', label: 'American' },
  { value: 'Mediterranean', label: 'Mediterranean' },
  { value: 'Indian', label: 'Indian' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Cafe', label: 'Cafe' },
  { value: 'Fast food', label: 'Fast food' },
  { value: 'Fine dining', label: 'Fine dining' },
  { value: 'Bar', label: 'Bar' },
  { value: 'Bakery', label: 'Bakery' },
  { value: 'Pizza', label: 'Pizza' },
  { value: 'Other', label: 'Other' },
] as const

const OPENING_HOURS_PRESETS = [
  { label: 'Every day 11–22', value: 'Every day 11:00–22:00' },
  { label: 'Mon–Fri 09–17', value: 'Mon–Fri 09:00–17:00, Sat–Sun closed' },
  { label: 'Mon–Sat 08–23', value: 'Mon–Sat 08:00–23:00, Sun closed' },
  { label: 'Mon–Fri 11–22, Sat–Sun 10–23', value: 'Mon–Fri 11:00–22:00, Sat–Sun 10:00–23:00' },
  { label: 'Lunch & dinner (12–15, 18–22)', value: 'Mon–Sun 12:00–15:00 & 18:00–22:00' },
  { label: '24/7', value: 'Open 24/7' },
  { label: 'Breakfast & lunch (07–15)', value: 'Mon–Sun 07:00–15:00' },
] as const

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Jerusalem', 'Asia/Tokyo', 'Australia/Sydney',
]

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[4px] p-6"
      style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}
    >
      <h2
        className="text-xl mb-1"
        style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs mb-5" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}

export default function OwnerSettingsPage() {
  const { owner, restaurant, token, updateRestaurant, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    restaurantType: '',
    currency: 'USD',
    address: '',
    phone: '',
    contactEmail: '',
    timezone: 'UTC',
    openingHoursNote: '',
    taxRatePercent: '' as number | '',
    serviceChargePercent: '' as number | '',
    allowOrders: true,
    orderLeadTimeMinutes: 15,
    aiInstructions: '',
    printerEnabled: false,
    printerName: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(timeout)
  }, [success])

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        description: restaurant.description ?? '',
        restaurantType: restaurant.restaurantType ?? '',
        currency: restaurant.currency ?? 'USD',
        address: restaurant.address ?? '',
        phone: restaurant.phone ?? '',
        contactEmail: restaurant.contactEmail ?? '',
        timezone: restaurant.timezone ?? 'UTC',
        openingHoursNote: restaurant.openingHoursNote ?? '',
        taxRatePercent: restaurant.taxRatePercent != null ? restaurant.taxRatePercent : '',
        serviceChargePercent: restaurant.serviceChargePercent != null ? restaurant.serviceChargePercent : '',
        allowOrders: restaurant.allowOrders ?? true,
        orderLeadTimeMinutes: restaurant.orderLeadTimeMinutes ?? 15,
        aiInstructions: restaurant.aiInstructions ?? '',
        printerEnabled: restaurant.printerEnabled ?? false,
        printerName: restaurant.printerName ?? '',
      })
    }
  }, [restaurant])

  if (!restaurant || !token) {
    return (
      <div
        className="rounded-[4px] px-5 py-4 text-sm italic"
        style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35', fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
      >
        Loading establishment settings…
      </div>
    )
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/restaurant/${restaurant.slug}/menu`

  const handleChange = (field: keyof typeof form, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        currency: form.currency,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        description: form.description.trim() || undefined,
        restaurantType: form.restaurantType.trim() || undefined,
        timezone: form.timezone || undefined,
        openingHoursNote: form.openingHoursNote.trim() || undefined,
        allowOrders: form.allowOrders,
        orderLeadTimeMinutes: form.orderLeadTimeMinutes,
      }
      if (typeof form.taxRatePercent === 'number') body.taxRatePercent = form.taxRatePercent
      if (typeof form.serviceChargePercent === 'number') body.serviceChargePercent = form.serviceChargePercent
      body.aiInstructions = form.aiInstructions.trim()
      body.printerEnabled = form.printerEnabled
      body.printerName = form.printerName.trim() || undefined
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH', token, body: JSON.stringify(body),
      })
      updateRestaurant(updated)
      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!restaurant || !token) return
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('logo', file)
    setLogoUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurant._id}/logo`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      })
      const json = (await res.json()) as Restaurant & { message?: string }
      if (!res.ok) throw new Error(json.message ?? 'Failed to upload logo')
      updateRestaurant(json)
      setSuccess('Logo updated.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!restaurant || !token) return
    setLogoUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH', token, body: JSON.stringify({ logoUrl: '' }),
      })
      updateRestaurant(updated)
      setSuccess('Logo removed.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setSuccess('Public menu link copied.')
      setError(null)
    } catch {
      setError('Failed to copy link.')
      setSuccess(null)
    }
  }

  const isPristine =
    form.name.trim() === restaurant.name &&
    (form.description ?? '').trim() === (restaurant.description ?? '') &&
    (form.restaurantType ?? '') === (restaurant.restaurantType ?? '') &&
    form.currency === (restaurant.currency ?? 'USD') &&
    (form.address ?? '') === (restaurant.address ?? '') &&
    (form.phone ?? '') === (restaurant.phone ?? '') &&
    (form.contactEmail ?? '') === (restaurant.contactEmail ?? '') &&
    (form.timezone ?? 'UTC') === (restaurant.timezone ?? 'UTC') &&
    (form.openingHoursNote ?? '') === (restaurant.openingHoursNote ?? '') &&
    form.allowOrders === (restaurant.allowOrders ?? true) &&
    form.orderLeadTimeMinutes === (restaurant.orderLeadTimeMinutes ?? 15) &&
    form.taxRatePercent === (restaurant.taxRatePercent != null ? restaurant.taxRatePercent : '') &&
    form.serviceChargePercent === (restaurant.serviceChargePercent != null ? restaurant.serviceChargePercent : '') &&
    (form.aiInstructions ?? '').trim() === (restaurant.aiInstructions ?? '').trim() &&
    form.printerEnabled === (restaurant.printerEnabled ?? false) &&
    (form.printerName ?? '') === (restaurant.printerName ?? '')

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="overline-volume">Configuration</span>
          <h1
            className="text-3xl"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
          >
            Establishment Settings
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-[2px] px-3 py-1 text-[10px] tracking-[0.15em] uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              backgroundColor: 'rgba(201,169,98,0.08)',
              color: '#C9A962',
              border: '1px solid rgba(201,169,98,0.2)',
            }}
          >
            {form.currency}
          </span>
          <span
            className="rounded-[2px] px-3 py-1 text-[10px] tracking-[0.15em] uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              backgroundColor: form.allowOrders ? 'rgba(107,142,101,0.1)' : 'rgba(74,63,53,0.3)',
              color: form.allowOrders ? '#8EAF88' : '#9C8B7A',
              border: `1px solid ${form.allowOrders ? 'rgba(107,142,101,0.3)' : '#4A3F35'}`,
            }}
          >
            Orders {form.allowOrders ? 'On' : 'Off'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant details */}
        <SectionCard
          title="Establishment Details"
          subtitle="Basic information shown to guests on the public menu."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="name" className="label-academia">Establishment Name</label>
                <input
                  id="name" name="name" value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input-academia" placeholder="Restaurant name" required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="restaurantType" className="label-academia">Type</label>
                <select
                  id="restaurantType" name="restaurantType" value={form.restaurantType}
                  onChange={(e) => handleChange('restaurantType', e.target.value)}
                  className="input-academia"
                >
                  {RESTAURANT_TYPES.map((t) => (
                    <option key={t.value || 'blank'} value={t.value} style={{ backgroundColor: '#251E19' }}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="currency" className="label-academia">Currency</label>
                <select
                  id="currency" name="currency" value={form.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="input-academia"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value} style={{ backgroundColor: '#251E19' }}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <span className="label-academia">Establishment Logo</span>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[4px] shrink-0"
                  style={{ border: '1px solid #4A3F35', backgroundColor: '#1C1714' }}
                >
                  {restaurant.logoUrl ? (
                    <img
                      src={restaurant.logoUrl}
                      alt={`${restaurant.name} logo`}
                      className="h-full w-full object-cover img-sepia"
                      style={{ filter: 'sepia(0)' }}
                    />
                  ) : (
                    <span
                      className="text-xl"
                      style={{ fontFamily: 'var(--font-display)', color: '#4A3F35' }}
                    >
                      {restaurant.name?.[0] ?? 'R'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className="btn-outline btn-brass-sm cursor-pointer"
                    style={{ height: '2.25rem', padding: '0 1rem', fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                    {logoUploading ? 'Uploading…' : 'Upload Logo'}
                  </label>
                  {restaurant.logoUrl && (
                    <button
                      type="button"
                      className="text-[11px] tracking-[0.1em] uppercase transition-colors duration-150"
                      style={{ fontFamily: 'var(--font-display)', color: '#4A3F35' }}
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#8B2635' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#4A3F35' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                Shown on the guest menu. Use a square JPG or PNG up to 5 MB.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="label-academia">Short Description</label>
              <textarea
                id="description" name="description" value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="input-academia" rows={3}
                style={{ minHeight: '5rem', fontSize: '14px' }}
                placeholder="e.g. A cozy Italian bistro in the heart of the city"
              />
            </div>
          </div>
        </SectionCard>

        {/* Contact */}
        <SectionCard
          title="Contact & Location"
          subtitle="Address and contact details for your establishment."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="address" className="label-academia">Address</label>
                <input
                  id="address" name="address" value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input-academia" placeholder="Street, city, postal code"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="label-academia">Telephone</label>
                <input
                  id="phone" name="phone" type="tel" value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="input-academia" placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:max-w-sm">
              <label htmlFor="contactEmail" className="label-academia">Contact Email</label>
              <input
                id="contactEmail" name="contactEmail" type="email" value={form.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className="input-academia" placeholder="contact@restaurant.com"
              />
            </div>
          </div>
        </SectionCard>

        {/* Opening hours */}
        <SectionCard
          title="Opening Hours"
          subtitle="Timezone and schedule displayed to guests."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="timezone" className="label-academia">Timezone</label>
                <select
                  id="timezone" name="timezone" value={form.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="input-academia"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} style={{ backgroundColor: '#251E19' }}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="openingHoursNote" className="label-academia">Hours Note</label>
                <input
                  id="openingHoursNote" name="openingHoursNote" value={form.openingHoursNote}
                  onChange={(e) => handleChange('openingHoursNote', e.target.value)}
                  className="input-academia" placeholder="e.g. Mon–Fri 11:00–22:00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="label-academia">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {OPENING_HOURS_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleChange('openingHoursNote', preset.value)}
                    className="rounded-[4px] border px-3 py-1.5 text-[11px] tracking-[0.1em] uppercase transition-all duration-150"
                    style={{
                      fontFamily: 'var(--font-display)',
                      ...(form.openingHoursNote === preset.value
                        ? { backgroundColor: 'rgba(201,169,98,0.12)', borderColor: 'rgba(201,169,98,0.4)', color: '#C9A962' }
                        : { backgroundColor: 'transparent', borderColor: '#4A3F35', color: '#9C8B7A' }),
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Orders */}
        <SectionCard
          title="Order Management"
          subtitle="Control whether guests can place orders and configure lead time."
        >
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className="relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0"
                style={{ backgroundColor: form.allowOrders ? '#C9A962' : '#4A3F35' }}
                onClick={() => handleChange('allowOrders', !form.allowOrders)}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: form.allowOrders ? '#1C1714' : '#3D332B',
                    transform: form.allowOrders ? 'translateX(1.25rem)' : 'translateX(0.125rem)',
                  }}
                />
              </div>
              <input
                id="allowOrders" name="allowOrders" type="checkbox"
                checked={form.allowOrders}
                onChange={(e) => handleChange('allowOrders', e.target.checked)}
                className="sr-only"
              />
              <span className="label-academia" style={{ marginBottom: 0 }}>
                Accept Orders from the Menu
              </span>
            </label>

            <div className="space-y-1.5 sm:max-w-xs">
              <label htmlFor="orderLeadTimeMinutes" className="label-academia">
                Order Lead Time (minutes)
              </label>
              <input
                id="orderLeadTimeMinutes" name="orderLeadTimeMinutes" type="number"
                min={0} max={120} value={form.orderLeadTimeMinutes}
                onChange={(e) => handleChange('orderLeadTimeMinutes', parseInt(e.target.value, 10) || 0)}
                className="input-academia" style={{ height: '2.75rem', fontSize: '14px' }}
              />
              <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                How many minutes before the order is expected to be ready.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Advanced toggle */}
        <div
          className="rounded-[4px] px-5 py-4 flex items-center justify-between gap-3"
          style={{ backgroundColor: 'rgba(74,63,53,0.2)', border: '1px dashed #4A3F35' }}
        >
          <div>
            <h2
              className="text-sm tracking-[0.12em] uppercase"
              style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
            >
              Advanced Configuration
            </h2>
            <p className="text-xs italic mt-0.5" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
              Printer, AI behavior, account, and public link.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline btn-brass-sm shrink-0"
            style={{ height: '2.25rem', fontSize: '0.6rem' }}
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Conceal' : 'Reveal'}
          </button>
        </div>

        {showAdvanced && (
          <>
            {/* Printer */}
            <SectionCard title="Printer" subtitle="Configure order printing from the Kitchen page.">
              <details
                className="mb-4 rounded-[4px] p-4 text-sm"
                style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
              >
                <summary
                  className="cursor-pointer text-xs tracking-[0.12em] uppercase"
                  style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
                >
                  How to connect your printer
                </summary>
                <ol className="mt-3 list-decimal list-inside space-y-1.5 text-xs" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                  <li>Open the <strong style={{ color: '#E8DFD4' }}>Kitchen</strong> page on the computer next to your printer.</li>
                  <li>Set your kitchen printer as the <strong style={{ color: '#E8DFD4' }}>default printer</strong> in system settings.</li>
                  <li>When an order arrives, click <strong style={{ color: '#E8DFD4' }}>Print</strong>. The browser will use the default printer.</li>
                </ol>
              </details>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0"
                    style={{ backgroundColor: form.printerEnabled ? '#C9A962' : '#4A3F35' }}
                    onClick={() => handleChange('printerEnabled', !form.printerEnabled)}
                  >
                    <div
                      className="absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200"
                      style={{
                        backgroundColor: form.printerEnabled ? '#1C1714' : '#3D332B',
                        transform: form.printerEnabled ? 'translateX(1.25rem)' : 'translateX(0.125rem)',
                      }}
                    />
                  </div>
                  <input id="printerEnabled" name="printerEnabled" type="checkbox" checked={form.printerEnabled}
                    onChange={(e) => handleChange('printerEnabled', e.target.checked)} className="sr-only" />
                  <span className="label-academia" style={{ marginBottom: 0 }}>Enable Order Printing</span>
                </label>
                <div className="space-y-1.5 sm:max-w-sm">
                  <label htmlFor="printerName" className="label-academia">Printer Name (optional)</label>
                  <input
                    id="printerName" name="printerName" type="text" value={form.printerName}
                    onChange={(e) => handleChange('printerName', e.target.value)}
                    className="input-academia" placeholder="e.g. Kitchen receipt printer"
                  />
                </div>
              </div>
            </SectionCard>

            {/* AI Instructions */}
            <SectionCard
              title="AI Waiter Instructions"
              subtitle="Customize tone, emphasis, and rules. Leave blank to use defaults."
            >
              <div className="space-y-1.5">
                <label htmlFor="aiInstructions" className="label-academia">Custom Instructions</label>
                <textarea
                  id="aiInstructions" name="aiInstructions" value={form.aiInstructions}
                  onChange={(e) => handleChange('aiInstructions', e.target.value)}
                  className="input-academia" rows={4}
                  style={{ minHeight: '7rem', fontSize: '14px' }}
                  placeholder="e.g. Be brief and warm. Always highlight gluten-free options. Suggest the house special when guests are undecided."
                />
                <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}>
                  The AI answers only from the menu — use this to shape style and priorities.
                </p>
              </div>
            </SectionCard>

            {/* Account */}
            <SectionCard title="Account" subtitle="You are currently signed in as:">
              <div
                className="mb-4 rounded-[4px] px-4 py-2.5 text-sm"
                style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35', fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
              >
                {owner?.email ?? '—'}
              </div>
              <button
                type="button"
                className="btn-danger btn-brass-sm"
                onClick={() => { logout(); navigate('/owner/login', { replace: true }) }}
              >
                Sign Out
              </button>
            </SectionCard>

            {/* Public menu link */}
            <SectionCard
              title="Public Menu Link"
              subtitle="Share this with guests so they can view the menu and place orders."
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <code
                  className="flex-1 min-w-0 truncate rounded-[4px] px-4 py-2.5 text-xs"
                  style={{
                    backgroundColor: '#1C1714',
                    border: '1px solid #4A3F35',
                    fontFamily: 'var(--font-body)',
                    color: '#9C8B7A',
                  }}
                >
                  {publicUrl}
                </code>
                <button
                  type="button"
                  className="btn-brass btn-brass-sm shrink-0"
                  style={{ height: '2.5rem', fontSize: '0.6rem' }}
                  onClick={handleCopyLink}
                >
                  Copy Link
                </button>
              </div>
            </SectionCard>
          </>
        )}

        {/* Feedback */}
        {error && (
          <div
            className="rounded-[4px] px-4 py-3 text-sm"
            style={{
              backgroundColor: 'rgba(139,38,53,0.1)',
              border: '1px solid rgba(139,38,53,0.3)',
              color: '#C96070',
              fontFamily: 'var(--font-body)',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="rounded-[4px] px-4 py-3 text-sm italic"
            style={{
              backgroundColor: 'rgba(107,142,101,0.08)',
              border: '1px solid rgba(107,142,101,0.25)',
              color: '#8EAF88',
              fontFamily: 'var(--font-body)',
            }}
          >
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-brass"
            disabled={saving || isPristine}
          >
            {saving ? 'Preserving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
