import FinnHostingClient from './FinnHostingClient'
import FinnMobileOnlyGate from '../components/FinnMobileOnlyGate'

export default function FinnHostingPage() {
  return (
    <FinnMobileOnlyGate desktopRedirect="/homeowner/manage">
      <FinnHostingClient />
    </FinnMobileOnlyGate>
  )
}
