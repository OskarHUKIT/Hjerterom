import OpsShell from './components/OpsShell'
import './ops.css'

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return <OpsShell>{children}</OpsShell>
}
