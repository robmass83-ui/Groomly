import { useLocation, useNavigate } from 'react-router-dom'
import { Sheet } from '../components/layout/Sheet'
import { appointmentBackTarget } from '../lib/sheetRoute'

export function PersonalAppointmentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  function onClose() {
    if (location.key === 'default') navigate(appointmentBackTarget(location.search, () => false), { replace: true })
    else navigate(-1)
  }
  return (
    <Sheet open title="Appuntamento personale" onClose={onClose} closeButton>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
    </Sheet>
  )
}
