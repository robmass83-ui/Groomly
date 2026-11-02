import { useEffect, useRef, useState, type ReactElement } from 'react'
import { AttesaRiga } from './ui/Zampette'
import { useLocalData } from '../hooks/useLocalData'
import { useSession } from '../hooks/useSession'
import { useEsci } from '../hooks/useEsci'
import { useSettings } from '../hooks/useSettings'
import { dopoCambioSalone } from '../data/local/cambioSalone'
import { useFrasi } from '../i18n/LinguaContext'
import { accessoSospeso } from '../lib/accessoSospeso'
import type { SalonAccess } from '../lib/salonRoster'
import { Button } from './ui/Button'
import { Dialog } from './layout/Dialog'
import { messaggioCallable } from './team/messaggioCallable'

/** Ultima risorsa se il cambio di salone non riesce: si riapre l'app dalla Home. Sostituibile nei test. */
export const navigazione = {
  riapri: () => window.location.replace('/'),
}

export function StaffLock({ children }: { children: ReactElement }) {
  const frasi = useFrasi()
  const session = useSession()
  const { esci, foglio: foglioEsci, occupato: esciOccupato } = useEsci()
  const local = useLocalData()
  const { settings } = useSettings()
  const role = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const salonId = session.gate.kind === 'in' ? session.gate.account.salonId : ''
  const staff = role === 'collaboratore' || role === 'socio'
  const [access, setAccess] = useState<SalonAccess | null>(null)

  useEffect(() => {
    if (!staff || !salonId) return
    let stop = () => {}
    let alive = true
    void import('../data/firebase/client').then(async (mod) => {
      if (!alive) return
      stop = await mod.watchSalonAccess(salonId, (next) => {
        if (alive) setAccess(next)
      }, uid)
    })
    return () => {
      alive = false
      stop()
    }
  }, [staff, salonId, uid])

  const sospeso = accessoSospeso(role, access, uid)
  const tolto = !!access && (access.elencoNegato === true || access.members.some((member) => member.uid === uid && member.status !== 'attivo'))
  const attivo = !!access && access.elencoNegato !== true && access.members.some((member) => member.uid === uid && member.status === 'attivo')
  const [rilettura, setRilettura] = useState<'no' | 'in corso' | 'finita'>('no')
  const riletto = useRef('')
  const [cambiato, setCambiato] = useState(false)
  const [tornaOpen, setTornaOpen] = useState(false)
  const [tornando, setTornando] = useState(false)
  const [erroreTorna, setErroreTorna] = useState('')
  const tornandoRef = useRef(false)

  async function tornaAlMioSalone() {
    if (tornandoRef.current) return
    tornandoRef.current = true
    setTornando(true)
    setErroreTorna('')
    try {
      const mod = await import('../data/firebase/client')
      await mod.callTornaAlMioSalone()
    } catch (caught) {
      setErroreTorna(messaggioCallable(caught, frasi.operazioneKo, frasi.impInvioRiprova))
      tornandoRef.current = false
      setTornando(false)
      return
    }
    // Il pulsante resta occupato fino al riavvio, così nulla si salva nel frattempo.
    try {
      dopoCambioSalone(uid)
    } catch {
      navigazione.riapri()
    }
  }

  useEffect(() => {
    if (attivo) {
      riletto.current = ''
      setRilettura('no')
    }
  }, [attivo])

  useEffect(() => {
    if (!staff || local || !salonId || !tolto || riletto.current === salonId) return
    riletto.current = salonId
    setRilettura('in corso')
    void import('../data/firebase/client')
      .then((mod) => mod.reloadSignedInAccount())
      .then((account) => {
        if (account && account.salonId !== salonId) {
          // Salone diverso: da qui in poi non si mostra più né l'app né il messaggio, si aspetta il riavvio.
          setCambiato(true)
          try {
            dopoCambioSalone(uid)
          } catch {
            navigazione.riapri()
          }
          return
        }
        setRilettura('finita')
      })
      .catch(() => setRilettura('finita'))
  }, [staff, local, salonId, uid, tolto])

  if (!staff || local) return children
  if (!access || cambiato || rilettura === 'in corso' || (tolto && riletto.current !== salonId)) {
    return <AttesaRiga testo={frasi.homeCaricoAgenda} style={{ margin: 24 }} />
  }
  if (!sospeso) return children
  const nome = settings.business.salonName.trim() || settings.business.name.trim()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 24, background: 'var(--bg)', color: 'var(--tx)' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{nome ? frasi.sospesoTitolo.replace('{{nome}}', nome) : frasi.sospesoTitoloSalone}</p>
      <p style={{ margin: 0, color: 'var(--tx2)' }}>{nome ? frasi.sospesoDettaglio.replace('{{nome}}', nome) : frasi.sospesoDettaglioSenzaNome}</p>
      <Button type="button" variant="secondary" onClick={() => { setErroreTorna(''); setTornaOpen(true) }}>{frasi.impTornaSalone}</Button>
      <Button type="button" onClick={esci} disabled={esciOccupato} aria-busy={esciOccupato || undefined}>
        {esciOccupato ? `${frasi.authEsci}…` : frasi.authEsci}
      </Button>
      {foglioEsci}
      <Dialog open={tornaOpen} title={frasi.impTornaSalone} onClose={() => { if (!tornandoRef.current) setTornaOpen(false) }}>
        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{nome ? frasi.impTornaSaloneTesto.replace('{{nome}}', nome) : frasi.impTornaSaloneTestoSenzaNome}</p>
        {erroreTorna ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{erroreTorna}</p> : null}
        <Button variant="secondary" onClick={() => setTornaOpen(false)} disabled={tornando}>{frasi.invitoAnnulla}</Button>
        <Button onClick={() => { void tornaAlMioSalone() }} disabled={tornando} aria-busy={tornando || undefined}>{frasi.impTornaSalone}</Button>
      </Dialog>
    </div>
  )
}
