import { useState, useRef, useEffect } from 'react'
import { useCart } from './CartContext'
import type { SuggestedItem } from './types'
import emptyCartIllustration from '../assets/empty-cart-illustration.png'

interface Props {
  open: boolean
  onClose: () => void
  onConfirmOrder: () => void
  restaurantId: string
  currencySymbol: string
}

interface CartChatMessage {
  role: 'user' | 'assistant'
  content: string
  suggestions?: SuggestedItem[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export default function CartDrawer({
  open,
  onClose,
  onConfirmOrder,
  restaurantId,
  currencySymbol,
}: Props) {
  const { items, totalPrice, updateItem, removeItem, addItem } = useCart()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<CartChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(`ai-waiter:cart-chat:${restaurantId}`)
      if (!stored) return []
      const parsed = JSON.parse(stored) as CartChatMessage[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      setChatOpen(false)
      setChatInput('')
      setChatLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight
    }
  }, [chatMessages, chatOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const original = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `ai-waiter:cart-chat:${restaurantId}`,
        JSON.stringify(chatMessages)
      )
    } catch {
      // ignore persistence errors
    }
  }, [chatMessages, restaurantId])

  const sendCartMessage = async () => {
    if (!chatInput.trim()) return
    const userMessage: CartChatMessage = { role: 'user', content: chatInput.trim() }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)
    try {
      const summary =
        items.length === 0
          ? undefined
          : items.map((i) => `${i.quantity} x ${i.name} (${currencySymbol}${i.price.toFixed(2)})`).join(', ')

      const apiMessages: CartChatMessage[] = [
        ...(chatMessages.length === 0
          ? [{
              role: 'user',
              content:
                'You are helping me adjust my current order in the cart. ' +
                'Explain clearly what you recommend to ADD or SWAP in simple, short sentences, ' +
                'like: "Add X to your order" or "Swap Y for Z". I will confirm by tapping buttons.',
            } satisfies CartChatMessage]
          : []),
        ...chatMessages,
        userMessage,
      ]

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, messages: apiMessages, cartSummary: summary }),
      })
      const data = (await res.json()) as { reply?: string; suggestions?: SuggestedItem[]; message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Chat failed')
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply!, suggestions: data.suggestions }])
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong while contacting the assistant.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-end transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full max-w-md flex-col shadow-2xl transition-transform duration-300 pointer-events-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: '#251E19',
          borderLeft: '1px solid #4A3F35',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #4A3F35' }}
        >
          <div>
            <span className="overline-volume" style={{ marginBottom: '0.25rem' }}>Your Selection</span>
            <h2 className="text-xl" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>
              Order Review
            </h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.6rem' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div
              className="flex h-full flex-col items-center justify-center gap-4 rounded-[4px] border border-dashed px-6 py-8 text-center"
              style={{ borderColor: '#4A3F35' }}
            >
              <div className="h-24 w-32 opacity-30">
                <img src={emptyCartIllustration} alt="" className="h-full w-full object-contain" aria-hidden="true" />
              </div>
              <p
                className="text-sm"
                style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
              >
                Your table is still empty
              </p>
              <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A', fontStyle: 'italic' }}>
                Browse the menu and tap <em>Add</em> to begin your order.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="rounded-[4px] p-3"
                  style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm truncate"
                        style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
                      >
                        {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                        <span className="ml-1.5" style={{ color: '#4A3F35' }}>
                          ({item.quantity} × {currencySymbol}{item.price.toFixed(2)})
                        </span>
                      </div>
                      {item.notes && (
                        <div
                          className="mt-1 text-xs italic"
                          style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                        >
                          {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div
                        className="flex items-center gap-0 rounded-[4px] overflow-hidden"
                        style={{ border: '1px solid #4A3F35' }}
                      >
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center text-xs transition-colors duration-150"
                          style={{ color: '#C9A962', backgroundColor: '#251E19' }}
                          onClick={() => updateItem(item.menuItemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span
                          className="flex h-7 w-7 items-center justify-center border-x text-xs"
                          style={{
                            fontFamily: 'var(--font-display)',
                            color: '#E8DFD4',
                            borderColor: '#4A3F35',
                            backgroundColor: '#1C1714',
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center text-xs transition-colors duration-150"
                          style={{ color: '#C9A962', backgroundColor: '#251E19' }}
                          onClick={() => updateItem(item.menuItemId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-[10px] tracking-[0.1em] uppercase transition-colors duration-150"
                        style={{ fontFamily: 'var(--font-display)', color: '#4A3F35' }}
                        onClick={() => removeItem(item.menuItemId)}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#8B2635' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#4A3F35' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid #4A3F35' }}>
          {/* Total */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-xs tracking-[0.15em] uppercase"
              style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
            >
              Total
            </span>
            <span
              className="text-lg"
              style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
            >
              {currencySymbol}{totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-2">
            <button
              type="button"
              className="btn-outline w-full"
              style={{ height: '2.5rem', fontSize: '0.6rem' }}
              onClick={() => setChatOpen((o) => !o)}
            >
              {chatOpen ? 'Hide Assistant' : 'Ask the Assistant'}
            </button>
            <button
              type="button"
              className="btn-brass w-full"
              style={{ height: '2.75rem' }}
              disabled={items.length === 0}
              onClick={onConfirmOrder}
            >
              Confirm Order
            </button>
          </div>

          {/* In-cart chat */}
          {chatOpen && (
            <div
              className="mt-3 rounded-[4px] p-3"
              style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
            >
              <div
                ref={chatListRef}
                className="mb-2 max-h-32 space-y-1.5 overflow-y-auto pr-1"
              >
                {chatMessages.length === 0 && (
                  <p
                    className="text-xs italic"
                    style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                  >
                    Ask about allergens, swap a dish, or get a recommendation before you confirm.
                  </p>
                )}
                {chatMessages.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[82%] rounded-[4px] px-3 py-2 text-xs leading-relaxed"
                        style={
                          m.role === 'user'
                            ? { backgroundColor: 'rgba(201,169,98,0.15)', color: '#E8DFD4', border: '1px solid rgba(201,169,98,0.25)' }
                            : { backgroundColor: '#251E19', color: '#E8DFD4', border: '1px solid #4A3F35' }
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                    {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-3">
                        {m.suggestions.map((s) => (
                          <button
                            key={s._id}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-150"
                            style={{
                              fontFamily: 'var(--font-display)',
                              color: '#C9A962',
                              borderColor: 'rgba(201,169,98,0.3)',
                              backgroundColor: 'rgba(201,169,98,0.06)',
                            }}
                            onClick={() => addItem(s, s.quantity)}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-1 rounded-[4px] px-2.5 py-1.5"
                      style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}
                    >
                      <span className="sr-only">Assistant is thinking</span>
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="inline-block h-1 w-1 rounded-full animate-bounce"
                          style={{ backgroundColor: '#C9A962', animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="flex-1 rounded-[4px] border px-3 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: '#251E19',
                    borderColor: '#4A3F35',
                    color: '#E8DFD4',
                    fontFamily: 'var(--font-body)',
                  }}
                  placeholder="Ask something about this order…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void sendCartMessage() }
                  }}
                />
                <button
                  type="button"
                  className="btn-brass btn-brass-sm"
                  style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.55rem' }}
                  disabled={chatLoading}
                  onClick={() => void sendCartMessage()}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
