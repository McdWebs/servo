import { useCart } from './CartContext'
import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface Props {
  restaurantId: string
  open: boolean
  onClose: () => void
  onConfirmed: () => void
  initialTable?: string
}

export default function OrderConfirmationModal({
  restaurantId,
  open,
  onClose,
  onConfirmed,
  initialTable,
  currencySymbol = '$',
}: Props & { currencySymbol?: string }) {
  const { items, totalPrice, clear } = useCart()
  const [tableNumber, setTableNumber] = useState(initialTable ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submitOrder = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableNumber: tableNumber || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      })
      const data = (await res.json()) as { orderId?: string; message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Failed to submit order')
      clear()
      onConfirmed()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="relative w-full sm:mx-auto sm:max-w-md rounded-[4px_4px_0_0] sm:rounded-[4px]"
        style={{
          backgroundColor: '#251E19',
          border: '1px solid #4A3F35',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #4A3F35' }}
        >
          <div>
            <span className="overline-volume" style={{ marginBottom: '0.25rem' }}>Final Review</span>
            <h2
              className="text-xl"
              style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
            >
              Send to Kitchen
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

        {/* Order summary */}
        <div
          className="max-h-56 overflow-y-auto px-6 py-3 space-y-2"
          style={{ borderBottom: '1px solid #4A3F35' }}
        >
          {items.map((item) => (
            <div
              key={item.menuItemId}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm"
                  style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
                >
                  {item.quantity} × {item.name}
                </div>
                {item.notes && (
                  <div
                    className="text-xs italic mt-0.5"
                    style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                  >
                    {item.notes}
                  </div>
                )}
              </div>
              <div
                className="text-xs shrink-0"
                style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
              >
                {currencySymbol}{(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}

          {/* Total row */}
          <div
            className="flex items-center justify-between pt-2 mt-2"
            style={{ borderTop: '1px solid #4A3F35' }}
          >
            <span
              className="text-xs tracking-[0.15em] uppercase"
              style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
            >
              Total
            </span>
            <span
              className="text-base"
              style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
            >
              {currencySymbol}{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form fields */}
        <div className="px-6 py-4 space-y-3">
          {initialTable ? (
            <div
              className="w-full rounded-[4px] px-4 py-2.5 text-sm"
              style={{
                backgroundColor: '#1C1714',
                border: '1px solid #4A3F35',
                fontFamily: 'var(--font-display)',
                color: '#C9A962',
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              Table {tableNumber || initialTable}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="label-academia" htmlFor="table-number">Table Number</label>
              <input
                id="table-number"
                className="input-academia"
                style={{ height: '2.75rem', fontSize: '14px' }}
                placeholder="Table number or name (optional)"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="label-academia" htmlFor="order-notes">Notes for the Kitchen</label>
            <textarea
              id="order-notes"
              className="input-academia"
              style={{ minHeight: '4.5rem', fontSize: '14px' }}
              placeholder="Any special requests or dietary requirements…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p
              className="text-xs"
              style={{ fontFamily: 'var(--font-body)', color: '#C96070' }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn-brass w-full"
            style={{ height: '3rem' }}
            disabled={submitting}
            onClick={() => void submitOrder()}
          >
            {submitting ? 'Sending to Kitchen…' : 'Confirm & Send to Kitchen'}
          </button>
        </div>
      </div>
    </div>
  )
}
