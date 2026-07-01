'use client'

export type { ListingDetailsNavViewProps, MediationState } from './listingDetailsNavViewTypes'
export { ListingDetailsNavNotesPanel } from './ListingDetailsNavNotesPanel'
export { ListingDetailsNavMediationPanels } from './ListingDetailsNavMediationPanels'
export { ListingDetailsNavStickySidebar } from './ListingDetailsNavStickySidebar'

import { ListingDetailsNavNotesPanel } from './ListingDetailsNavNotesPanel'
import type { ListingDetailsNavViewProps } from './listingDetailsNavViewTypes'

export default function ListingDetailsNavView(props: ListingDetailsNavViewProps) {
  return props.showNavNotes ? <ListingDetailsNavNotesPanel {...props} /> : null
}
