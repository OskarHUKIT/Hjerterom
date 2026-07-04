'use client'

import { useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import type { NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import type { ListingDayAvailabilityStatus } from '@/app/lib/listingAvailabilityStatusToday'

export function useNavDatabaseTranslate(isMobile: boolean, userRole: string | null | undefined) {
  const { t } = useLanguage()

  return useCallback(
    (
      id: string,
      val: unknown,
      listing?: NavDatabaseListingRow,
      statusForToday?: ListingDayAvailabilityStatus | null
    ): ReactNode => {
      if (id === 'status') {
        const s = statusForToday !== undefined ? statusForToday : val
        const label =
          s === 'Formidla'
            ? t('formidlet')
            : s === 'Utilgjengelig'
              ? t('unavailable')
              : s === 'Ikke markert'
                ? t('availabilityUnmarked')
                : t('available')
        if (isKommuneStaffRole(userRole) && isMobile) {
          const icon =
            s === 'Formidla' ? (
              <ShieldCheck size={18} style={{ color: 'var(--color-sky-blue)' }} aria-hidden />
            ) : s === 'Utilgjengelig' ? (
              <XCircle size={18} style={{ color: '#ef4444' }} aria-hidden />
            ) : s === 'Ikke markert' ? (
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px dashed var(--text-muted)' }} aria-hidden />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} aria-hidden />
            )
          return (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title={label}
              aria-label={label}
            >
              {icon}
            </span>
          )
        }
        if (s === 'Formidla') return t('formidlet')
        if (s === 'Utilgjengelig') return t('unavailable')
        if (s === 'Ikke markert') return t('availabilityUnmarked')
        return t('available')
      }
      if (!val && val !== 0) return '-'
      if (id === 'price_daily') return `${String(val)},-`
      if (id === 'address' && listing) {
        return (
          <Link
            href={`/listings/${listing.id}?view=nav`}
            style={{ color: 'var(--color-sky-blue)', fontWeight: 600, textDecoration: 'none' }}
          >
            {String(val)}
          </Link>
        )
      }
      if (id === 'owner_name' && listing) {
        return (
          <Link
            href={`/nav/users?id=${listing.owner_id}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {String(val)}
          </Link>
        )
      }
      if (id === 'type') {
        const v = String(val)
        const mapping: Record<string, string> = {
          'Short-term': t('shortTerm'),
          'Long-term': t('longTerm'),
          Apartment: t('apartment'),
          House: t('house'),
          Shared: t('shared'),
        }
        return mapping[v] || v
      }
      return val as ReactNode
    },
    [isMobile, t, userRole]
  )
}
