import { useEffect, useRef, useState } from 'react'
import { useCart } from './CartContext'
import type { SuggestedItem } from './types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: SuggestedItem[]
}

interface Props {
  restaurantId: string
  tableKey?: string
  open: boolean
  onClose: () => void
  currencySymbol: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export default function ChatPanel({ restaurantId, tableKey, open, onClose, currencySymbol }: Props) {
  const { items, addItem } = useCart()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  if (!open) return null

  const startNewChat = () => {
    setMessages([])
    try {
      window.localStorage.removeItem(`ai-waiter:chat:${restaurantId}:${tableKey ?? 'default'}`)
    } catch {
      // ignore
    }
  }

  const cartSummary =
    items.length === 0
      ? undefined
      : items.map((item) => `${item.quantity} x ${item.name} (${currencySymbol}${item.price.toFixed(2)})`).join(', ')

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, messages: [...messages, userMessage], cartSummary }),
      })
      const data = (await res.json()) as { reply?: string; suggestions?: SuggestedItem[]; message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Chat failed')
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply!, suggestions: data.suggestions }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong while contacting the assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4"
    >
      <div
        className="flex w-full max-w-md max-h-[60vh] flex-col overflow-hidden rounded-[4px] shadow-2xl"
        style={{
          backgroundColor: '#251E19',
          border: '1px solid #4A3F35',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-t-[4px]"
          style={{
            backgroundColor: '#1C1714',
            borderBottom: '1px solid #4A3F35',
          }}
        >
          <div>
            <span className="overline-volume" style={{ marginBottom: '0.125rem' }}>AI Sommelier</span>
            <h2 className="text-base" style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}>
              Ask Before Ordering
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.55rem' }}
              onClick={startNewChat}
            >
              New Chat
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.55rem' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3" ref={listRef}>
          {messages.length === 0 && (
            <p
              className="text-xs italic"
              style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
            >
              Try: &ldquo;What&rsquo;s vegan?&rdquo; or &ldquo;Any spicy mains without nuts?&rdquo;
            </p>
          )}
          <div className="space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-[4px] px-3 py-2 text-xs leading-relaxed"
                    style={
                      m.role === 'user'
                        ? {
                            backgroundColor: 'rgba(201,169,98,0.15)',
                            color: '#E8DFD4',
                            border: '1px solid rgba(201,169,98,0.25)',
                            fontFamily: 'var(--font-body)',
                          }
                        : {
                            backgroundColor: '#1C1714',
                            color: '#E8DFD4',
                            border: '1px solid #4A3F35',
                            fontFamily: 'var(--font-body)',
                          }
                    }
                  >
                    {m.role === 'assistant'
                      ? m.content.split('\n').map((line, i) => (
                          <p key={i} className={i === 0 ? 'mb-1' : 'text-[11px] last:mb-0'} style={{ color: i === 0 ? '#E8DFD4' : '#9C8B7A' }}>
                            {line}
                          </p>
                        ))
                      : m.content}
                  </div>
                </div>
                {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-3">
                    {m.suggestions.map((s) => {
                      const inCart = items.some((i) => i.menuItemId === s._id)
                      return (
                        <button
                          key={s._id}
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-all duration-200"
                          style={{
                            fontFamily: 'var(--font-display)',
                            color: inCart ? '#1C1714' : '#C9A962',
                            borderColor: inCart ? 'transparent' : 'rgba(201,169,98,0.3)',
                            background: inCart
                              ? 'linear-gradient(180deg, #D4B872 0%, #C9A962 50%, #B8953F 100%)'
                              : 'rgba(201,169,98,0.06)',
                          }}
                          onClick={() => addItem(s, s.quantity)}
                        >
                          <span>{s.name}</span>
                          <span className="opacity-70">{inCart ? '✓' : `×${s.quantity} · ${currencySymbol}${s.price.toFixed(2)}`}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-1 rounded-[4px] px-2.5 py-1.5"
                  style={{ backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
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
        </div>

        {/* Input area */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid #4A3F35' }}>
          {/* Quick prompts */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {['Vegan options', 'No nuts', 'Spicy dishes'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-[4px] border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase transition-colors duration-150"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: '#9C8B7A',
                  borderColor: '#4A3F35',
                  backgroundColor: 'transparent',
                }}
                onClick={() => setInput(
                  prompt === 'Vegan options' ? 'Show me vegan options' :
                  prompt === 'No nuts' ? 'No nuts, what do you recommend?' :
                  'Spicy dishes for two?'
                )}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A962'; e.currentTarget.style.borderColor = 'rgba(201,169,98,0.35)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9C8B7A'; e.currentTarget.style.borderColor = '#4A3F35' }}
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-[4px] border px-3 py-2 text-xs outline-none transition-colors duration-150"
              style={{
                backgroundColor: '#1C1714',
                borderColor: '#4A3F35',
                color: '#E8DFD4',
                fontFamily: 'var(--font-body)',
                fontStyle: 'italic',
              }}
              placeholder="Ask about the menu…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A962' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#4A3F35' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void sendMessage() }
              }}
            />
            <button
              type="button"
              className="btn-brass btn-brass-sm"
              style={{ height: '2.25rem', padding: '0 1rem', fontSize: '0.55rem' }}
              disabled={loading}
              onClick={() => void sendMessage()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
