import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChiusuraArt, NuovoCaneArt, PelosettoArt, PersonaleArt } from '../components/domain/AddMenuArt'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { unbookedMonthly } from '../lib/cycle'
import { fiscalNoticeVisible } from '../lib/profile'
import { useFrasi } from '../i18n/LinguaContext'
import { Dialog } from '../components/layout/Dialog'
import { PhoneShell } from '../components/layout/PhoneShell'

const choice: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--line)',
  borderRadius: 14,
  background: 'var(--card)',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  padding: '8px 10px',
}

export function ShellFrame({ fill = false, showFab = true, children }: { fill?: boolean; showFab?: boolean; children: ReactNode }) {
  const frasi = useFrasi()
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
  function openNewSheet(destination: string) {
    const data = searchParams.get('data')
    if (pathname === '/calendario' && data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      openSheet(`${destination}?data=${data}`)
    } else {
      openSheet(destination)
    }
  }
  function newAppointment() {
    setOpen(false)
    openNewSheet('/appuntamenti/nuovo')
  }
  function newPersonal() {
    setOpen(false)
    openNewSheet('/appuntamenti/personale/nuovo')
  }
  function newClosure() {
    setOpen(false)
    openNewSheet('/chiusure/nuovo')
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell fill={fill} showNav showFab={showFab} menuOpen={open} alerts={alerts} tax={tax} onFab={() => setOpen(true)}>
      {children}
      <Dialog open={open} title="Cosa aggiungi?" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={newAppointment} aria-label={frasi.fissaAppuntamento} style={choice}>
            <PelosettoArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere' }}>{frasi.fissaAppuntamento}</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>Metti un cane in agenda</span>
            </span>
          </button>
          <button type="button" onClick={newPersonal} aria-label="Appuntamento personale, un impegno fuori dal salone" style={choice}>
            <PersonaleArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere' }}>Appuntamento personale</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>Un impegno fuori dal salone</span>
            </span>
          </button>
          <button type="button" onClick={newClosure} aria-label="Chiusura, quel giorno il salone non lavora" style={choice}>
            <ChiusuraArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>Chiusura</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>Quel giorno il salone non lavora</span>
            </span>
          </button>
          <button type="button" onClick={newDog} aria-label="Nuovo cane, apri una scheda" style={choice}>
            <NuovoCaneArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>Nuovo cane</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>Apri una scheda</span>
            </span>
          </button>
        </div>
      </Dialog>
    </PhoneShell>
  )
}
