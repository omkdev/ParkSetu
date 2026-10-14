export type Role = 'DRIVER' | 'OWNER' | 'ADMIN'
export type VehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER'
export type BookingStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  createdAt: string
}

export interface Counts {
  TWO_WHEELER: number
  FOUR_WHEELER: number
}

export interface Lot {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  twoWheelerRate: number
  fourWheelerRate: number
  isActive: boolean
  totalSlots?: Counts
  availableSlots?: Counts
  slotCount?: number
  bookingCount?: number
}

export interface Slot {
  id: string
  label: string
  vehicleType: VehicleType
  available: boolean | null
}

export interface LotDetail extends Lot {
  slots: Slot[]
}

export interface Booking {
  id: string
  vehicleNumber: string
  vehicleType: VehicleType
  startTime: string
  endTime: string
  totalAmount: number
  status: BookingStatus
  lot?: { id: string; name: string; address: string; city: string }
  slot?: { label: string }
  user?: { id: string; name: string; phone: string | null }
}

export interface Stats {
  lots: number
  slots: number
  bookings: number
  users?: number
  revenue: number
  bookingsByStatus: Partial<Record<BookingStatus, number>>
  daily: { date: string; bookings: number; revenue: number }[]
}

export const vehicleLabel: Record<VehicleType, string> = {
  TWO_WHEELER: 'Two-wheeler',
  FOUR_WHEELER: 'Four-wheeler',
}
