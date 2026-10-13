import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'

export function PriceSheetManagePage() {
  return (
    <PhoneShell>
      <Header title="Gestione listino" backTo="/listino" />
    </PhoneShell>
  )
}
