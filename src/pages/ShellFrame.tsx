import { Calendar, ChevronRight, CircleOff, PawPrint, UserRound } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { unbookedMonthly } from '../lib/cycle'
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

export function ShellFrame({ fill = false, showFab = true, children }: { fill?: boolean; showFab?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { settings, ready } = useSettings()
  const alerts = unbookedMonthly(dogs, appointments, new Date()).length
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
  function newPersonal() {
    setOpen(false)
    const data = searchParams.get('data')
    if (pathname === '/calendario' && data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      openSheet(`/appuntamenti/personale/nuovo?data=${data}`)
    } else {
      openSheet('/appuntamenti/personale/nuovo')
    }
  }
  function newClosure() {
    setOpen(false)
    const data = searchParams.get('data')
    if (pathname === '/calendario' && data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      openSheet(`/chiusure/nuovo?data=${data}`)
    } else {
      openSheet('/chiusure/nuovo')
    }
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell fill={fill} showNav showFab={showFab} menuOpen={open} alerts={alerts} tax={tax} onFab={() => setOpen(true)}>
      {children}
      <Dialog open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={newAppointment} style={choice}>
            <span style={iconTile}><Calendar size={20} strokeWidth={2} aria-hidden /></span>
            <span style={{ flex: 1 }}>Appuntamento pelosetto</span>
            <ChevronRight size={16} aria-hidden />
          </button>
          <button type="button" onClick={newPersonal} style={choice}>
            <span style={iconTile}><UserRound size={20} strokeWidth={2} aria-hidden /></span>
            <span style={{ flex: 1 }}>Appuntamento personale</span>
            <ChevronRight size={16} aria-hidden />
          </button>
          <button type="button" onClick={newClosure} style={choice}>
            <span style={iconTile}><CircleOff size={20} strokeWidth={2} aria-hidden /></span>
            <span style={{ flex: 1 }}>Chiusura del salone</span>
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
