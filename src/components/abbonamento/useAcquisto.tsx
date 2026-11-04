import { useEffect, useState, type ReactNode } from 'react'
import { currentSalonId } from '../../data/firebase/salonRoot'
import { usePiano } from '../../hooks/usePiano'
import { useFrasi } from '../../i18n/LinguaContext'
import { avviaAcquisto, ripristinaAcquisti } from '../../lib/billing'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

type Esito = 'beta' | 'attesa' | 'lenta' | 'attivo' | 'non-disponibile' | 'solo-play' | 'errore' | 'ripristinati' | 'ripristino-errore'

const ATTESA_MS = 20_000

// Il ramo «acquisto acceso» della vetrina: compra il mensile, poi aspetta che il webhook scriva il piano Play.
// Con gli abbonamenti spenti la vetrina non lo usa (resta Avvisami / «In arrivo»).
export function useAcquisto(piano: 'plus' | 'salone', onSpento: () => void): {
  abbonati: () => void
  ripristina: () => void
  inCorso: boolean
  dialogo: ReactNode
} {
  const frasi = useFrasi()
  const stato = usePiano()
  const [esito, setEsito] = useState<Esito | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const acquisto = stato.acquisto
  const livello = stato.stato.livello
  const daPlay = stato.stato.fonte === 'play' && livello !== 'base'

  const dati = {
    abbonamentiAttivi: stato.abbonamentiAttivi,
    chiaveSdk: acquisto?.chiaveSdk ?? '',
    offeringId: acquisto?.offeringId ?? '',
    salonId: currentSalonId() ?? '',
  }

  useEffect(() => {
    if ((esito === 'attesa' || esito === 'lenta') && daPlay) setEsito('attivo')
  }, [esito, daPlay])

  useEffect(() => {
    if (esito !== 'attesa') return
    const timer = window.setTimeout(() => setEsito((e) => (e === 'attesa' ? 'lenta' : e)), ATTESA_MS)
    return () => window.clearTimeout(timer)
  }, [esito])

  async function compraOra() {
    setEsito(null)
    setInCorso(true)
    try {
      const r = await avviaAcquisto({ ...dati, piano, earlyAdopter: acquisto?.earlyAdopter === true })
      if (r === 'spento') onSpento()
      else if (r === 'ok') setEsito('attesa')
      else if (r !== 'annullato') setEsito(r)
    } finally {
      setInCorso(false)
    }
  }

  async function ripristina() {
    setInCorso(true)
    try {
      const r = await ripristinaAcquisti(dati)
      if (r === 'spento') onSpento()
      else setEsito(r === 'ok' ? 'ripristinati' : r === 'errore' ? 'ripristino-errore' : r)
    } finally {
      setInCorso(false)
    }
  }

  function abbonati() {
    if (inCorso) return
    // La beta è gratis: comprando parte subito Play e i giorni rimasti si perdono, lo diciamo prima.
    if (stato.stato.fonte === 'beta' && livello !== 'base') setEsito('beta')
    else void compraOra()
  }

  const testi: Record<Exclude<Esito, 'beta'>, string> = {
    attesa: frasi.b4Attivazione,
    lenta: frasi.b4AttivazioneLenta,
    attivo: frasi.b4Attivo,
    'non-disponibile': frasi.b4NonDisponibile,
    'solo-play': frasi.b4SoloPlay,
    errore: frasi.b4Errore,
    ripristinati: frasi.b4Ripristinati,
    'ripristino-errore': frasi.b4RipristinoErrore,
  }
  const chiudi = () => setEsito(null)

  const dialogo = esito === 'beta' ? (
    <Dialog open title={frasi.b4BetaFinisceTitolo} onClose={chiudi}>
      <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.b4BetaFinisceTesto}</p>
      <Button onClick={() => { void compraOra() }}>{frasi.b4Continua}</Button>
      <Button variant="ghost" onClick={chiudi}>{frasi.b4Annulla}</Button>
    </Dialog>
  ) : esito ? (
    <Dialog open title={frasi[piano === 'plus' ? 'abbPlus' : 'abbSalone']} onClose={chiudi}>
      <p role="status" style={{ margin: 0, lineHeight: 1.45 }}>{testi[esito]}</p>
      {esito === 'attesa' ? null : <Button onClick={chiudi}>{frasi.notCapito}</Button>}
    </Dialog>
  ) : null

  return { abbonati, ripristina: () => { void ripristina() }, inCorso, dialogo }
}
