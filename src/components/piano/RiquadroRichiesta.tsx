import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { callGestisciPrenotazione, callPostiLiberi, type AzioneRichiesta, type RichiestaNuova } from '../../data/firebase/client'
import { dataBreve } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { appointmentEnd, rangesOverlap } from '../../lib/appointments'
import { candidatiRichiesta } from '../../lib/candidatiRichiesta'
import { chiaveGiornoRoma, fineOccupata, oraRoma } from '../../lib/disponibilita'
import { TYPE } from '../../theme/theme'
import { USER_TEXT } from '../../theme/text'
import type { Appointment, Dog } from '../../types/models'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { dataDiCalendario, giornoRomaCorto } from './RigaRichieste'

export type CaneRichiesta = Pick<Dog, 'id' | 'name' | 'breed' | 'status' | 'contact'>

export type VisitaRichiesta = Pick<Appointment, 'start' | 'services' | 'status'> & Partial<Pick<Appointment, 'end' | 'plannedEnd' | 'provvisorio'>>

type Errore = '' | 'email' | 'salvataggio'

const NUOVO = 'nuovo'

/** Una visita definitiva e ancora in programma sull'ora chiesta. Le provvisorie e le richieste in attesa non contano. */
function oraOccupata(richiesta: RichiestaNuova, visite: readonly VisitaRichiesta[]): boolean {
  const inizio = new Date(richiesta.start)
  if (Number.isNaN(inizio.getTime())) return false
  const fineLetta = new Date(richiesta.end)
  const fine = fineOccupata(inizio, Number.isNaN(fineLetta.getTime()) ? inizio : fineLetta)
  return visite.some((visita) => {
    if (visita.status !== 'programmato' || visita.provvisorio === true) return false
    const finisce = visita.plannedEnd ?? visita.end ?? appointmentEnd(visita.start, visita.services)
    return rangesOverlap(inizio, fine, visita.start, finisce)
  })
}

function Scelta({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: TYPE.base, color: 'var(--tx)', cursor: 'pointer', ...USER_TEXT }}>
      <input type="radio" name="scelta" checked={checked} onChange={onChange} style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--pri)', flex: 'none' }} />
      <span style={{ minWidth: 0 }}>{children}</span>
    </label>
  )
}

