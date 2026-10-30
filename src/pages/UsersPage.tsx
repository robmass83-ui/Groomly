import { Capacitor } from '@capacitor/core'
import { ChevronRight, Star } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import {
  LIMITE_SUGGERIMENTI,
  callImpostaFunzione,
  callImpostaPiano,
  callImpostaTour,
  callEliminaSalone,
  elencoSuggerimenti,
  listSalonDirectory,
  type SuggerimentoArrivato,
} from '../data/firebase/client'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { dataCorta } from '../i18n/format'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import {
  categorieConConteggio,
  contaStati,
  filtraGruppi,
  ordinaPerStato,
  raggruppaSuggerimenti,
  righeEsportazione,
  saloniDelGruppo,
  statoGruppo,
  type FiltroCoda,
  type GruppoSuggerimento,
} from '../lib/codaSuggerimenti'
import { nomeFileSuggerimenti, pdfSuggerimenti, xlsxSuggerimenti, type BloccoPdf, type RigaExcel } from '../lib/esportaSuggerimenti'
import { funzioneAccesa, type FunzioniMappa, type LivelloElenco } from '../lib/funzioniPiano'
import { statoPianoNome, type FontePiano, type ProMain, type StatoPianoNome } from '../lib/piano'
import { decisioneBypass } from '../lib/pianoBypass'
import { leggiRevisione, scriviRevisione, type SegnoSuggerimento } from '../lib/revisioneSuggerimenti'
import { accountSummary, salonSummary, type DirectoryEntry, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator } from '../lib/salonPath'
import { downloadAnchor, isShareCancel, shareFiles } from '../lib/shareFile'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { ShellFrame } from './ShellFrame'
import { AttesaRiga } from '../components/ui/Zampette'

type AzioneLista = 'prova' | 'salone'
type AzioneInvio = AzioneLista | 'bypass-pro' | 'bypass-salone' | 'spegni' | 'spegni-omaggio'
type PianoLocale = 'pro' | 'salone' | 'base'
type DialogoPiano =
  | { tipo: 'azione'; salonId: string; azione: AzioneLista }
  | { tipo: 'scegli'; salonId: string }
  | { tipo: 'omaggio'; salonId: string }
  | { tipo: 'testo'; salonId: string; azione: 'spegni' | 'bypass-pro' }
type Portata = 'vista' | 'interessante' | 'visto' | 'tutti'
type Formato = 'pdf' | 'xlsx'

type ProItem = {
  uid: string
  salonId: string
  enabled: boolean
  livello?: LivelloElenco
  funzioni?: FunzioniMappa
  piano?: 'base' | 'pro' | 'salone'
  fonte: FontePiano | null
  stato?: StatoPianoNome
  scadeIl?: string | null
}

const CHIAVI_FUNZIONE = [
  'messaggi',
  'affidabilita',
  'prenotazioni',
  'listaAttesa',
  'fedelta',
  'recensioni',
  'pagella',
  'statistiche',
  'team',
] as const

const LIVELLI: readonly LivelloElenco[] = ['base', 'pro', 'salone', 'vip']

const RIGA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'left',
  border: 0,
  borderTop: '1px solid var(--line)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
  minHeight: SIZES.row.minH,
  cursor: 'pointer',
}

const SCELTA: CSSProperties = {
  width: 'fit-content',
  flex: 'none',
  display: 'block',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  padding: 0,
  textAlign: 'left',
  cursor: 'pointer',
}

type SalonRow = {
  salonId: string
  ownerName: string
  salonName: string
  livello: LivelloElenco
  funzioni: FunzioniMappa
  piano?: 'base' | 'pro' | 'salone'
  fonte: FontePiano | null
  stato?: StatoPianoNome
  scadeIl?: string | null
}

function funzioniPulite(value: FunzioniMappa | undefined): FunzioniMappa {
  if (!value) return {}
  const out: FunzioniMappa = {}
  for (const [chiave, acceso] of Object.entries(value)) {
    if (typeof acceso === 'boolean') out[chiave] = acceso
  }
  return out
}

function pianoLetto(value: unknown): 'base' | 'pro' | 'salone' | undefined {
  return value === 'base' || value === 'pro' || value === 'salone' ? value : undefined
}

function fonteLetta(value: unknown): FontePiano | null {
  return value === 'play' || value === 'prova' || value === 'omaggio' || value === 'manuale' ? value : null
}

function statoLetto(value: unknown): StatoPianoNome | undefined {
  return statoPianoNome(value)
}

