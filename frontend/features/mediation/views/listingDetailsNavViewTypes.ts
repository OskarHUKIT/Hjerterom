import type { ListingAvailabilityRow, ListingDetailsRecord, MediationReservationRow, NavNoteRow } from '@/app/lib/listingUiTypes'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { TranslationKey } from '@/lib/translations'
import type { useListingMediation } from '@/features/mediation/hooks/useListingMediation'

export type MediationState = ReturnType<typeof useListingMediation>

export type ListingDetailsNavViewProps = {
  listing: ListingDetailsRecord
  availability: ListingAvailabilityRow[]
  currentUser: AuthUser | null
  kommuneCanEdit: boolean
  ownerAgreementTerminated: boolean
  mediationReservation: MediationReservationRow | null
  navNotes: NavNoteRow[]
  showNavNotes: boolean
  setShowNavNotes: React.Dispatch<React.SetStateAction<boolean>>
  newNote: string
  setNewNote: React.Dispatch<React.SetStateAction<string>>
  onAddNote: (e: React.FormEvent) => void
  mediation: MediationState
  t: (key: TranslationKey) => string
}
