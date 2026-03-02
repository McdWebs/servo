export interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  allergens: string[]
  tags: string[]
  position?: number
  imageUrl?: string
  available?: boolean
  /**
   * Optional daily time window in restaurant local time (HH:mm, 24h).
   * If both are set, the item is only visible/orderable between these times.
   */
  availableFrom?: string
  availableUntil?: string
}

export interface SuggestedItem extends MenuItem {
  quantity: number
}

export interface MenuCategory {
  _id: string
  name: string
  items: MenuItem[]
  position?: number
}

export interface Restaurant {
  _id: string
  name: string
  slug: string
  currency?: string
  address?: string
  phone?: string
  contactEmail?: string
  description?: string
  restaurantType?: string
  timezone?: string
  openingHoursNote?: string
  taxRatePercent?: number
  serviceChargePercent?: number
  allowOrders?: boolean
  orderLeadTimeMinutes?: number
  aiInstructions?: string
  isSuspended?: boolean
  printerEnabled?: boolean
  printerName?: string
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

