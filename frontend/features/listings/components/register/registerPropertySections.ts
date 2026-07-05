export type RegisterPropertyFormSlice = {
  owner_name: string
  contact_phone: string
  address: string
  city: string
  postal_code: string
  latitude: number | null
  longitude: number | null
  type: string
  size_sqm: string
  bedrooms: string
  price_daily: string
  price_weekly: string
  price_monthly_short: string
  price_monthly_long: string
  parking_info: string
  max_occupants: string
}

const req = (s: string | undefined | null) => String(s ?? '').trim().length > 0

export function isRegisterContactComplete(formData: RegisterPropertyFormSlice): boolean {
  return (
    req(formData.owner_name) &&
    req(formData.contact_phone) &&
    req(formData.address) &&
    req(formData.city) &&
    req(formData.postal_code) &&
    formData.latitude != null &&
    formData.longitude != null &&
    !Number.isNaN(Number(formData.latitude))
  )
}

export function isRegisterDetailsComplete(formData: RegisterPropertyFormSlice): boolean {
  const sizeSqmCheck = parseFloat(String(formData.size_sqm)) || 0
  const bedroomsCheck = parseInt(String(formData.bedrooms), 10)
  return sizeSqmCheck > 0 && !Number.isNaN(bedroomsCheck) && bedroomsCheck >= 0
}

export function isRegisterPriceComplete(formData: RegisterPropertyFormSlice): boolean {
  const priceMinSum =
    (parseFloat(String(formData.price_daily)) || 0) +
    (parseFloat(String(formData.price_weekly)) || 0) +
    (parseFloat(String(formData.price_monthly_short)) || 0) +
    (parseFloat(String(formData.price_monthly_long)) || 0)
  const maxOccCheck = parseInt(String(formData.max_occupants), 10)
  return priceMinSum > 0 && maxOccCheck >= 1 && req(formData.parking_info)
}
