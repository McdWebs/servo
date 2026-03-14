import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'

interface FeedbackItem {
  _id: string
  message: string
  type: 'feedback' | 'bug'
  status: 'new' | 'read' | 'replied'
  adminReply?: string
  adminRepliedAt?: string
  createdAt: string
}

export default function OwnerFeedbackPage() {
  const { restaurant, token } = useAuth()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'feedback' | 'bug'>('feedback')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchFeedback = useCallback(async () => {
    if (!restaurant?._id || !token) return
    setLoading(true)
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>(
        `/api/restaurants/${restaurant._id}/feedback`,
        { token }
      )
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [restaurant?._id, token])

  useEffect(() => { fetchFeedback() }, [fetchFeedback])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!restaurant?._id || !token || !message.trim()) return
    setSending(true)
    setError(null)
    setSuccess(false)
    try {
      await apiFetch(`/api/restaurants/${restaurant._id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ type, message: message.trim() }),
        token,
      })
      setSuccess(true)
      setMessage('')
      fetchFeedback()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const statusLabel = (status: FeedbackItem['status']) => {
    if (status === 'replied') return 'Replied'
    if (status === 'read') return 'Seen'
    return 'Pending'
  }

  const statusStyle = (status: FeedbackItem['status']): React.CSSProperties => {
    if (status === 'replied') return { backgroundColor: 'rgba(107,142,101,0.12)', color: '#8EAF88', borderColor: 'rgba(107,142,101,0.3)' }
    if (status === 'read') return { backgroundColor: 'rgba(201,169,98,0.08)', color: '#C9A962', borderColor: 'rgba(201,169,98,0.25)' }
    return { backgroundColor: 'rgba(74,63,53,0.3)', color: '#9C8B7A', borderColor: '#4A3F35' }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <span className="overline-volume">Correspondence</span>
        <h1
          className="text-3xl"
          style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
        >
          Feedback & Reports
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
        >
          Send feedback or report an issue. The platform admin can see your messages and reply here.
        </p>
      </div>

      {/* Compose form */}
      <section
        className="relative rounded-[4px] p-6 flourish-sm"
        style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}
      >
        <span className="overline-volume">New Message</span>
        <h2
          className="text-xl mb-5"
          style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
        >
          Send a Dispatch
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <span className="label-academia">Message Type</span>
            <div className="flex gap-3">
              {(['feedback', 'bug'] as const).map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="feedbackType"
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  <div
                    className="flex items-center gap-2 rounded-[4px] border px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all duration-150 cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-display)',
                      ...(type === t
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
                    onClick={() => setType(t)}
                  >
                    {t === 'feedback' ? 'Feedback' : 'Bug Report'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="feedback-message" className="label-academia">
              Your Message
            </label>
            <textarea
              id="feedback-message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback or the issue you encountered…"
              className="input-academia"
              style={{ minHeight: '7rem', fontSize: '14px' }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: '#C96070' }}>
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#8EAF88' }}>
              Your message has been received. Thank you.
            </p>
          )}

          <button
            type="submit"
            className="btn-brass btn-brass-sm"
            disabled={sending || !message.trim()}
          >
            {sending ? 'Sending…' : 'Send Dispatch'}
          </button>
        </form>
      </section>

      <div className="divider-ornate" aria-hidden="true" />

      {/* History */}
      <section>
        <span className="overline-volume">Correspondence History</span>
        <h2
          className="text-xl mb-4"
          style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
        >
          Previous Messages
        </h2>

        {loading ? (
          <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            Loading correspondence…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm italic" style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}>
            No messages sent yet. Use the form above to begin.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item._id}
                className="rounded-[4px] p-5"
                style={{ backgroundColor: '#251E19', border: '1px solid #4A3F35' }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="rounded-[2px] px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase"
                    style={{
                      fontFamily: 'var(--font-display)',
                      backgroundColor: item.type === 'bug' ? 'rgba(139,38,53,0.12)' : 'rgba(74,63,53,0.4)',
                      color: item.type === 'bug' ? '#C96070' : '#9C8B7A',
                      border: `1px solid ${item.type === 'bug' ? 'rgba(139,38,53,0.3)' : '#4A3F35'}`,
                    }}
                  >
                    {item.type === 'bug' ? 'Bug' : 'Feedback'}
                  </span>
                  <span
                    className="rounded-[2px] px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase"
                    style={{ fontFamily: 'var(--font-display)', border: '1px solid', ...statusStyle(item.status ?? 'new') }}
                  >
                    {statusLabel(item.status ?? 'new')}
                  </span>
                  <span
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-body)', color: '#4A3F35', fontStyle: 'italic' }}
                  >
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                >
                  {item.message}
                </p>

                {(item.status ?? 'new') === 'replied' && item.adminReply && (
                  <div
                    className="mt-4 rounded-[4px] p-4"
                    style={{
                      backgroundColor: 'rgba(107,142,101,0.06)',
                      border: '1px solid rgba(107,142,101,0.25)',
                    }}
                  >
                    <p
                      className="text-[10px] tracking-[0.15em] uppercase mb-2"
                      style={{ fontFamily: 'var(--font-display)', color: '#8EAF88' }}
                    >
                      Reply from Support
                    </p>
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                    >
                      {item.adminReply}
                    </p>
                    {item.adminRepliedAt && (
                      <p
                        className="mt-2 text-xs italic"
                        style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}
                      >
                        {new Date(item.adminRepliedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
