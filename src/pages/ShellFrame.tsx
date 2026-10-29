import { useState, type CSSProperties, type ReactNode } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { AttesaArt, ChiusuraArt, NuovoCaneArt, PelosettoArt, PersonaleArt } from '../components/domain/AddMenuArt'
import { servizioEmailAcceso } from '../lib/serviziEmail'
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
import { TYPE } from '../theme/theme'

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
  // Le chiusure le scrivono titolare e socio: Firestore le rifiuta al collaboratore.
  const creaChiusure = !(session.gate.kind === 'in' && session.gate.account.role === 'collaboratore')
  const { dogs, settled: dogsSettled, stantio: caniStantii } = useDogs(uid)
  const { appointments, synced, stantio: agendaStantia } = useAppointments(uid)
  const { settings, ready, stantio: impostazioniStantie } = useSettings()
  const attesaSalone = firebaseEnabled() && (!synced || !dogsSettled)
  const datiStantii = firebaseEnabled() && !attesaSalone && (caniStantii || agendaStantia || impostazioniStantie)
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
  function listaAttesa() {
    setOpen(false)
    navigate('/animali/attesa')
  }
  // Tutti i ruoli la vedono: il servizio lo accendono titolare e socio, la lista la usa chiunque stia al banco.
  const attesaAcceso = servizioEmailAcceso(settings.serviziEmail?.attesa?.modo ?? 'spento')
  return (
    <PhoneShell fill={fill} showNav showFab={showFab} menuOpen={open} alerts={alerts} tax={tax} onFab={() => setOpen(true)}>
      {datiStantii ? (
        <p style={{ margin: 0, padding: '8px 16px 0', color: 'var(--tx3)', fontSize: TYPE.meta, textAlign: 'center' }}>{frasi.homeDatiStantii}</p>
      ) : null}
      {children}
      <Dialog open={open} title={frasi.shellCosa} onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={newAppointment} aria-label={frasi.fissaAppuntamento} style={choice}>
            <PelosettoArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere' }}>{frasi.fissaAppuntamento}</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>{frasi.shellMettiCane}</span>
            </span>
          </button>
          <button type="button" onClick={newPersonal} aria-label={frasi.persAria} style={choice}>
            <PersonaleArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere' }}>{frasi.persTitolo}</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>{frasi.shellImpegno}</span>
            </span>
          </button>
          {creaChiusure ? (
            <button type="button" onClick={newClosure} aria-label={frasi.shellChiusuraAria} style={choice}>
              <ChiusuraArt />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700 }}>{frasi.shellChiusura}</span>
                <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>{frasi.shellChiusuraDettaglio}</span>
              </span>
            </button>
          ) : null}
          <button type="button" onClick={newDog} aria-label={frasi.shellNuovoCaneAria} style={choice}>
            <NuovoCaneArt />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>{frasi.shellNuovoCane}</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>{frasi.shellApriScheda}</span>
            </span>
          </button>
          {attesaAcceso ? (
            <button type="button" onClick={listaAttesa} aria-label={frasi.listaAttesa} style={choice}>
              <AttesaArt />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700 }}>{frasi.listaAttesa}</span>
                <span style={{ display: 'block', marginTop: 1, fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>{frasi.shellListaAttesaDettaglio}</span>
              </span>
            </button>
          ) : null}
        </div>
      </Dialog>
    </PhoneShell>
  )
}
