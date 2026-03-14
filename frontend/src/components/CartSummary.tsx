import { useCart } from './CartContext'

interface Props {
  onOpenCart: () => void
  currencySymbol: string
}

export default function CartSummary({ onOpenCart, currencySymbol }: Props) {
  const { totalItems, totalPrice } = useCart()

  if (totalItems === 0) return null

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-[4px] border px-3 py-2 text-[11px] tracking-[0.1em] uppercase transition-all duration-200"
      style={{
        fontFamily: 'var(--font-display)',
        background: 'linear-gradient(180deg, #D4B872 0%, #C9A962 50%, #B8953F 100%)',
        color: '#1C1714',
        borderColor: 'transparent',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)',
        textShadow: '1px 1px 1px rgba(0,0,0,0.2)',
      }}
      onClick={onOpenCart}
      aria-label={`Open cart — ${totalItems} items, ${currencySymbol}${totalPrice.toFixed(2)}`}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
        style={{
          backgroundColor: '#1C1714',
          color: '#C9A962',
          fontFamily: 'var(--font-display)',
        }}
        aria-hidden="true"
      >
        {totalItems}
      </span>
      <span>
        {currencySymbol}{totalPrice.toFixed(2)}
      </span>
    </button>
  )
}
