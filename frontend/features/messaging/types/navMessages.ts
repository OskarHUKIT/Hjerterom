export type ConversationRow = {
  userId: string
  serviceAreaId: string
  name: string
  areaName: string
  lastMessage: string
  lastAt: string
}

export type LandlordAreaThread = {
  serviceAreaId: string
  name: string
  lastMessage: string
  lastAt: string
}

export type LandlordEventThread = {
  eventId: string
  eventName: string
  lastMessage: string
  lastAt: string
}

export type GuestBookingThread = {
  bookingId: string
  guestLabel: string
  listingAddress: string
  lastPreview: string
  lastAt: string
  bookingStatus: string
}
