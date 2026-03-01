import { Schema, model, type Document } from 'mongoose'

export interface RestaurantDocument extends Document {
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
  /** Custom instructions for the AI waiter (tone, what to emphasize, how to behave). */
  aiInstructions?: string
  /** When true, restaurant is disabled (no menu/orders); super-admin only. */
  isSuspended?: boolean
  /** When true, order printing is enabled; kitchen can print orders. */
  printerEnabled?: boolean
  /** Optional label for the receipt/kitchen printer (for owner reference). */
  printerName?: string
}

const restaurantSchema = new Schema<RestaurantDocument>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  currency: { type: String, default: 'USD' },
  address: { type: String },
  phone: { type: String },
  contactEmail: { type: String },
  description: { type: String },
  restaurantType: { type: String },
  timezone: { type: String, default: 'UTC' },
  openingHoursNote: { type: String },
  taxRatePercent: { type: Number },
  serviceChargePercent: { type: Number },
  allowOrders: { type: Boolean, default: true },
  orderLeadTimeMinutes: { type: Number, default: 15 },
  aiInstructions: { type: String },
  isSuspended: { type: Boolean, default: false },
  printerEnabled: { type: Boolean, default: false },
  printerName: { type: String, trim: true },
})

export const Restaurant = model<RestaurantDocument>('Restaurant', restaurantSchema)
