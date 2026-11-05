import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import {
  callAvviaAssistenza,
  callContatoriAdmin,
  callEstendiBeta,
  callInvitaBeta,
  elencoAssistenza,
  elencoFeedbackBeta,
  elencoInvitiBeta,
  listenConfigGlobale,
  type ConfigGlobale,
  type EsitoInvito,
  type MotivoSaltato,
} from '../../data/firebase/adminClient'
import { elencoSuggerimenti, listSalonDirectory, type SuggerimentoArrivato } from '../../data/firebase/client'
import { useRuolo } from '../../hooks/useRuolo'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import {
  FILTRI_VUOTI,
  daFareOggi,
  fineBetaDi,
  nomeSalone,
  salonRows,
  statoBetaDi,
  type ContatoriAdmin,
  type FeedbackLetto,
  type Filtri,
  type InvitoAdmin,
  type RigaLista,
  type VoceDaFare,
} from '../../lib/adminManager'
import { contaNuove, unisciRichieste, type DocAssistenza, type RichiestaAssistenza } from '../../lib/assistenza'
import { PERCORSO_ADMIN, PERCORSO_SALONI } from '../../lib/percorsoAdmin'
import { accountSummary, salonSummary, type SalonDirectory } from '../../lib/salonDirectory'
import { USER_TEXT } from '../../theme/text'
import { DialogoInvitoBeta, type SceltaInvito } from './DialogoInvitoBeta'
import { useAzioniPiano } from './useAzioniPiano'

const CACHE_CONTATORI_MS = 60_000

export type AdminDati = {
  directory: SalonDirectory | null
  erroreDirectory: boolean
  righe: RigaLista[]
  inviti: InvitoAdmin[]
  invitiPer: Map<string, InvitoAdmin>
  feedback: FeedbackLetto[]
  feedbackPronti: boolean
  erroreFeedback: boolean
  note: SuggerimentoArrivato[]
  richieste: RichiestaAssistenza[]
  richiestePronte: boolean
  contatori: ContatoriAdmin | null
  erroreContatori: boolean
  config: ConfigGlobale | null
  filtri: Filtri
  setFiltri: (filtri: Filtri) => void
  selezione: Set<string> | null
  setSelezione: (selezione: Set<string> | null) => void
  daFare: VoceDaFare[]
  nuoviBeta: number
  nuoveRichieste: number
  fineBeta: Record<string, string>
  riepilogoAccount: string
  adesso: Date
  azioni: ReturnType<typeof useAzioniPiano>
  nomeDi: (salonId: string) => string
  caricaContatori: () => void
  ricaricaAssistenza: () => void
  esegui: (azione: () => Promise<unknown>) => Promise<boolean>
  apriInvito: (salonIds: string[], piano: 'pro' | 'salone') => void
  apriRegalaTutti: () => void
  apriEstendi30: (salonId: string) => void
}

const Contesto = createContext<AdminDati | null>(null)

export function useAdminDati(): AdminDati {
  const dati = useContext(Contesto)
  if (!dati) throw new Error('useAdminDati fuori da AdminDatiProvider')
  return dati
}

