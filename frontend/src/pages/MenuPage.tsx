import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import { CartProvider } from '../components/CartContext'
import type { MenuCategory, Restaurant } from '../components/types'
import MenuItemCard from '../components/MenuItemCard'
import CartSummary from '../components/CartSummary'
import ChatPanel from '../components/ChatPanel'
import OrderConfirmationModal from '../components/OrderConfirmationModal'
import CartDrawer from '../components/CartDrawer'
import BillPanel from '../components/BillPanel'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

type OrderStatus = 'new' | 'preparing' | 'ready'

interface MenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
}

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'ILS': return '₪'
    case 'USD':
    default:    return '$'
  }
}

function MenuPageInner() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<MenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [itemDetailOpen, setItemDetailOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | string>('all')
  const tableFromUrl = searchParams.get('table') ?? undefined
  const tableKey = tableFromUrl ?? 'default'
  const latestOrderIdRef = useRef<string | null>(null)
  const [latestOrderStatus, setLatestOrderStatus] = useState<OrderStatus | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${slug}/menu`)
        const json = (await res.json()) as MenuResponse & { message?: string }
        if (!res.ok) throw new Error(json.message ?? 'Failed to load menu')
        setData(json)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug])

  useEffect(() => {
    const loadLatestOrderStatus = async () => {
      if (!data?.restaurant?._id || !tableFromUrl) {
        latestOrderIdRef.current = null
        setLatestOrderStatus(null)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${data.restaurant._id}/orders`)
        const orders = (await res.json()) as { _id: string; status: OrderStatus; tableNumber?: string }[]
        if (!res.ok) return
        const forTable = orders.filter((o) => o.tableNumber === tableFromUrl)
        if (forTable.length === 0) {
          latestOrderIdRef.current = null
          setLatestOrderStatus(null)
          return
        }
        const latest = forTable[0]
        latestOrderIdRef.current = latest._id
        setLatestOrderStatus(latest.status)
      } catch {
        // ignore status loading errors on the guest side
      }
    }
    void loadLatestOrderStatus()
  }, [data?.restaurant?._id, tableFromUrl])

  useEffect(() => {
    if (!data?.restaurant?._id) return
    socket = io(API_BASE, { transports: ['websocket'] })
    socket.emit('join-restaurant', data.restaurant._id)

    socket.on('order:new', (order: { _id: string; status: OrderStatus; tableNumber?: string }) => {
      if (tableFromUrl && order.tableNumber === tableFromUrl) {
        latestOrderIdRef.current = order._id
        setLatestOrderStatus(order.status)
      }
    })

    socket.on('order:updated', (payload: { orderId: string; status: OrderStatus }) => {
      if (latestOrderIdRef.current && latestOrderIdRef.current === payload.orderId) {
        setLatestOrderStatus(payload.status)
      }
    })

    return () => {
      socket?.off('order:new')
      socket?.off('order:updated')
      socket?.disconnect()
      socket = null
    }
  }, [data?.restaurant?._id, tableFromUrl])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1C1714' }}>
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
          <div
            className="h-7 w-28 animate-pulse rounded-[4px]"
            style={{ backgroundColor: '#3D332B' }}
          />
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-[4px]"
                style={{ backgroundColor: '#251E19' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1C1714' }}>
        <div className="text-center">
          <h1
            className="text-2xl mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
          >
            Something went wrong
          </h1>
          <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            {error ?? 'Menu not found.'}
          </p>
        </div>
      </div>
    )
  }

  const currencySymbol = getCurrencySymbol(data.restaurant.currency)

  const query = searchQuery.trim().toLowerCase()
  const searchedCategories = query
    ? data.categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query)) ||
              item.tags?.some((t) => t.toLowerCase().includes(query))
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : data.categories

  const filteredCategories =
    selectedCategoryId === 'all'
      ? searchedCategories
      : searchedCategories.filter((cat) => cat._id === selectedCategoryId)

  const hasMultipleCategories = data.categories.length > 1

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#1C1714', color: '#E8DFD4' }}>
      <div className="mx-auto max-w-md px-4 pb-4 pt-8">

        {/* Header */}
        <header className="relative mb-6 text-center">
          {/* Logo */}
          {data.restaurant.logoUrl && (
            <div className="flex justify-center mb-4">
              <div
                className="h-20 w-20 overflow-hidden"
                style={{
                  border: '1px solid #4A3F35',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  borderRadius: '40% 40% 0 0 / 20% 20% 0 0',
                }}
              >
                <img
                  src={data.restaurant.logoUrl}
                  alt={`${data.restaurant.name} logo`}
                  className="h-full w-full object-cover img-sepia"
                  style={{ filter: 'sepia(0)' }}
                />
              </div>
            </div>
          )}


          {/* Order status banners */}
          {latestOrderStatus === 'new' && (
            <p
              className="mt-3 rounded-[4px] px-3 py-2 text-xs tracking-[0.1em] uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                backgroundColor: 'rgba(201,169,98,0.08)',
                color: '#C9A962',
                border: '1px solid rgba(201,169,98,0.2)',
              }}
            >
              Your order has been sent to the kitchen
            </p>
          )}
          {latestOrderStatus === 'preparing' && (
            <p
              className="mt-3 rounded-[4px] px-3 py-2 text-xs tracking-[0.1em] uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                backgroundColor: 'rgba(139,38,53,0.08)',
                color: '#C96070',
                border: '1px solid rgba(139,38,53,0.25)',
              }}
            >
              Your order is being prepared
            </p>
          )}
          {latestOrderStatus === 'ready' && (
            <p
              className="mt-3 rounded-[4px] px-3 py-2 text-xs tracking-[0.1em] uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                backgroundColor: 'rgba(107,142,101,0.1)',
                color: '#8EAF88',
                border: '1px solid rgba(107,142,101,0.3)',
              }}
            >
              Your order is ready
            </p>
          )}
        </header>

        {/* Ornate divider below header */}
        <div className="divider-ornate mb-6" aria-hidden="true" />

        {/* Sticky category nav */}
        <div
          className="sticky top-0 z-20 -mx-1 px-1 pb-3 pt-1"
          style={{ backgroundColor: '#1C1714' }}
        >
          {searchOpen && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <label htmlFor="menu-search" className="sr-only">Search menu</label>
                <input
                  id="menu-search"
                  type="search"
                  placeholder="Search the menu…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-academia"
                  style={{ height: '2.5rem', fontSize: '14px' }}
                />
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ height: '2.5rem', padding: '0 1rem', fontSize: '0.6rem' }}
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              >
                Close
              </button>
            </div>
          )}

          {hasMultipleCategories && (
            <nav
              className="flex gap-1.5 overflow-x-auto pb-1"
              aria-label="Menu categories"
            >
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className="flex-shrink-0 rounded-[4px] border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-display)',
                  ...(selectedCategoryId === 'all'
                    ? {
                        backgroundColor: 'rgba(201,169,98,0.12)',
                        borderColor: 'rgba(201,169,98,0.4)',
                        color: '#C9A962',
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: '#4A3F35',
                        color: '#9C8B7A',
                      }),
                }}
              >
                All
              </button>
              {data.categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat._id)}
                  className="flex-shrink-0 rounded-[4px] border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-display)',
                    ...(selectedCategoryId === cat._id
                      ? {
                          backgroundColor: 'rgba(201,169,98,0.12)',
                          borderColor: 'rgba(201,169,98,0.4)',
                          color: '#C9A962',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: '#4A3F35',
                          color: '#9C8B7A',
                        }),
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Menu content */}
        <main className="space-y-8 pb-4">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center">
              <p
                className="text-sm"
                style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A', fontStyle: 'italic' }}
              >
                No items match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          ) : (
            filteredCategories.map((cat, catIndex) => (
              <section key={cat._id} id={`cat-${cat._id}`} className="scroll-mt-24">
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="overline-volume shrink-0">
                    {toRomanNumeral(catIndex + 1)}
                  </span>
                  <h2
                    className="text-xl"
                    style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
                  >
                    {cat.name}
                  </h2>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <MenuItemCard
                      key={item._id}
                      item={item}
                      currencySymbol={currencySymbol}
                      onDetailOpen={() => setItemDetailOpen(true)}
                      onDetailClose={() => setItemDetailOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>

      {/* Bottom action bar — fixed shelf */}
      {!itemDetailOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2" style={{ backgroundColor: '#1C1714' }}>
          <div
            className="mx-auto flex w-full max-w-md items-center gap-2 rounded-[4px] px-3 py-2"
            style={{
              backgroundColor: '#251E19',
              border: '1px solid #4A3F35',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
            }}
          >
            <button
              type="button"
              className="flex-1 rounded-[4px] border px-3 py-2 text-[11px] tracking-[0.12em] uppercase transition-all duration-200"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#9C8B7A',
                borderColor: '#4A3F35',
                backgroundColor: 'transparent',
              }}
              onClick={() => {
                setCartOpen(false)
                setChatOpen((prev) => !prev)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#C9A962'
                e.currentTarget.style.borderColor = 'rgba(201,169,98,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9C8B7A'
                e.currentTarget.style.borderColor = '#4A3F35'
              }}
            >
              Ask the Waiter
            </button>
            <button
              type="button"
              className="rounded-[4px] border px-3 py-2 text-[11px] tracking-[0.12em] uppercase transition-all duration-200"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#9C8B7A',
                borderColor: '#4A3F35',
                backgroundColor: 'transparent',
              }}
              onClick={() => setBillOpen(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#C9A962'
                e.currentTarget.style.borderColor = 'rgba(201,169,98,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9C8B7A'
                e.currentTarget.style.borderColor = '#4A3F35'
              }}
            >
              View Bill
            </button>
            <div className="ml-auto">
              <CartSummary
                currencySymbol={currencySymbol}
                onOpenCart={() => {
                  setChatOpen(false)
                  setCartOpen(true)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onConfirmOrder={() => {
          setCartOpen(false)
          setConfirmOpen(true)
        }}
        restaurantId={data.restaurant._id}
        currencySymbol={currencySymbol}
      />
      <ChatPanel
        restaurantId={data.restaurant._id}
        tableKey={tableKey}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currencySymbol={currencySymbol}
      />
      {billOpen && (
        <BillPanel
          restaurantId={data.restaurant._id}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          tableNumber={tableFromUrl}
          currencySymbol={currencySymbol}
        />
      )}
      {confirmOpen && (
        <OrderConfirmationModal
          restaurantId={data.restaurant._id}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {}}
          initialTable={tableFromUrl}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  )
}

function toRomanNumeral(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  let result = ''
  let remaining = n
  for (const [value, numeral] of map) {
    while (remaining >= value) {
      result += numeral
      remaining -= value
    }
  }
  return result
}

export default function MenuPage() {
  return (
    <CartProvider>
      <MenuPageInner />
    </CartProvider>
  )
}
