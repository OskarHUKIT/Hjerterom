import FinnInboxClient from './FinnInboxClient'
import FinnMobileOnlyGate from '../components/FinnMobileOnlyGate'

export default function FinnInboxPage() {
  return (
    <FinnMobileOnlyGate desktopRedirect="/finn/mine">
      <FinnInboxClient />
    </FinnMobileOnlyGate>
  )
}
