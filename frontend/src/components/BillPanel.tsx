import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

interface BillOrderItem {
  _id: string
  quantity: number
  notes?: string
  menuItem: { name: string; price: number } | null
}

interface BillOrder {
  _id: string
  createdAt: string
  tableNumber?: string
  notes?: string
  items: BillOrderItem[]
}

interface Props {
  restaurantId: string
  open: boolean
  onClose: () => void
}

export default function BillPanel({
  restaurantId,
  open,
  onClose,
  currencySymbol = '$',
  tableNumber,
}: Props & { currencySymbol?: string; tableNumber?: string }) {
  const [orders, setOrders] = useState<BillOrder[]>([])
  const [splitCount, setSplitCount] = useState(1)
  const [callingWaiter, setCallingWaiter] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)
  const [callSuccess, setCallSuccess] = useState(false)
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [callHandled, setCallHandled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, setMergedTables] = useState<string[] | null>(null)
  const callInFlightRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let tablesToInclude: string[] | null = null
        if (tableNumber) {
          try {
            const mergeRes = await fetch(
              `${API_BASE}/api/restaurants/${restaurantId}/merged-tables?tableNumber=${encodeURIComponent(tableNumber)}`
            )
            const mergeData = (await mergeRes.json()) as { merged: { tables: string[] } | null; message?: string }
            if (mergeRes.ok && mergeData.merged?.tables?.length) {
              tablesToInclude = mergeData.merged.tables
              setMergedTables(mergeData.merged.tables)
            } else {
              tablesToInclude = [tableNumber]
              setMergedTables([tableNumber])
            }
          } catch {
            tablesToInclude = [tableNumber]
            setMergedTables([tableNumber])
          }
        } else {
          setMergedTables(null)
        }

        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/orders`)
        const data = (await res.json()) as (BillOrder & { status?: string })[] & { message?: string }
        if (!res.ok) throw new Error(data.message ?? 'Failed to load bill')

        const filtered = data.filter((order) => {
          const orderTable = order.tableNumber
          if (tablesToInclude && tablesToInclude.length > 0) {
            return orderTable ? tablesToInclude.includes(orderTable) : false
          }
          return !orderTable
        })
        setOrders(filtered)
      } catch (err) {
        setLoadError((err as Error).message)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [open, restaurantId, tableNumber])

  useEffect(() => {
    if (!open) return
    setCallError(null)
    setCallSuccess(false)
    setActiveCallId(null)
    setCallHandled(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const loadExistingCall = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`)
        const data = (await res.json()) as { _id: string; tableNumber?: string; status: 'open' | 'handled' }[]
        if (!res.ok) return
        const latestOrderTable = orders.length > 0 ? orders[orders.length - 1]?.tableNumber : undefined
        const targetTable = latestOrderTable ?? tableNumber
        const existing = data.find((call) => targetTable ? call.tableNumber === targetTable : !call.tableNumber)
        if (existing) {
          setActiveCallId(existing._id)
          setCallSuccess(true)
          setCallHandled(false)
        }
      } catch {
        // ignore
      }
    }
    void loadExistingCall()
  }, [open, restaurantId, orders])

  useEffect(() => {
    if (!open) return
    socket = io(API_BASE, { transports: ['websocket'] })
    socket.emit('join-restaurant', restaurantId)
    socket.on('waiter:call:handled', (payload: { callId: string }) => {
      setActiveCallId((current) => {
        if (current && current === payload.callId) {
          setCallHandled(true)
          setCallSuccess(false)
          return null
        }
        return current
      })
    })
    return () => {
      socket?.off('waiter:call:handled')
      socket?.disconnect()
      socket = null
    }
  }, [open, restaurantId])

  const totalBillAmount = orders.reduce((sum, order) => {
    return sum + order.items.reduce((s, item) => s + (item.menuItem?.price ?? 0) * item.quantity, 0)
  }, 0)
  const perPersonAmount = totalBillAmount / (splitCount || 1)
  const latestTableNumber = orders.length > 0 ? orders[orders.length - 1]?.tableNumber : undefined
  const effectiveTableNumber = latestTableNumber ?? tableNumber

  const callWaiter = async () => {
    if (callInFlightRef.current || activeCallId) return
    callInFlightRef.current = true
    setCallingWaiter(true)
    setCallError(null)
    setCallSuccess(false)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: effectiveTableNumber }),
      })
      const data = (await res.json()) as { _id?: string; message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Failed to call waiter')
      if (data._id) setActiveCallId(data._id)
      setCallSuccess(true)
      setCallHandled(false)
    } catch (err) {
      setCallError((err as Error).message)
    } finally {
      setCallingWaiter(false)
      callInFlightRef.current = false
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:mx-auto sm:max-w-md rounded-[4px_4px_0_0] sm:rounded-[4px]"
        style={{
          backgroundColor: '#251E19',
          border: '1px solid #4A3F35',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #4A3F35' }}
        >
          <div>
            <span className="overline-volume" style={{ marginBottom: '0.25rem' }}>Account</span>
            <h2
              className="text-xl"
              style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
            >
              Your Bill
            </h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.55rem' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Orders */}
        <div className="max-h-64 overflow-y-auto px-6 py-4 space-y-3" style={{ borderBottom: '1px solid #4A3F35' }}>
          {loading && (
            <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              Retrieving your account…
            </p>
          )}
          {loadError && !loading && (
            <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: '#C96070' }}>
              {loadError}
            </p>
          )}
          {orders.length === 0 && !loading && (
            <p className="text-xs italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              No orders placed yet. Once you send an order, it will appear here.
            </p>
          )}
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-[4px] p-4"
              style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] tracking-[0.15em] uppercase"
                  style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
                >
                  Order #{order._id.slice(-5)}
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'var(--font-display)', color: '#4A3F35', letterSpacing: '0.05em' }}
                >
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {order.tableNumber && (
                <p className="mb-2 text-[11px]" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                  Table <span style={{ color: '#E8DFD4' }}>{order.tableNumber}</span>
                </p>
              )}
              <ul className="space-y-1 mb-2">
                {order.items.map((item) => (
                  <li key={item._id} className="flex justify-between gap-2">
                    <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                      {item.quantity} × {item.menuItem?.name ?? 'Unknown item'}
                    </span>
                    <span className="text-xs" style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.03em' }}>
                      {currencySymbol}{((item.menuItem?.price ?? 0) * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="mb-2 text-[11px] italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
                  {order.notes}
                </p>
              )}
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid #4A3F35' }}
              >
                <span className="text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-display)', color: '#4A3F35' }}>
                  Subtotal
                </span>
                <span
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
                >
                  {currencySymbol}
                  {order.items.reduce((sum, item) => sum + (item.menuItem?.price ?? 0) * item.quantity, 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total + split */}
        {orders.length > 0 && (
          <div className="px-6 py-4 space-y-4" style={{ borderBottom: '1px solid #4A3F35' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}>
                Bill Total
              </span>
              <span className="text-xl" style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}>
                {currencySymbol}{totalBillAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="label-academia" htmlFor="split-count">Split Between</label>
                <input
                  id="split-count"
                  type="number"
                  min={1}
                  className="input-academia"
                  style={{ height: '2.75rem', fontSize: '14px' }}
                  value={splitCount}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setSplitCount(!value || value < 1 ? 1 : Math.floor(value))
                  }}
                />
                <p className="text-[10px]" style={{ fontFamily: 'var(--font-display)', color: '#4A3F35', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  guests
                </p>
              </div>
              <div
                className="flex-1 rounded-[4px] px-4 py-3 text-center"
                style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
              >
                <div className="text-[10px] tracking-[0.15em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}>
                  Per Person
                </div>
                <div className="text-lg" style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}>
                  {currencySymbol}{perPersonAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call waiter */}
        <div className="px-6 py-4 space-y-2">
          <button
            type="button"
            className={`w-full ${activeCallId ? 'btn-outline' : 'btn-brass'}`}
            style={{ height: '3rem' }}
            disabled={callingWaiter || Boolean(activeCallId)}
            onClick={() => void callWaiter()}
          >
            {callingWaiter ? 'Summoning…' : activeCallId ? 'Waiter Requested' : 'Call a Waiter'}
          </button>
          {callError && (
            <p className="text-xs text-center" style={{ fontFamily: 'var(--font-body)', color: '#C96070' }}>
              {callError}
            </p>
          )}
          {callSuccess && !callHandled && (
            <p className="text-xs text-center italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              A member of staff has been notified{effectiveTableNumber ? ` for table ${effectiveTableNumber}` : ''}.
            </p>
          )}
          {callHandled && !activeCallId && (
            <p className="text-xs text-center italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
              Your request was attended to. You may call again if needed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
