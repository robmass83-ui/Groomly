import { useState, type ReactNode } from 'react'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { callEliminaSalone, callImpostaPiano } from '../../data/firebase/client'
import { useRiconferma } from './RiconfermaPassword'
import { useFrasi } from '../../i18n/LinguaContext'
import { nomeSalone, type SalonRow } from '../../lib/adminManager'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import type { ProMain } from '../../lib/piano'
import { decisioneBypass } from '../../lib/pianoBypass'
import { USER_TEXT } from '../../theme/text'

// Azioni sul piano di un salone, spostate da «Utenti Groomly»: Attiva Plus/Salon, Regala 30 giorni,
// Torna a Go (VIP protetti, testo obbligatorio dai piani pagati, omaggio con conferma) ed Elimina con la parola.

type AzioneLista = 'prova' | 'salone'
type AzioneInvio = AzioneLista | 'bypass-pro' | 'bypass-salone' | 'spegni' | 'spegni-omaggio'
export type PianoLocale = 'pro' | 'salone' | 'base'
type DialogoPiano =
  | { tipo: 'azione'; salonId: string; azione: AzioneLista }
  | { tipo: 'attiva'; salonId: string; piano: 'pro' | 'salone' }
  | { tipo: 'omaggio'; salonId: string }
  | { tipo: 'testo'; salonId: string; azione: 'spegni' | 'bypass-pro' }

export type AzioniPiano = {
  livelloDi: (row: SalonRow) => LivelloElenco
  pianoDi: (row: SalonRow) => PianoLocale
  problema: (salonId: string) => string
  tornaGo: (row: SalonRow) => void
  attiva: (row: SalonRow, piano: 'pro' | 'salone') => void
  regala: (row: SalonRow) => void
  elimina: (row: SalonRow) => void
  /** Regala 30 giorni a più saloni senza dialogo (la conferma la chiede chi chiama). */
  regalaATutti: (salonIds: readonly string[]) => Promise<{ fatti: number; negati: number }>
  dialoghi: ReactNode
}

