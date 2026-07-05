import FinnProfileClient from './FinnProfileClient'
import FinnMobileOnlyGate from '../components/FinnMobileOnlyGate'

export default function FinnProfilePage() {
  return (
    <FinnMobileOnlyGate desktopRedirect="/finn/mine">
      <FinnProfileClient />
    </FinnMobileOnlyGate>
  )
}
