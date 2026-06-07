/** localStorage-basert førstegangs-intro for utleiere (per bruker-id). */

export const LANDLORD_ONBOARDING_PREFIX = {
  welcome: 'boly_landlord_welcome_v1',
  overview: 'boly_landlord_overview_intro_v1',
  mineBoliger: 'boly_landlord_mineboliger_intro_v1',
  messages: 'boly_landlord_messages_intro_v1',
  notifications: 'boly_landlord_notifications_intro_v1',
} as const

export function landlordOnboardingKey(
  prefix: (typeof LANDLORD_ONBOARDING_PREFIX)[keyof typeof LANDLORD_ONBOARDING_PREFIX],
  userId: string
): string {
  return `${prefix}_${userId}`
}