function proItems(directory: SalonDirectory): ProItem[] {
  const listed = Array.isArray(directory.pro) ? directory.pro : []
  return listed.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (typeof item.uid !== 'string' || typeof item.salonId !== 'string') return []
    const livello = item.livello && LIVELLI.includes(item.livello) ? item.livello : undefined
    const grezzo = item as Record<string, unknown>
    const scadeIl = typeof grezzo.scadeIl === 'string' || grezzo.scadeIl === null ? grezzo.scadeIl : undefined
    return [{
      uid: item.uid,
      salonId: item.salonId,
      enabled: item.enabled === true,
      livello,
      funzioni: funzioniPulite(item.funzioni),
      piano: pianoLetto(grezzo.piano),
      fonte: fonteLetta(grezzo.fonte),
      stato: statoLetto(grezzo.stato),
      scadeIl,
    }]
  })
}

function ownerOf(entries: DirectoryEntry[], salonId: string, memberUids: ReadonlySet<string>): DirectoryEntry | undefined {
  return entries.find((entry) => entry.uid === salonId) ?? entries.find((entry) => memberUids.has(entry.uid))
}

function salonRows(directory: SalonDirectory, senzaNome: string): SalonRow[] {
  const items = proItems(directory)
  const rows: SalonRow[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.salonId.trim() === '' || item.salonId === 'shared' || item.salonId.includes('/')) continue
    if (seen.has(item.salonId)) continue
    seen.add(item.salonId)
    const memberUids = new Set(items.filter((candidate) => candidate.salonId === item.salonId).map((candidate) => candidate.uid))
    const owner = ownerOf(directory.entries, item.salonId, memberUids)
    rows.push({
      salonId: item.salonId,
      ownerName: owner?.ownerName ?? senzaNome,
      salonName: owner?.salonName ?? '',
      livello: item.livello ?? (item.enabled ? 'salone' : 'base'),
      funzioni: item.funzioni ?? {},
      piano: item.piano,
      fonte: item.fonte,
      stato: item.stato,
      scadeIl: item.scadeIl,
    })
  }
  return rows
}

function tonoPiano(livello: LivelloElenco): 'sen' | 'pri' | 'tea' | 'neutral' {
  if (livello === 'vip') return 'sen'
  if (livello === 'pro') return 'pri'
  if (livello === 'salone') return 'tea'
  return 'neutral'
}

