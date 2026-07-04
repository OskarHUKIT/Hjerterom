import type { TranslationKey } from '@/lib/translations'

export type NavDbColumn = { id: string; label: string }

export function getNavDbColumns(
  t: (key: TranslationKey) => string,
  isMobile: boolean
): NavDbColumn[] {
  return [
    { id: 'address', label: t('address') },
    { id: 'city', label: t('city') },
    { id: 'owner_name', label: t('owner') },
    { id: 'price_daily', label: isMobile ? t('dailyCost') : t('price') },
    { id: 'type', label: t('type') },
    { id: 'bedrooms', label: t('bedrooms') },
    { id: 'size_sqm', label: t('area') },
    { id: 'max_occupants', label: t('maxOccupants') },
    { id: 'floor_number', label: t('floor') },
    { id: 'status', label: t('status') },
  ]
}
