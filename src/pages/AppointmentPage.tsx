import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'

export function AppointmentPage() {
  return (
    <PhoneShell>
      <Header title="Nuovo appuntamento" backTo="/" />
    </PhoneShell>
  )
}