export function useAzioniPiano(rows: readonly SalonRow[], onEliminato: (row: SalonRow) => void): AzioniPiano {
  const frasi = useFrasi()
  const toast = useToast()
  const [scelti, setScelti] = useState<Record<string, PianoLocale>>({})
  const [denied, setDenied] = useState<Record<string, string>>({})
  const [dialogo, setDialogo] = useState<DialogoPiano | null>(null)
  const { conRiconferma, dialogo: dialogoRiconferma } = useRiconferma()
  const [testo, setTesto] = useState('')
  const [daEliminare, setDaEliminare] = useState<SalonRow | null>(null)
  const [parolaElimina, setParolaElimina] = useState('')
  const [eliminando, setEliminando] = useState(false)

  function etichettaAzione(azione: AzioneLista): string {
    return azione === 'prova' ? frasi.prova30 : frasi.saloneOmaggio
  }

  function livelloDi(row: SalonRow): LivelloElenco {
    if (!(row.salonId in scelti)) return row.livello
    const scelto = scelti[row.salonId]
    if (scelto === 'pro') return 'pro'
    if (scelto === 'salone') return 'salone'
    return 'base'
  }

  function pianoDi(row: SalonRow): PianoLocale {
    if (row.salonId in scelti) return scelti[row.salonId]
    if (row.piano === 'pro' || row.piano === 'salone') return row.piano
    if (row.livello === 'pro') return 'pro'
    if (row.livello === 'salone' || row.livello === 'vip') return 'salone'
    return 'base'
  }

  function documentoDi(row: SalonRow): ProMain {
    return { piano: pianoDi(row), fonte: row.fonte, stato: row.stato, scadeIl: row.scadeIl }
  }

  function serveTesto(row: SalonRow, azione: 'scegli-pro' | 'spegni'): boolean {
    const decisione = decisioneBypass(documentoDi(row), azione, '')
    return !decisione.ok && decisione.manca === 'testo'
  }

  function pulisci(salonId: string) {
    setDenied((current) => {
      const copy = { ...current }
      delete copy[salonId]
      return copy
    })
  }

  function pianoDopo(azione: AzioneInvio): PianoLocale | null {
    if (azione === 'bypass-pro' || azione === 'prova') return 'pro'
    if (azione === 'bypass-salone' || azione === 'salone') return 'salone'
    if (azione === 'spegni' || azione === 'spegni-omaggio') return 'base'
    return null
  }

  function chiudiDialogo() {
    setDialogo(null)
    setTesto('')
  }

  async function invia(salonId: string, azione: AzioneInvio, messaggio?: string) {
    pulisci(salonId)
    const row = rows.find((item) => item.salonId === salonId)
    chiudiDialogo()
    if (!row) return
    if (livelloDi(row) === 'vip' && azione !== 'salone' && azione !== 'spegni-omaggio') {
      setDenied((current) => ({ ...current, [salonId]: frasi.uteVipResta }))
      return
    }
    try {
      const esito = messaggio === undefined
        ? await callImpostaPiano(salonId, azione)
        : await callImpostaPiano(salonId, azione, messaggio)
      const prossimo = pianoDopo(azione)
      if (prossimo) setScelti((current) => ({ ...current, [salonId]: prossimo }))
      if (esito.emailStato === 'non_inviata') setDenied((current) => ({ ...current, [salonId]: frasi.bypassMailKo }))
    } catch (caught) {
      const message = caught instanceof Error && caught.message !== '' ? caught.message : frasi.uteNegato
      setDenied((current) => ({ ...current, [salonId]: message }))
    }
  }

  function tornaGo(row: SalonRow) {
    pulisci(row.salonId)
    if (row.fonte === 'omaggio') {
      setDialogo({ tipo: 'omaggio', salonId: row.salonId })
      return
    }
    if (livelloDi(row) === 'vip') {
      setDenied((current) => ({ ...current, [row.salonId]: frasi.uteVipResta }))
      return
    }
    if (serveTesto(row, 'spegni')) {
      setTesto('')
      setDialogo({ tipo: 'testo', salonId: row.salonId, azione: 'spegni' })
      return
    }
    void invia(row.salonId, 'spegni')
  }

  function scegliBypass(row: SalonRow, azione: 'bypass-pro' | 'bypass-salone') {
    if (azione === 'bypass-pro' && serveTesto(row, 'scegli-pro')) {
      setTesto('')
      setDialogo({ tipo: 'testo', salonId: row.salonId, azione: 'bypass-pro' })
      return
    }
    void invia(row.salonId, azione)
  }

  async function regalaATutti(salonIds: readonly string[]): Promise<{ fatti: number; negati: number }> {
    let fatti = 0
    let negati = 0
    for (const salonId of salonIds) {
      try {
        await callImpostaPiano(salonId, 'prova')
        setScelti((current) => ({ ...current, [salonId]: 'pro' }))
        fatti += 1
      } catch {
        negati += 1
      }
    }
    return { fatti, negati }
  }

  function chiudiElimina() {
    if (eliminando) return
    setDaEliminare(null)
    setParolaElimina('')
  }

  async function confermaElimina() {
    if (!daEliminare || eliminando || parolaElimina.trim().toUpperCase() !== frasi.uteEliminaParola) return
    const row = daEliminare
    setEliminando(true)
    try {
      await conRiconferma(() => callEliminaSalone(row.salonId))
      setDaEliminare(null)
      setParolaElimina('')
      toast.show(frasi.uteEliminaFatto.replace('{{salone}}', nomeSalone(row)), 'plain')
      onEliminato(row)
    } catch {
      toast.show(frasi.uteEliminaKo, 'plain')
    } finally {
      setEliminando(false)
    }
  }

  async function confermaPiano() {
    if (!dialogo) return
    if (dialogo.tipo === 'azione') {
      await invia(dialogo.salonId, dialogo.azione)
      return
    }
    if (dialogo.tipo === 'omaggio') {
      await invia(dialogo.salonId, 'spegni-omaggio')
      return
    }
    if (dialogo.tipo === 'attiva') {
      const row = rows.find((item) => item.salonId === dialogo.salonId)
      if (row) scegliBypass(row, dialogo.piano === 'pro' ? 'bypass-pro' : 'bypass-salone')
      return
    }
    const messaggio = testo.trim()
    if (messaggio.length < 1 || messaggio.length > 400) return
    await invia(dialogo.salonId, dialogo.azione, messaggio)
  }

  const chiesto = dialogo ? rows.find((row) => row.salonId === dialogo.salonId) : undefined
  const messaggioPronto = testo.trim().length >= 1 && testo.trim().length <= 400

  function titoloDialogo(): string {
    if (!dialogo) return ''
    if (dialogo.tipo === 'azione') return etichettaAzione(dialogo.azione)
    if (dialogo.tipo === 'omaggio') return frasi.bypassOmaggio
    if (dialogo.tipo === 'testo') return frasi.bypassMessaggio
    return frasi.uteAttiva.replace('{{piano}}', dialogo.piano === 'pro' ? frasi.utePro : frasi.uteSalone)
  }

  function frase(azione: string, row: SalonRow): string {
    return frasi.uteConfermaPiano.replace('{{azione}}', azione).replace('{{salone}}', nomeSalone(row)).replace('{{nome}}', row.ownerName)
  }

  const pulsanti = (pronto = true) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="secondary" style={{ flex: 1 }} onClick={chiudiDialogo}>{frasi.uteAnnulla}</Button>
      <Button style={{ flex: 1 }} disabled={!pronto} onClick={() => { void confermaPiano() }}>{frasi.uteConferma}</Button>
    </div>
  )

  const dialoghi = (
    <>
      {dialogoRiconferma}
      <Dialog open={chiesto !== undefined && dialogo !== null} title={titoloDialogo()} onClose={chiudiDialogo}>
        {chiesto && dialogo?.tipo === 'azione' ? (
          <>
            <p style={{ margin: 0, ...USER_TEXT }}>{frase(etichettaAzione(dialogo.azione), chiesto)}</p>
            {pulsanti()}
          </>
        ) : null}
        {chiesto && dialogo?.tipo === 'attiva' ? (
          <>
            <p style={{ margin: 0, ...USER_TEXT }}>{frase(titoloDialogo(), chiesto)}</p>
            {pulsanti()}
          </>
        ) : null}
        {chiesto && dialogo?.tipo === 'omaggio' ? pulsanti() : null}
        {chiesto && dialogo?.tipo === 'testo' ? (
          <>
            <textarea
              value={testo}
              aria-label={frasi.bypassMessaggio}
              onChange={(event) => setTesto(event.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', padding: 8, border: '1px solid var(--line)', borderRadius: 8, resize: 'vertical', background: 'transparent', color: 'inherit' }}
            />
            <p style={{ margin: 0, ...USER_TEXT }}>{frasi.bypassNotaPlay}</p>
            {pulsanti(messaggioPronto)}
          </>
        ) : null}
      </Dialog>
      <Dialog
        open={daEliminare !== null}
        title={daEliminare ? frasi.uteEliminaTitolo.replace('{{salone}}', nomeSalone(daEliminare)) : ''}
        onClose={chiudiElimina}
      >
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.uteEliminaAvviso}</p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, ...USER_TEXT }}>
          {frasi.uteEliminaScrivi.replace('{{parola}}', frasi.uteEliminaParola)}
          <input
            value={parolaElimina}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(event) => setParolaElimina(event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontWeight: 400, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', color: 'inherit' }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} disabled={eliminando} onClick={chiudiElimina}>{frasi.uteAnnulla}</Button>
          <Button
            variant="bad"
            style={{ flex: 1 }}
            disabled={eliminando || parolaElimina.trim().toUpperCase() !== frasi.uteEliminaParola}
            onClick={() => { void confermaElimina() }}
          >
            {frasi.uteElimina}
          </Button>
        </div>
      </Dialog>
    </>
  )

  return {
    livelloDi,
    pianoDi,
    problema: (salonId) => denied[salonId] ?? '',
    tornaGo,
    attiva: (row, piano) => {
      pulisci(row.salonId)
      setDialogo({ tipo: 'attiva', salonId: row.salonId, piano })
    },
    regala: (row) => setDialogo({ tipo: 'azione', salonId: row.salonId, azione: 'prova' }),
    elimina: (row) => {
      setParolaElimina('')
      setDaEliminare(row)
    },
    regalaATutti,
    dialoghi,
  }
}
