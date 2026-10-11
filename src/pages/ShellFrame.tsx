import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'

const sheetAction: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--line)',
  borderRadius: 12,
  background: 'var(--surf)',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left',
  padding: '0 16px',
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const openSheet = useOpenSheet()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  function newAppointment() {
    setOpen(false)
    const data = searchParams.get('data')
    if (pathname === '/calendario' && data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      openSheet(`/appuntamenti/nuovo?data=${data}`)
    } else {
      openSheet('/appuntamenti/nuovo')
    }
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell showNav menuOpen={open} onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={newAppointment} style={sheetAction}>Appuntamento</button>
          <button type="button" onClick={newDog} style={sheetAction}>Animale</button>
        </div>
      </Sheet>
    </PhoneShell>
  )
}