function Chip({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      style={{
        minHeight: 44,
        minWidth: 44,
        padding: '0 12px',
        borderRadius: 10,
        border: `1px solid ${attivo ? 'var(--pri)' : 'var(--line)'}`,
        background: attivo ? 'var(--pri-s)' : 'var(--card)',
        color: attivo ? 'var(--pri-ink)' : 'var(--tx)',
        fontFamily: 'inherit',
        fontSize: TYPE.base,
        fontWeight: attivo ? 700 : 500,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const gruppo: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
const piccolo: CSSProperties = { margin: 0, fontSize: TYPE.meta, color: 'var(--tx2)', ...USER_TEXT }

export function RiquadroRichiesta({
  aperta,
  richiesta,
  cani,
  visite,
  onChiudi,
  onFatto,
}: {
  aperta: boolean
  richiesta: RichiestaNuova
  cani: readonly CaneRichiesta[]
  visite: readonly VisitaRichiesta[]
  onChiudi: () => void
  onFatto: () => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [scelta, setScelta] = useState<string | null>(null)
  const [proponendo, setProponendo] = useState(false)
  const [calendario, setCalendario] = useState<Record<string, string[]> | null>(null)
  const [giorno, setGiorno] = useState('')
  const [ora, setOra] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<Errore>('')
  const giroInvio = useRef(0)

  useEffect(() => {
    if (!proponendo) return
    let vivo = true
    setCalendario(null)
    callPostiLiberi(chiaveGiornoRoma(new Date()))
      .then((mappa) => {
        if (!vivo) return
        setCalendario(mappa)
        setGiorno(Object.keys(mappa).sort()[0] ?? '')
      })
      .catch(() => {
        if (vivo) setCalendario({})
      })
    return () => { vivo = false }
  }, [proponendo])

  const candidati = candidatiRichiesta(cani, richiesta.phone, richiesta.email)
  const inizio = new Date(richiesta.start)
  const fine = fineOccupata(inizio, new Date(richiesta.end))
  const valida = !Number.isNaN(inizio.getTime())
  const cane = richiesta.cane.trim() || frasi.richiestaMancaCane
  const etichette = { cane: frasi.schedaCane, gatto: frasi.schedaGatto, altro: frasi.schedaAltro } as const
  const taglie = { piccola: frasi.schedaPiccola, media: frasi.schedaMedia, grande: frasi.schedaGrande } as const
  const dettagli = [etichette[richiesta.specie], richiesta.razza.trim(), taglie[richiesta.taglia], richiesta.phone.trim(), richiesta.email.trim()].filter((voce) => voce !== '')
  const giorni = calendario ? Object.keys(calendario).sort() : []
  const ore = calendario && giorno ? calendario[giorno] ?? [] : []
  const haOccupata = valida && oraOccupata(richiesta, visite)

  async function invia(azione: AzioneRichiesta, extra: { giorno?: string; ora?: string } = {}) {
    const giro = giroInvio.current + 1
    giroInvio.current = giro
    setInCorso(true)
    setErrore('')
    try {
      const esito = await callGestisciPrenotazione({ id: richiesta.id, azione, scelta: scelta ?? '', ...extra })
      if (giroInvio.current !== giro) return
      if (esito.ok) {
        onFatto()
        return
      }
      setErrore(esito.errore === 'email' ? 'email' : 'salvataggio')
    } catch {
      if (giroInvio.current === giro) setErrore('salvataggio')
    } finally {
      if (giroInvio.current === giro) setInCorso(false)
    }
  }

  const sceltaFatta = scelta !== null
  const proponiSpento = !sceltaFatta || (proponendo && (giorno === '' || ora === ''))

  function tornaAlOrario() {
    setProponendo(false)
    setGiorno('')
    setOra('')
    setErrore('')
  }

  return (
    <Dialog open={aperta} title={frasi.richiestaTitolo} onClose={onChiudi} portal>
      {richiesta.foto.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {richiesta.foto.map((foto, indice) => (
            <img key={indice} src={foto} alt={cane} width={56} height={56} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, background: 'var(--surf)' }} />
          ))}
        </div>
      ) : null}
      <p style={{ margin: 0, fontSize: TYPE.base, fontWeight: 700, ...USER_TEXT }}>
        {frasi.richiestaChiede.replace('{{chi}}', richiesta.nome.trim()).replace('{{cane}}', cane)}
      </p>
      {proponendo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div role="group" aria-label={frasi.schedaGiorno} style={gruppo}>
            {giorni.map((voce) => (
              <Chip key={voce} attivo={voce === giorno} onClick={() => { setGiorno(voce); setOra('') }}>{giornoRomaCorto(lingua, voce)}</Chip>
            ))}
          </div>
          {giorno ? (
            <div role="group" aria-label={frasi.appOrario} style={gruppo}>
              {ore.map((voce) => <Chip key={voce} attivo={voce === ora} onClick={() => setOra(voce)}>{voce}</Chip>)}
            </div>
          ) : null}
          <Button variant="ghost" onClick={tornaAlOrario} style={{ alignSelf: 'flex-start', minHeight: 44 }}>{frasi.homeIndietro}</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {valida ? (
            <p style={{ margin: 0, fontSize: TYPE.base, color: 'var(--tx)' }}>
              {`${dataBreve(lingua, dataDiCalendario(chiaveGiornoRoma(inizio)))} · ${oraRoma(inizio)}–${oraRoma(fine)}`}
            </p>
          ) : null}
          {haOccupata ? (
            <p role="status" style={{ margin: 0, padding: '8px 10px', borderRadius: 10, background: 'var(--warn-s)', color: 'var(--warn)', fontSize: TYPE.base, fontWeight: 600 }}>
              {frasi.richiestaOccupata}
            </p>
          ) : null}
        </div>
      )}
      <p style={piccolo}>{dettagli.join(' · ')}</p>
      <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column' }}>
        <legend style={{ padding: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--tx2)' }}>{frasi.richiestaScegli}</legend>
        <Scelta checked={scelta === NUOVO} onChange={() => setScelta(NUOVO)}>{frasi.richiestaNuovo}</Scelta>
        {candidati.map((candidato) => (
          <Scelta key={candidato.id} checked={scelta === candidato.id} onChange={() => setScelta(candidato.id)}>
            {candidato.status === 'non_in_cura' ? `${candidato.name} · ${frasi.richiestaArchivio}` : candidato.name}
          </Scelta>
        ))}
      </fieldset>
      {errore ? (
        <p role="alert" style={{ margin: 0, padding: '8px 10px', borderRadius: 10, background: 'var(--bad-s)', color: 'var(--bad)', fontSize: TYPE.base, fontWeight: 600 }}>
          {errore === 'email' ? frasi.richiestaEmailKo : frasi.authSalvataggio}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Button disabled={!sceltaFatta || inCorso} onClick={() => void invia('accetta')} style={{ minHeight: 44, opacity: !sceltaFatta ? 0.5 : 1 }}>
          {frasi.richiestaAccetta}
        </Button>
        <Button
          variant="secondary"
          disabled={proponiSpento || inCorso}
          onClick={() => {
            if (!proponendo) {
              setProponendo(true)
              setErrore('')
              return
            }
            void invia('proponi', { giorno, ora })
          }}
          style={{ minHeight: 44, opacity: proponiSpento ? 0.5 : 1 }}
        >
          {frasi.richiestaProponi}
        </Button>
        <Button variant="bad" disabled={inCorso} onClick={() => void invia('rifiuta')} style={{ minHeight: 44 }}>
          {frasi.richiestaRifiuta}
        </Button>
      </div>
    </Dialog>
  )
}
