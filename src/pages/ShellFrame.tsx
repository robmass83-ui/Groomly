import { Plus } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'

const sheetAction: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left',
  padding: 0,
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  function newAppointment() {
    setOpen(false)
    const data = searchParams.get('data')
    if (pathname === '/calendario' && data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      navigate(`/appuntamenti/nuovo?data=${data}`)
    } else {
      navigate('/appuntamenti/nuovo')
    }
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell showNav onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <button type="button" onClick={newAppointment} style={sheetAction}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Nuovo appuntamento
        </button>
        <button type="button" onClick={newDog} style={sheetAction}>
          <Plus size={18} strokeWidth={2} aria-hidden />
          Nuovo cane
        </button>
      </Sheet>
    </PhoneShell>
  )
}
