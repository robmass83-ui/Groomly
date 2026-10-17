import { Calendar, ChevronRight, PawPrint } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dueSoon } from '../lib/cycle'
import { fiscalNoticeVisible } from '../lib/profile'
import { Dialog } from '../components/layout/Dialog'
import { PhoneShell } from '../components/layout/PhoneShell'

const choice: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--line)',
  borderRadius: 14,
  background: 'var(--card)',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left',
  padding: '10px',
}

const iconTile: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: 12,
  background: 'var(--pri-s)',
  color: 'var(--pri)',
  flex: 'none',
}

export function ShellFrame({ fill = false, children }: { fill?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { settings, ready } = useSettings()
  const bell = dueSoon(dogs, appointments, new Date(), settings.monthlyReminder.daysBefore).length > 0
  // Prima che arrivino le impostazioni del salone i campi sono vuoti: il bollino non deve lampeggiare.
  const tax = ready && fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode)
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
    <PhoneShell fill={fill} showNav menuOpen={open} bell={bell} tax={tax} onFab={() => setOpen(true)}>
      {children}
      <Dialog open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={newAppointment} style={choice}>
            <span style={iconTile}><Calendar size={20} strokeWidth={2} aria-hidden /></span>
            <span style={{ flex: 1 }}>Appuntamento</span>
            <ChevronRight size={16} aria-hidden />
          </button>
          <button type="button" onClick={newDog} style={choice}>
            <span style={iconTile}><PawPrint size={20} strokeWidth={2} aria-hidden /></span>
            <span style={{ flex: 1 }}>Aggiungi Pelosetto</span>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </Dialog>
    </PhoneShell>
  )
}
