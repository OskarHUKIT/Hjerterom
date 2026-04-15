/** Centralized TanStack Query key prefixes for AuthQuerySync invalidation. */
export const QK = {
  auth: ['auth'] as const,
  kommuneNavAccess: ['kommune'] as const,
  landlordNavGate: ['landlord'] as const,
  chatUserBootstrap: ['chat'] as const,
  headerBundle: ['header'] as const,
  notificationsList: ['notifications'] as const,
  appUserProfile: ['app'] as const,
}