export function UsersPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const toast = useToast()
  const { tour } = usePiano()
  // Stato ottimistico dell'interruttore del tour mentre la callable è in volo
  const [tourOttimistico, setTourOttimistico] = useState<boolean | null>(null)
  const tourAcceso = tourOttimistico ?? tour.acceso
  // Mentre la callable è in volo il tocco si ignora (ogni accensione riscrive `dal`)
  const [tourInVolo, setTourInVolo] = useState(false)
  // Quando arriva il valore vero dal cloud, l'ottimistico non serve più
  useEffect(() => { setTourOttimistico(null) }, [tour.acceso])
  const [params, setParams] = useSearchParams()
  const zona = params.get('zona')
  const salonAperto = params.get('id') ?? ''
  const categoria = params.get('cat') ?? ''
  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [error, setError] = useState(false)
  const [scelti, setScelti] = useState<Record<string, PianoLocale>>({})
  const [forzate, setForzate] = useState<Record<string, FunzioniMappa>>({})
  const [aperte, setAperte] = useState<Record<string, boolean>>({})
  const [denied, setDenied] = useState<Record<string, string>>({})
  const [dialogo, setDialogo] = useState<DialogoPiano | null>(null)
  const [testo, setTesto] = useState('')
  const [note, setNote] = useState<SuggerimentoArrivato[]>([])
  const [notePronte, setNotePronte] = useState(false)
  const [segni, setSegni] = useState<Record<string, SegnoSuggerimento>>(leggiRevisione)
  const [filtro, setFiltro] = useState<FiltroCoda>('nuovo')
  const [catVista, setCatVista] = useState(categoria)
  const [spiegati, setSpiegati] = useState<Record<string, boolean>>({})
  const [esportaAperto, setEsportaAperto] = useState(false)
  const [portata, setPortata] = useState<Portata>('vista')
  const [formato, setFormato] = useState<Formato>('pdf')
  const [esportaErrore, setEsportaErrore] = useState(false)
  const [esportaOccupato, setEsportaOccupato] = useState(false)
  // Toelettatura da eliminare (solo test) e parola scritta per confermare
  const [daEliminare, setDaEliminare] = useState<SalonRow | null>(null)
  const [parolaElimina, setParolaElimina] = useState('')
  const [eliminando, setEliminando] = useState(false)

  if (categoria !== catVista) {
    setCatVista(categoria)
    setFiltro('nuovo')
    setSpiegati({})
  }

  useEffect(() => {
    if (!operator) return
    let vivo = true
    void elencoSuggerimenti().then((lista) => {
      if (!vivo) return
      setNote(lista)
      setNotePronte(true)
    }).catch(() => {
      if (!vivo) return
      setNote([])
      setNotePronte(true)
    })
    return () => {
      vivo = false
    }
  }, [operator])

  useEffect(() => {
    if (!operator) return
    let active = true
    void listSalonDirectory()
      .then((result) => {
        if (active) setDirectory(result)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [operator])

  if (!operator) return <Navigate to="/impostazioni" replace />

  const rows = directory ? salonRows(directory, frasi.uteSenzaNome) : []
  const nomi = new Map<string, string>()
  for (const entry of directory?.entries ?? []) {
    if (entry.salonName.trim() !== '') nomi.set(entry.uid, entry.salonName)
  }
  for (const row of rows) {
    if (row.salonName.trim() !== '') nomi.set(row.salonId, row.salonName)
  }

  function nomeDi(id: string): string {
    return nomi.get(id) || frasi.uteSenzaNome
  }

  function etichettaCategoria(id: string): string {
    const mappa: Record<string, string> = {
      bug: frasi.sugCatBug,
      critica: frasi.sugCatCritica,
      miglioramento: frasi.sugCatMigliora,
      manca: frasi.sugCatManca,
      agenda: frasi.sugCatAgenda,
      animali: frasi.sugCatAnimali,
      listino: frasi.sugCatListino,
      incassi: frasi.sugCatIncassi,
      account: frasi.sugCatAccount,
      lingua: frasi.sugCatLingua,
      altro: frasi.sugCatAltro,
    }
    return mappa[id] ?? id
  }

  function etichettaStato(stato: FiltroCoda): string {
    if (stato === 'interessante') return frasi.sugInteressanti
    if (stato === 'visto') return frasi.sugVisti
    return frasi.sugDaVedere
  }

  function etichettaAzione(azione: AzioneLista): string {
    if (azione === 'prova') return frasi.prova30
    return frasi.saloneOmaggio
  }

  function nomeLivello(livello: LivelloElenco): string {
    if (livello === 'vip') return frasi.uteVip
    if (livello === 'pro') return frasi.utePro
    if (livello === 'salone') return frasi.uteSalone
    return frasi.uteGratis
  }

  function livelloDi(row: SalonRow): LivelloElenco {
    if (!(row.salonId in scelti)) return row.livello
    const scelto = scelti[row.salonId]
    if (scelto === 'pro') return 'pro'
    if (scelto === 'salone') return 'salone'
    return 'base'
  }

  function pianoDi(row: SalonRow): 'base' | 'pro' | 'salone' {
    if (row.salonId in scelti) return scelti[row.salonId]
    if (row.piano === 'pro' || row.piano === 'salone') return row.piano
    if (row.livello === 'pro') return 'pro'
    if (row.livello === 'salone' || row.livello === 'vip') return 'salone'
    return 'base'
  }

  function parolaPiano(livello: LivelloElenco): string | null {
    if (livello === 'pro') return frasi.utePro
    if (livello === 'salone' || livello === 'vip') return frasi.uteSalone
    return null
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

  function alToggle(row: SalonRow, next: boolean) {
    pulisci(row.salonId)
    if (next) {
      setTesto('')
      setDialogo({ tipo: 'scegli', salonId: row.salonId })
      return
    }
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

  async function cambiaTour(next: boolean) {
    if (tourInVolo) return
    setTourInVolo(true)
    setTourOttimistico(next)
    try {
      await callImpostaTour(next)
    } catch {
      setTourOttimistico(null)
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      setTourInVolo(false)
    }
  }

  function nomeSalone(row: SalonRow): string {
    return row.salonName.trim() !== '' ? row.salonName : row.ownerName
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
      await callEliminaSalone(row.salonId)
      setDirectory((current) => current ? {
        ...current,
        pro: current.pro.filter((item) => item.salonId !== row.salonId),
        entries: current.entries.filter((entry) => entry.uid !== row.salonId),
      } : current)
      setDaEliminare(null)
      setParolaElimina('')
      setParams({ zona: 'saloni' })
      toast.show(frasi.uteEliminaFatto.replace('{{salone}}', nomeSalone(row)), 'plain')
      void listSalonDirectory().then(setDirectory).catch(() => undefined)
    } catch {
      toast.show(frasi.uteEliminaKo, 'plain')
    } finally {
      setEliminando(false)
    }
  }

  async function cambiaFunzione(salonId: string, chiave: string, next: boolean) {
    pulisci(salonId)
    try {
      await callImpostaFunzione(salonId, chiave, next)
      setForzate((current) => ({ ...current, [salonId]: { ...current[salonId], [chiave]: next } }))
    } catch (caught) {
      const message = caught instanceof Error && caught.message !== '' ? caught.message : frasi.uteNegato
      setDenied((current) => ({ ...current, [salonId]: message }))
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
    if (dialogo.tipo === 'testo') {
      const messaggio = testo.trim()
      if (messaggio.length < 1 || messaggio.length > 400) return
      await invia(dialogo.salonId, dialogo.azione, messaggio)
    }
  }

  function applica(chiave: string, stato: SegnoSuggerimento | 'nuovo') {
    setSegni((current) => {
      const next = { ...current }
      if (stato === 'nuovo') delete next[chiave]
      else next[chiave] = stato
      scriviRevisione(next)
      return next
    })
  }

  function meta(gruppo: GruppoSuggerimento): string {
    const quanti = gruppo.voci.length === 1 ? frasi.sugUna : frasi.sugTante.replace('{{n}}', String(gruppo.voci.length))
    const saloni = saloniDelGruppo(gruppo).map((id) => nomeDi(id))
    const dove = saloni.length <= 1
      ? (saloni[0] ?? '')
      : frasi.sugEAltri.replace('{{nome}}', saloni[0] ?? '').replace('{{n}}', String(saloni.length - 1))
    const primo = gruppo.voci[0]?.creato
    const quando = primo ? dataCorta(lingua, new Date(primo)) : ''
    return [quanti, dove, quando].filter((parte) => parte !== '').join(' · ')
  }

  function rigaPersona(voce: GruppoSuggerimento['voci'][number]): string {
    const quando = voce.creato ? dataCorta(lingua, new Date(voce.creato)) : ''
    return [voce.email, nomeDi(voce.salonId), quando].filter((parte) => parte !== '').join(' · ')
  }

  const gruppi = raggruppaSuggerimenti(note.filter((nota) => nota.categoria === categoria))
  const visibili = filtraGruppi(gruppi, filtro, segni)
  const conteggi = contaStati(gruppi, segni)

  function gruppiScelti(): GruppoSuggerimento[] {
    if (portata === 'tutti') return gruppi
    if (portata === 'vista') return visibili
    return filtraGruppi(gruppi, portata, segni)
  }

  function righeFile(scelti: readonly GruppoSuggerimento[]): RigaExcel[] {
    return righeEsportazione(scelti, segni).map((riga) => ({
      stato: etichettaStato(riga.stato),
      categoria: etichettaCategoria(riga.categoria),
      testo: riga.testo,
      volte: riga.volte,
      email: riga.email,
      salone: nomeDi(riga.salonId),
      data: riga.creato ? dataCorta(lingua, new Date(riga.creato)) : '',
    }))
  }

  function blocchiFile(scelti: readonly GruppoSuggerimento[]): BloccoPdf[] {
    return ordinaPerStato(scelti, segni).map((gruppo) => ({
      stato: etichettaStato(statoGruppo(gruppo.chiave, segni)),
      testo: gruppo.testo,
      persone: gruppo.voci.map((voce) => rigaPersona(voce)),
    }))
  }

  async function esporta() {
    const scelti = gruppiScelti()
    if (scelti.length === 0 || esportaOccupato) return
    setEsportaOccupato(true)
    setEsportaErrore(false)
    const quando = new Date()
    try {
      const blob = formato === 'pdf'
        ? pdfSuggerimenti(frasi.sugArrivati, blocchiFile(scelti))
        : await xlsxSuggerimenti(
          [frasi.sugStato, frasi.sugCategoria, frasi.sugSuggerimento, frasi.sugVolte, frasi.sugEmail, frasi.sugToelettatura, frasi.sugData],
          righeFile(scelti),
        )
      const nome = nomeFileSuggerimenti(quando, formato)
      if (Capacitor.isNativePlatform()) await shareFiles([{ blob, name: nome }], frasi.sugTitolo)
      else downloadAnchor(blob, nome)
      setEsportaAperto(false)
    } catch (caught) {
      if (!isShareCancel(caught)) setEsportaErrore(true)
    } finally {
      setEsportaOccupato(false)
    }
  }

  function indietro() {
    if (zona === 'coda') setParams({ zona: 'note' })
    else if (zona === 'salone') setParams({ zona: 'saloni' })
    else setParams({})
  }

  const dettaglioSaloni = error
    ? frasi.uteElencoKo
    : !directory
      ? frasi.uteCarica
      : `${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}`
  const dettaglioNote = !notePronte
    ? frasi.uteCarica
    : note.length === 0
      ? frasi.sugVuoto
      : note.length >= LIMITE_SUGGERIMENTI
        ? frasi.sugUltimiN.replace('{{n}}', String(LIMITE_SUGGERIMENTI))
        : note.length === 1
          ? frasi.sugArrivatoUno
          : frasi.sugArrivatiN.replace('{{n}}', String(note.length))

  const categorie = categorieConConteggio(note)
    .map((voce) => ({ ...voce, etichetta: etichettaCategoria(voce.categoria) }))
    .sort((a, b) => b.totale - a.totale || a.etichetta.localeCompare(b.etichetta, 'it'))

  const rigaSalone = salonAperto ? rows.find((row) => row.salonId === salonAperto) : undefined
  const chiesto = dialogo ? rows.find((row) => row.salonId === dialogo.salonId) : undefined
  const messaggioPronto = testo.trim().length >= 1 && testo.trim().length <= 400

  function titoloDialogo(): string {
    if (!dialogo) return ''
    if (dialogo.tipo === 'azione') return etichettaAzione(dialogo.azione)
    if (dialogo.tipo === 'omaggio') return frasi.bypassOmaggio
    if (dialogo.tipo === 'testo') return frasi.bypassMessaggio
    return frasi.bypassScegli
  }
  const personeScelte = gruppiScelti().reduce((totale, gruppo) => totale + gruppo.voci.length, 0)
  const frasePersone = personeScelte === 1 ? frasi.sugPersona : frasi.sugPersone.replace('{{n}}', String(personeScelte))

  let titolo: string = frasi.uteTitolo
  let sottotitolo: string | undefined
  let onBack: (() => void) | undefined
  let backTo: string | undefined = '/impostazioni'
  if (zona === 'saloni') {
    titolo = frasi.uteToelettature
    onBack = indietro
    backTo = undefined
  } else if (zona === 'salone' && rigaSalone) {
    titolo = rigaSalone.salonName.trim() !== '' ? rigaSalone.salonName : rigaSalone.ownerName
    sottotitolo = rigaSalone.salonName.trim() !== '' ? rigaSalone.ownerName : undefined
    onBack = indietro
    backTo = undefined
  } else if (zona === 'note') {
    titolo = frasi.sugTitolo
    onBack = indietro
    backTo = undefined
  } else if (zona === 'coda') {
    titolo = etichettaCategoria(categoria)
    onBack = indietro
    backTo = undefined
  }

  const vuotoCoda = filtro === 'interessante' ? frasi.sugNessunSegno : filtro === 'visto' ? frasi.sugNessunVisto : frasi.sugNiente

  return (
    <ShellFrame>
      <Header title={titolo} subtitle={sottotitolo} backTo={backTo} onBack={onBack} />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {zona === 'saloni' ? (
          rows.length === 0 ? (directory ? <p style={{ margin: 0 }}>{frasi.uteNessuna}</p> : <AttesaRiga testo={frasi.uteCarica} />) : (
            <Card>
              {rows.map((row, index) => {
                const livello = livelloDi(row)
                const nome = row.salonName.trim() !== '' ? row.salonName : row.ownerName
                return (
                  <button
                    key={row.salonId}
                    type="button"
                    aria-label={`${nome}, ${row.ownerName}`}
                    onClick={() => setParams({ zona: 'salone', id: row.salonId })}
                    style={{ ...RIGA, borderTop: index === 0 ? 'none' : RIGA.borderTop }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{nome}</span>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{row.ownerName}</span>
                    </span>
                    <Chip tone={tonoPiano(livello)}>{nomeLivello(livello)}</Chip>
                    <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                  </button>
                )
              })}
            </Card>
          )
        ) : zona === 'salone' && rigaSalone ? (
          <Scheda
            row={rigaSalone}
            livello={livelloDi(rigaSalone)}
            funzioni={{ ...rigaSalone.funzioni, ...forzate[rigaSalone.salonId] }}
            aperta={aperte[rigaSalone.salonId] === true}
            problem={denied[rigaSalone.salonId] ?? ''}
            nomeLivello={nomeLivello(livelloDi(rigaSalone))}
            parola={parolaPiano(livelloDi(rigaSalone))}
            onToggle={(next) => { alToggle(rigaSalone, next) }}
            onScegli={() => {
              setTesto('')
              setDialogo({ tipo: 'scegli', salonId: rigaSalone.salonId })
            }}
            onChiedi={(azione) => setDialogo({ tipo: 'azione', salonId: rigaSalone.salonId, azione })}
            onApri={() => setAperte((current) => ({ ...current, [rigaSalone.salonId]: current[rigaSalone.salonId] !== true }))}
            onFunzione={(chiave, next) => { void cambiaFunzione(rigaSalone.salonId, chiave, next) }}
            onElimina={() => {
              setParolaElimina('')
              setDaEliminare(rigaSalone)
            }}
          />
        ) : zona === 'salone' ? (
          (directory ? <p style={{ margin: 0 }}>{frasi.uteNessuna}</p> : <AttesaRiga testo={frasi.uteCarica} />)
        ) : zona === 'note' ? (
          categorie.length === 0 ? <p style={{ margin: 0 }}>{frasi.sugVuoto}</p> : (
            <Card>
              {categorie.map((voce, index) => (
                <button
                  key={voce.categoria}
                  type="button"
                  aria-label={`${voce.etichetta}, ${voce.totale}`}
                  onClick={() => setParams({ zona: 'coda', cat: voce.categoria })}
                  style={{ ...RIGA, borderTop: index === 0 ? 'none' : RIGA.borderTop, alignItems: 'flex-start' }}
                >
                  <span style={{ flex: 1, fontWeight: 600, ...USER_TEXT }}>{voce.etichetta}</span>
                  <span aria-hidden style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{voce.totale}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </button>
              ))}
            </Card>
          )
        ) : zona === 'coda' ? (
          <>
            <Segmented
              fill
              label={frasi.sugTitolo}
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'nuovo', label: `${frasi.sugDaVedere} ${conteggi.nuovo}` },
                { value: 'interessante', label: `${frasi.sugInteressanti} ${conteggi.interessante}` },
                { value: 'visto', label: `${frasi.sugVisti} ${conteggi.visto}` },
              ]}
            />
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => {
                setPortata('vista')
                setFormato('pdf')
                setEsportaErrore(false)
                setEsportaAperto(true)
              }}
            >
              {frasi.sugEsporta}
            </Button>
            {visibili.length === 0 ? <p style={{ margin: 0 }}>{vuotoCoda}</p> : (
              <Card>
                {visibili.map((gruppo, index) => {
                  const interessante = statoGruppo(gruppo.chiave, segni) === 'interessante'
                  return (
                    <div key={gruppo.chiave} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingRight: 4 }}>
                        <button
                          type="button"
                          aria-expanded={spiegati[gruppo.chiave] === true}
                          onClick={() => setSpiegati((current) => ({ ...current, [gruppo.chiave]: current[gruppo.chiave] !== true }))}
                          style={{ ...RIGA, borderTop: 'none', flex: 1, alignItems: 'flex-start' }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{gruppo.testo}</span>
                            <span style={{ display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{meta(gruppo)}</span>
                          </span>
                        </button>
                        <span style={{ display: 'flex', flexDirection: 'column', flex: 'none' }}>
                          <button
                            type="button"
                            aria-pressed={interessante}
                            aria-label={interessante ? frasi.sugTogli : frasi.sugSegna}
                            onClick={() => applica(gruppo.chiave, interessante ? 'nuovo' : 'interessante')}
                            style={{ width: 44, height: 44, border: 0, background: 'transparent', color: interessante ? 'var(--sen)' : 'var(--tx3)', display: 'grid', placeItems: 'center', padding: 0 }}
                          >
                            <Star size={18} strokeWidth={2} fill={interessante ? 'currentColor' : 'none'} aria-hidden />
                          </button>
                          {filtro === 'nuovo' ? (
                            <button
                              type="button"
                              onClick={() => applica(gruppo.chiave, 'visto')}
                              style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--tx2)', font: 'inherit', fontWeight: 600, padding: '8px 10px' }}
                            >
                              {frasi.sugVisto}
                            </button>
                          ) : null}
                        </span>
                      </div>
                      {spiegati[gruppo.chiave] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
                          {gruppo.voci.map((voce) => (
                            <span key={voce.id} style={{ fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{rigaPersona(voce)}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </Card>
            )}
          </>
        ) : (
          <>
            <SectionTitle>{frasi.uteImpostazioniUtenti}</SectionTitle>
            <Card>
              <Row style={{ borderTop: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, ...USER_TEXT }}>{frasi.uteTourTitolo}</div>
                  <div style={{ fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.uteTourAiuto}</div>
                </div>
                <Toggle checked={tourAcceso} disabled={tourInVolo} label={frasi.uteTourTitolo} onChange={(next) => { void cambiaTour(next) }} />
              </Row>
            </Card>
            <Card>
              <button
                type="button"
                onClick={() => {
                  if (!directory || error) return
                  setParams({ zona: 'saloni' })
                }}
                style={{ ...RIGA, borderTop: 'none' }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{frasi.uteToelettature}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{dettaglioSaloni}</span>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!notePronte) return
                  setParams({ zona: 'note' })
                }}
                style={RIGA}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{frasi.sugTitolo}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{dettaglioNote}</span>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </button>
            </Card>
          </>
        )}
      </div>
      <Dialog
        open={chiesto !== undefined && dialogo !== null}
        title={titoloDialogo()}
        onClose={chiudiDialogo}
      >
        {chiesto && dialogo?.tipo === 'azione' ? (
          <>
            <p style={{ margin: 0, ...USER_TEXT }}>
              {frasi.uteConfermaPiano
                .replace('{{azione}}', etichettaAzione(dialogo.azione))
                .replace('{{salone}}', chiesto.salonName.trim() !== '' ? chiesto.salonName : chiesto.ownerName)
                .replace('{{nome}}', chiesto.ownerName)}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={chiudiDialogo}>{frasi.uteAnnulla}</Button>
              <Button style={{ flex: 1 }} onClick={() => { void confermaPiano() }}>{frasi.uteConferma}</Button>
            </div>
          </>
        ) : null}
        {chiesto && dialogo?.tipo === 'scegli' ? (
          <>
            <button type="button" onClick={() => scegliBypass(chiesto, 'bypass-pro')} style={SCELTA}>{frasi.utePro}</button>
            <button type="button" onClick={() => scegliBypass(chiesto, 'bypass-salone')} style={SCELTA}>{frasi.uteSalone}</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={chiudiDialogo}>{frasi.uteAnnulla}</Button>
            </div>
          </>
        ) : null}
        {chiesto && dialogo?.tipo === 'omaggio' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={chiudiDialogo}>{frasi.uteAnnulla}</Button>
            <Button style={{ flex: 1 }} onClick={() => { void confermaPiano() }}>{frasi.uteConferma}</Button>
          </div>
        ) : null}
        {chiesto && dialogo?.tipo === 'testo' ? (
          <>
            <textarea
              value={testo}
              aria-label={frasi.bypassMessaggio}
              onChange={(event) => setTesto(event.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', padding: 8, border: '1px solid var(--line)', borderRadius: 8, resize: 'vertical' }}
            />
            <p style={{ margin: 0, ...USER_TEXT }}>{frasi.bypassNotaPlay}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={chiudiDialogo}>{frasi.uteAnnulla}</Button>
              <Button style={{ flex: 1 }} disabled={!messaggioPronto} onClick={() => { void confermaPiano() }}>{frasi.uteConferma}</Button>
            </div>
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
      <Dialog open={esportaAperto} title={frasi.sugEsporta} onClose={() => setEsportaAperto(false)}>
        <div role="radiogroup" aria-label={frasi.sugPortata} style={{ display: 'flex', flexDirection: 'column' }}>
          {([
            ['vista', frasi.sugQuelliVista],
            ['interessante', frasi.sugInteressanti],
            ['visto', frasi.sugVisti],
            ['tutti', frasi.sugAncheVisti],
          ] as const).map(([value, label]) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, ...USER_TEXT }}>
              <input type="radio" name="portata-suggerimenti" checked={portata === value} onChange={() => setPortata(value)} />
              {label}
            </label>
          ))}
        </div>
        <Segmented
          fill
          label={frasi.sugFormato}
          value={formato}
          onChange={setFormato}
          options={[{ value: 'pdf', label: frasi.sugPdf }, { value: 'xlsx', label: frasi.sugExcel }]}
        />
        <p style={{ margin: 0 }}>{frasePersone}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.sugEsportaNota}</p>
        {esportaErrore ? <p style={{ margin: 0 }}>{frasi.sugEsportaKo}</p> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setEsportaAperto(false)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={esportaOccupato || personeScelte === 0} onClick={() => { void esporta() }}>{frasi.sugEsporta}</Button>
        </div>
      </Dialog>
    </ShellFrame>
  )
}

function Scheda({
  row,
  livello,
  funzioni,
  aperta,
  problem,
  nomeLivello,
  parola,
  onToggle,
  onScegli,
  onChiedi,
  onApri,
  onFunzione,
  onElimina,
}: {
  row: SalonRow
  livello: LivelloElenco
  funzioni: FunzioniMappa
  aperta: boolean
  problem: string
  nomeLivello: string
  parola: string | null
  onToggle: (next: boolean) => void
  onScegli: () => void
  onChiedi: (azione: AzioneLista) => void
  onApri: () => void
  onFunzione: (chiave: string, next: boolean) => void
  onElimina: () => void
}) {
  const frasi = useFrasi()
  const etichette: Record<(typeof CHIAVI_FUNZIONE)[number], string> = {
    messaggi: frasi.strumMessaggi,
    affidabilita: frasi.strumAffidabilita,
    prenotazioni: frasi.prenotazioniOnline,
    listaAttesa: frasi.listaAttesa,
    fedelta: frasi.tesseraFedelta,
    recensioni: frasi.recensione,
    pagella: frasi.pagella,
    statistiche: frasi.statistiche,
    team: frasi.team,
  }
  const azioni: AzioneLista[] = ['prova', 'salone']
  return (
    <>
      <SectionTitle>{frasi.uteServizio}</SectionTitle>
      <Card>
        <div>
          <Row style={{ borderTop: 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, ...USER_TEXT }}>{row.ownerName}</div>
              <Chip tone={tonoPiano(livello)}>{nomeLivello}</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
              {parola ? (
                <button type="button" onClick={onScegli} style={SCELTA}>{parola}</button>
              ) : null}
              <Toggle
                checked={livello === 'pro' || livello === 'salone' || livello === 'vip'}
                label={frasi.servizioSalonePer.replace('{{nome}}', row.ownerName)}
                onChange={onToggle}
              />
            </div>
          </Row>
          {problem !== '' ? <p style={{ margin: 0, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>{problem}</p> : null}
        </div>
        {azioni.map((azione) => {
          const etichetta = azione === 'prova' ? frasi.prova30 : frasi.saloneOmaggio
          return (
            <button key={azione} type="button" onClick={() => onChiedi(azione)} style={{ ...RIGA, fontWeight: 600, ...USER_TEXT }}>
              {frasi.perPersona.replace('{{etichetta}}', etichetta).replace('{{nome}}', row.ownerName)}
            </button>
          )
        })}
        <button type="button" aria-expanded={aperta} onClick={onApri} style={{ ...RIGA, fontWeight: 600 }}>
          {frasi.uteFunzioni}
        </button>
        {aperta ? (
          <div style={{ display: 'flex', flexDirection: 'column', padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
            {CHIAVI_FUNZIONE.map((chiave) => {
              const forzata = typeof funzioni[chiave] === 'boolean'
              return (
                <div key={chiave} style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 12 }}>
                  <span style={{ flex: 1, ...USER_TEXT }}>
                    {etichette[chiave]}
                    {forzata ? <span style={{ color: 'var(--tx3)' }}>{` · ${funzioni[chiave] ? frasi.uteAccesaMano : frasi.uteSpentaMano}`}</span> : null}
                  </span>
                  <Toggle
                    checked={funzioneAccesa(livello, funzioni, chiave)}
                    label={etichette[chiave]}
                    onChange={(next) => onFunzione(chiave, next)}
                  />
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 12 }}>
              <span style={{ flex: 1, ...USER_TEXT }}>{frasi.waAuto}</span>
              <span>{frasi.daSviluppare}</span>
            </div>
          </div>
        ) : null}
      </Card>
      <Card>
        <button type="button" onClick={onElimina} style={{ ...RIGA, borderTop: 'none', color: 'var(--bad)' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{frasi.uteElimina}</span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.uteEliminaAiuto}</span>
          </span>
        </button>
      </Card>
    </>
  )
}
