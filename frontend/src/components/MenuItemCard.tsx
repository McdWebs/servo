import type { MenuItem } from './types'
import { useCart } from './CartContext'
import { useState } from 'react'

interface Props {
  item: MenuItem
  currencySymbol: string
  onDetailOpen?: () => void
  onDetailClose?: () => void
}

export default function MenuItemCard({ item, currencySymbol, onDetailOpen, onDetailClose }: Props) {
  const { addItem, items, updateItem } = useCart()
  const [showDetails, setShowDetails] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const openDetails = () => {
    setShowDetails(true)
    onDetailOpen?.()
  }
  const closeDetails = () => {
    setShowDetails(false)
    onDetailClose?.()
  }

  const inCart = items.find((cartItem) => cartItem.menuItemId === item._id)
  const isAvailable = item.available ?? true

  const placeholderImage = (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: '#3D332B' }}
      aria-hidden="true"
    >
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="#4A3F35"
        viewBox="0 0 24 24"
        aria-hidden="true"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )

  return (
    <>
      {/* Card row */}
      <div
        role="button"
        tabIndex={0}
        className={`group flex w-full overflow-hidden rounded-[4px] text-left transition-all duration-300 cursor-pointer ${
          isAvailable ? '' : 'opacity-50'
        }`}
        style={{
          backgroundColor: '#251E19',
          border: '1px solid #4A3F35',
        }}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openDetails()
          }
        }}
        onMouseEnter={(e) => {
          if (isAvailable) {
            e.currentTarget.style.borderColor = 'rgba(201,169,98,0.35)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#4A3F35'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* Thumbnail */}
        <div className="relative w-20 shrink-0 overflow-hidden h-[72px]" style={{ backgroundColor: '#3D332B' }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="img-sepia h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            placeholderImage
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm truncate"
              style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
            >
              {item.name}
            </h3>
            <div
              className="mt-0.5 text-xs"
              style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
            >
              {currencySymbol}{item.price.toFixed(2)}
            </div>
            {(item.tags?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[2px] px-1.5 py-0.5 text-[10px] tracking-[0.1em] uppercase"
                    style={{
                      fontFamily: 'var(--font-display)',
                      backgroundColor: 'rgba(201,169,98,0.08)',
                      color: '#9C8B7A',
                      border: '1px solid rgba(201,169,98,0.15)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Qty controls / Add button */}
          <div className="shrink-0 self-center">
            {isAvailable ? (
              inCart ? (
                <div
                  className="flex items-center gap-1 rounded-[4px] px-1.5 py-0.5"
                  style={{ backgroundColor: '#3D332B', border: '1px solid #4A3F35' }}
                >
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-[2px] text-xs transition-colors duration-150"
                    style={{ color: '#C9A962', backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      updateItem(item._id, inCart.quantity - 1)
                    }}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span
                    className="min-w-[1.25rem] text-center text-xs"
                    style={{ fontFamily: 'var(--font-display)', color: '#E8DFD4' }}
                  >
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-[2px] text-xs transition-colors duration-150"
                    style={{ color: '#C9A962', backgroundColor: '#1C1714', border: '1px solid #4A3F35' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      updateItem(item._id, inCart.quantity + 1)
                    }}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-[4px] px-3 py-1 text-[11px] tracking-[0.12em] uppercase transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'linear-gradient(180deg, #D4B872 0%, #C9A962 50%, #B8953F 100%)',
                    color: '#1C1714',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 4px rgba(0,0,0,0.3)',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.2)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    addItem(item, 1)
                  }}
                >
                  Add
                </button>
              )
            ) : (
              <span
                className="text-[10px] tracking-[0.1em] uppercase"
                style={{ fontFamily: 'var(--font-display)', color: '#4A3F35' }}
              >
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detail bottom sheet */}
      {showDetails && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={closeDetails}
        >
          <div
            className="w-full max-h-[92vh] overflow-y-auto sm:max-w-md sm:mx-auto"
            style={{
              backgroundColor: '#251E19',
              borderTop: '1px solid #4A3F35',
              borderLeft: '1px solid #4A3F35',
              borderRight: '1px solid #4A3F35',
              borderRadius: '4px 4px 0 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div
              className="relative w-full flex items-center justify-center"
              style={{ backgroundColor: '#1C1714', minHeight: '200px' }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="max-h-[55vh] max-w-full w-auto object-contain img-sepia"
                  style={{ filter: 'sepia(0)' }}
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center" style={{ backgroundColor: '#3D332B' }}>
                  <svg className="h-16 w-16" fill="none" stroke="#4A3F35" viewBox="0 0 24 24" strokeWidth={0.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors duration-150"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: '#9C8B7A',
                  backgroundColor: 'rgba(28,23,20,0.8)',
                  border: '1px solid #4A3F35',
                }}
                onClick={closeDetails}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Name + price */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-2xl"
                    style={{ fontFamily: 'var(--font-heading)', color: '#E8DFD4', fontWeight: 400 }}
                  >
                    {item.name}
                  </h2>
                  {item.description && (
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)', color: '#9C8B7A' }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
                <div
                  className="shrink-0 text-lg"
                  style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
                >
                  {currencySymbol}{item.price.toFixed(2)}
                </div>
              </div>

              {/* Allergens */}
              {item.allergens.length > 0 && (
                <div
                  className="mt-4 rounded-[4px] px-3 py-2.5 text-xs"
                  style={{
                    backgroundColor: 'rgba(201,169,98,0.06)',
                    border: '1px solid rgba(201,169,98,0.2)',
                    color: '#9C8B7A',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A962' }}>
                    Allergens:
                  </span>{' '}
                  {item.allergens.join(', ')}
                </div>
              )}

              {/* Tags */}
              {(item.tags?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[2px] px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase"
                      style={{
                        fontFamily: 'var(--font-display)',
                        backgroundColor: 'rgba(201,169,98,0.08)',
                        color: '#9C8B7A',
                        border: '1px solid rgba(201,169,98,0.2)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="divider-ornate divider-ornate-alt mt-5" aria-hidden="true" />

              {/* Qty + total */}
              <div className="flex items-center justify-between mt-5">
                <div
                  className="flex items-center gap-0 rounded-[4px] overflow-hidden"
                  style={{ border: '1px solid #4A3F35' }}
                >
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center transition-colors duration-150"
                    style={{ color: '#C9A962', backgroundColor: '#1C1714' }}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!isAvailable}
                    aria-label="Decrease quantity"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#251E19' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1C1714' }}
                  >
                    −
                  </button>
                  <span
                    className="flex h-10 w-10 items-center justify-center border-x text-sm"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: '#E8DFD4',
                      borderColor: '#4A3F35',
                      backgroundColor: '#251E19',
                    }}
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center transition-colors duration-150"
                    style={{ color: '#C9A962', backgroundColor: '#1C1714' }}
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={!isAvailable}
                    aria-label="Increase quantity"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#251E19' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1C1714' }}
                  >
                    +
                  </button>
                </div>

                <div
                  className="text-xl"
                  style={{ fontFamily: 'var(--font-display)', color: '#C9A962', letterSpacing: '0.05em' }}
                >
                  {currencySymbol}{(item.price * quantity).toFixed(2)}
                </div>
              </div>

              {/* Notes */}
              <textarea
                className="input-academia mt-4"
                style={{ minHeight: '5rem', fontSize: '14px' }}
                placeholder="A note for this dish (optional)…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {/* Add to cart */}
              <div className="mt-4 flex items-center justify-between">
                {!isAvailable && (
                  <span
                    className="text-xs tracking-[0.1em] uppercase"
                    style={{ fontFamily: 'var(--font-display)', color: '#8B2635' }}
                  >
                    Currently unavailable
                  </span>
                )}
                <button
                  type="button"
                  className="btn-brass ml-auto"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return
                    addItem(item, quantity, notes || undefined)
                    setQuantity(1)
                    setNotes('')
                    closeDetails()
                  }}
                >
                  Add to Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
