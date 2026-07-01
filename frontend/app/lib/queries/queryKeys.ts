/** Centralized TanStack Query key prefixes for AuthQuerySync invalidation. */
export const QK = {
  /** Canonical user row; also use `authUserQueryKey` from `authUserQuery.ts`. */
  authUser: ['auth', 'user'] as const,
  auth: ['auth'] as const,
  kommuneNavAccess: ['kommune'] as const,
  landlordNavGate: ['landlord'] as const,
  chatUserBootstrap: ['chat'] as const,
  headerBundle: ['header'] as const,
  notificationsList: ['notifications'] as const,
  navDatabaseListings: ['navDatabase', 'listings'] as const,
  navDatabasePublishedEvents: ['navDatabase', 'publishedEvents'] as const,
  publishedEvents: ['events', 'published'] as const,
  eventStaffAccess: ['eventStaff', 'access'] as const,
  finnListings: ['finn', 'listings'] as const,
  appUserProfile: ['app'] as const,
}