/** I dati comuni a tutte le pagine della Console: si caricano una volta e restano passando da una rotta all'altra. */
export function AdminDatiProvider({ children }: { children: ReactNode }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { admin } = useRuolo()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [adesso] = useState(() => new Date())

  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [erroreDirectory, setErroreDirectory] = useState(false)
  const [note, setNote] = useState<SuggerimentoArrivato[]>([])
  const [notePronte, setNotePronte] = useState(false)
  const [inviti, setInviti] = useState<InvitoAdmin[]>([])
  const [feedback, setFeedback] = useState<FeedbackLetto[]>([])
  const [feedbackPronti, setFeedbackPronti] = useState(false)
  const [erroreFeedback, setErroreFeedback] = useState(false)
  const [documenti, setDocumenti] = useState<Record<string, DocAssistenza>>({})
  const [assistenzaDal, setAssistenzaDal] = useState<string | null>(null)
  const [contatori, setContatori] = useState<ContatoriAdmin | null>(null)
  const [erroreContatori, setErroreContatori] = useState(false)
  const ultimiContatori = useRef(0)
  const [config, setConfig] = useState<ConfigGlobale | null>(null)
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI)
  const [selezione, setSelezione] = useState<Set<string> | null>(null)
  const [invito, setInvito] = useState<{ salonIds: string[]; piano: 'pro' | 'salone' } | null>(null)
  const [invitando, setInvitando] = useState(false)
  const [saltati, setSaltati] = useState<EsitoInvito['saltati'] | null>(null)
  const [regalaTutti, setRegalaTutti] = useState(false)
  const [estendi30, setEstendi30] = useState<string | null>(null)

  const caricaDirectory = useCallback(() => {
    void listSalonDirectory().then((d) => {
      setDirectory(d)
      setErroreDirectory(false)
    }).catch(() => setErroreDirectory(true))
  }, [])

  const caricaInviti = useCallback(() => {
    void elencoInvitiBeta().then(setInviti).catch(() => undefined)
  }, [])

  const caricaContatori = useCallback(() => {
    ultimiContatori.current = Date.now()
    setErroreContatori(false)
    void callContatoriAdmin().then(setContatori).catch(() => setErroreContatori(true))
  }, [])

  const ricaricaAssistenza = useCallback(() => {
    void elencoAssistenza().then(setDocumenti).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!admin) return
    let vivo = true
    caricaDirectory()
    caricaInviti()
    ricaricaAssistenza()
    void callAvviaAssistenza().then((dal) => { if (vivo && dal !== '') setAssistenzaDal(dal) }).catch(() => undefined)
    void elencoSuggerimenti().then((lista) => {
      if (!vivo) return
      setNote(lista)
      setNotePronte(true)
    }).catch(() => {
      if (!vivo) return
      setNote([])
      setNotePronte(true)
    })
    void elencoFeedbackBeta().then((lista) => {
      if (!vivo) return
      setFeedback(lista)
      setFeedbackPronti(true)
    }).catch(() => {
      if (vivo) setErroreFeedback(true)
    })
    let smetti: (() => void) | null = null
    void listenConfigGlobale((c) => { if (vivo) setConfig(c) }).then((stop) => {
      if (vivo) smetti = stop
      else stop()
    }).catch(() => undefined)
    return () => {
      vivo = false
      smetti?.()
    }
  }, [admin, caricaDirectory, caricaInviti, ricaricaAssistenza])

  // Numeri: all'apertura e a ogni ritorno su Panoramica o Saloni, al massimo una volta al minuto.
  const conNumeri = pathname === PERCORSO_ADMIN || pathname.startsWith(PERCORSO_SALONI)
  useEffect(() => {
    if (!admin || !conNumeri) return
    if (Date.now() - ultimiContatori.current < CACHE_CONTATORI_MS) return
    caricaContatori()
  }, [admin, conNumeri, caricaContatori])

  const rows = useMemo(() => (directory ? salonRows(directory, frasi.uteSenzaNome) : []), [directory, frasi.uteSenzaNome])
  const azioni = useAzioniPiano(rows, (row) => {
    setDirectory((current) => current ? {
      ...current,
      pro: current.pro.filter((item) => item.salonId !== row.salonId),
      entries: current.entries.filter((entry) => entry.uid !== row.salonId),
    } : current)
    navigate(PERCORSO_SALONI)
    caricaDirectory()
  })

  const nomi = new Map<string, string>()
  for (const entry of directory?.entries ?? []) {
    if (entry.salonName.trim() !== '') nomi.set(entry.uid, entry.salonName)
  }
  for (const row of rows) nomi.set(row.salonId, nomeSalone(row))
  const nomeDi = (id: string) => nomi.get(id) || frasi.uteSenzaNome

  const invitiPer = new Map(inviti.map((i) => [i.salonId, i]))
  const righe: RigaLista[] = rows.map((row) => ({
    row,
    livello: azioni.livelloDi(row),
    beta: statoBetaDi(invitiPer.get(row.salonId), row, adesso),
    info: contatori?.perSalone?.[row.salonId] ?? {},
  }))
  const fineBeta: Record<string, string> = {}
  for (const row of rows) {
    const fine = fineBetaDi(row)
    if (fine) fineBeta[row.salonId] = fine
  }
  const richieste = useMemo(() => unisciRichieste(note, feedback, documenti, assistenzaDal), [note, feedback, documenti, assistenzaDal])
  const nuoveRichieste = contaNuove(richieste)
  const daFare = daFareOggi({ inviti, fineBeta, richiesteNuove: nuoveRichieste, nuoviSaloni: contatori?.nuoviSaloni.length ?? 0 }, adesso)

  function nomeMotivo(motivo: MotivoSaltato): string {
    return {
      vip: frasi.amSaltoVip,
      shared: frasi.amSaltoShared,
      'gia-invitato': frasi.amSaltoGia,
      'piano-attivo': frasi.amSaltoAttivo,
      'non-trovato': frasi.amSaltoNonTrovato,
    }[motivo]
  }

  async function inviaInviti(scelta: SceltaInvito) {
    if (!invito || invitando) return
    setInvitando(true)
    try {
      const esito = await callInvitaBeta({ salonIds: invito.salonIds, piano: scelta.piano, giorni: scelta.giorni, messaggio: scelta.messaggio })
      setInvito(null)
      setSelezione(null)
      const testo = frasi.amInvitiFatti.replace('{{n}}', String(esito.invitati.length))
      if (esito.saltati.length > 0) {
        toast.show(`${testo} · ${frasi.amSaltati.replace('{{n}}', String(esito.saltati.length))}`, 'ok', { label: frasi.amSaltatiTitolo, onClick: () => setSaltati(esito.saltati) }, undefined, 6000)
      } else {
        toast.show(testo, 'ok')
      }
      caricaInviti()
      ultimiContatori.current = 0
    } catch (caught) {
      toast.show(caught instanceof Error && caught.message !== '' ? caught.message : frasi.amAzioneKo, 'plain')
    } finally {
      setInvitando(false)
    }
  }

  async function esegui(azione: () => Promise<unknown>): Promise<boolean> {
    try {
      await azione()
      caricaInviti()
      caricaDirectory()
      ultimiContatori.current = 0
      return true
    } catch (caught) {
      toast.show(caught instanceof Error && caught.message !== '' ? caught.message : frasi.amAzioneKo, 'plain')
      return false
    }
  }

  async function confermaRegalaTutti() {
    const ids = [...(selezione ?? [])]
    setRegalaTutti(false)
    const esito = await azioni.regalaATutti(ids)
    setSelezione(null)
    const testo = frasi.amRegalaTuttiFatto.replace('{{n}}', String(esito.fatti))
    toast.show(esito.negati > 0 ? `${testo} · ${frasi.amSaltati.replace('{{n}}', String(esito.negati))}` : testo, 'ok')
  }

  const valore: AdminDati = {
    directory,
    erroreDirectory,
    righe,
    inviti,
    invitiPer,
    feedback,
    feedbackPronti,
    erroreFeedback,
    note,
    richieste,
    richiestePronte: notePronte && (feedbackPronti || erroreFeedback),
    contatori,
    erroreContatori,
    config,
    filtri,
    setFiltri,
    selezione,
    setSelezione,
    daFare,
    nuoviBeta: righe.filter((r) => r.beta === 'invitato').length,
    nuoveRichieste,
    fineBeta,
    riepilogoAccount: directory ? `${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}` : '',
    adesso,
    azioni,
    nomeDi,
    caricaContatori,
    ricaricaAssistenza,
    esegui,
    apriInvito: (salonIds, piano) => setInvito({ salonIds, piano }),
    apriRegalaTutti: () => setRegalaTutti(true),
    apriEstendi30: setEstendi30,
  }
  const nomiInvito = (invito?.salonIds ?? []).map(nomeDi)
  const salonEstendi = estendi30 ? nomeDi(estendi30) : ''

  return (
    <Contesto.Provider value={valore}>
      {children}
      {azioni.dialoghi}
      <DialogoInvitoBeta
        open={invito !== null}
        nomi={nomiInvito}
        pianoIniziale={invito?.piano ?? 'pro'}
        occupato={invitando}
        onClose={() => setInvito(null)}
        onInvia={(scelta) => { void inviaInviti(scelta) }}
      />
      <Dialog open={saltati !== null} title={frasi.amSaltatiTitolo} onClose={() => setSaltati(null)}>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(saltati ?? []).map((s) => <li key={s.salonId} style={USER_TEXT}>{`${nomeDi(s.salonId)} · ${nomeMotivo(s.motivo)}`}</li>)}
        </ul>
        <Button variant="secondary" onClick={() => setSaltati(null)}>{frasi.chiudi}</Button>
      </Dialog>
      <Dialog open={regalaTutti} title={frasi.amRegalaTutti} onClose={() => setRegalaTutti(false)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amRegalaTuttiConferma.replace('{{n}}', String(selezione?.size ?? 0))}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setRegalaTutti(false)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} onClick={() => { void confermaRegalaTutti() }}>{frasi.uteConferma}</Button>
        </div>
      </Dialog>
      <Dialog open={estendi30 !== null} title={frasi.amEstendiTitolo} onClose={() => setEstendi30(null)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amPiu30Conferma.replace('{{salone}}', salonEstendi)}</p>
        {estendi30 && fineBeta[estendi30] ? (
          <p style={{ margin: 0, fontWeight: 700 }}>{frasi.amNuovaFine.replace('{{data}}', dataCorta(lingua, new Date(Date.parse(fineBeta[estendi30]) + 30 * 86_400_000)))}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setEstendi30(null)}>{frasi.uteAnnulla}</Button>
          <Button
            style={{ flex: 1 }}
            onClick={() => {
              const id = estendi30
              setEstendi30(null)
              if (id) void esegui(() => callEstendiBeta({ salonId: id, giorni: 30 })).then((ok) => { if (ok) toast.show(frasi.amSalvato, 'ok') })
            }}
          >
            {frasi.uteConferma}
          </Button>
        </div>
      </Dialog>
    </Contesto.Provider>
  )
}
