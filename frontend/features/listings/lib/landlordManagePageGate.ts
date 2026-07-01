/** Page bootstrap phases for /homeowner/manage */
export type ManagePageGate = 'init' | 'welcome' | 'ready'

/**
 * Full-screen spinner on manage page.
 *
 * IMPORTANT: Never tie spinner to `loading` alone — welcome modal uses
 * pageGate === 'welcome' while loading may still be true from bootstrap.
 */
export function shouldShowManageFullScreenSpinner(
  pageGate: ManagePageGate,
  loading: boolean,
  fetchError: string | null
): boolean {
  if (pageGate === 'init') return true
  if (pageGate === 'welcome') return false
  return pageGate === 'ready' && loading && !fetchError
}
