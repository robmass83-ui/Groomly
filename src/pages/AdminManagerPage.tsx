import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BarraTab, tabDi, type TabAdmin } from '../components/admin/TabAdmin'
import { CategorieSuggerimenti, CodaCategoria, suggerimentiDaVedere, useEtichettaCategoria } from '../components/admin/CodaSuggerimenti'
import { STILE_ADMIN } from '../components/admin/comuni'
import { DialogoInvitoBeta, type SceltaInvito } from '../components/admin/DialogoInvitoBeta'
import { FeedbackAdmin } from '../components/admin/FeedbackAdmin'
import { BarraSelezione, ListaSaloni, type FiltroInvito } from '../components/admin/ListaSaloni'
import { PanoramicaAdmin } from '../components/admin/PanoramicaAdmin'
import { PianiPagamenti } from '../components/admin/PianiPagamenti'
import { SchedaSalone, type VistaScheda } from '../components/admin/SchedaSalone'
import { useAzioniPiano } from '../components/admin/useAzioniPiano'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { AttesaRiga } from '../components/ui/Zampette'
import {
  callContatoriAdmin,
  callEstendiBeta,
  callInvitaBeta,
  callRevocaBeta,
  callSegnaEarlyAdopter,
  elencoFeedbackBeta,
  elencoInvitiBeta,
  listenConfigGlobale,
  storicoInvitoBeta,
  type ConfigGlobale,
  type EsitoInvito,
  type MotivoSaltato,
} from '../data/firebase/adminClient'
import { elencoSuggerimenti, listSalonDirectory, type SuggerimentoArrivato } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { dataCorta } from '../i18n/format'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
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
} from '../lib/adminManager'
import { leggiRevisione, scriviRevisione, type SegnoSuggerimento } from '../lib/revisioneSuggerimenti'
import { accountSummary, salonSummary, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { ShellFrame } from './ShellFrame'

const CHIAVE_FEEDBACK_VISTI = 'groomly.am.feedbackVisti'
const CACHE_CONTATORI_MS = 60_000
const FILTRI_INVITO: readonly FiltroInvito[] = ['tutti', 'invitato', 'accettato', 'rifiutato', 'scaduto', 'revocato']

function leggiVisti(): Set<string> {
  try {
    const grezzo: unknown = JSON.parse(localStorage.getItem(CHIAVE_FEEDBACK_VISTI) ?? '[]')
    return new Set(Array.isArray(grezzo) ? grezzo.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function scriviVisti(visti: ReadonlySet<string>) {
  try {
    localStorage.setItem(CHIAVE_FEEDBACK_VISTI, JSON.stringify([...visti]))
  } catch {
    // memoria piena o negata: si rivedranno come nuovi
  }
}

function vistaDi(valore: string | null): VistaScheda {
  return valore === 'storico' || valore === 'feedback' ? valore : 'azioni'
}

export function AdminManagerPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const toast = useToast()
  const etichettaCategoria = useEtichettaCategoria()
  const [params, setParams] = useSearchParams()
  const tab = tabDi(params.get('tab'))
  const salonAperto = params.get('id') ?? ''
  const categoria = params.get('cat') ?? ''
  const vista = vistaDi(params.get('vista'))
  const filtroInvito = FILTRI_INVITO.find((f) => f === params.get('stato')) ?? 'tutti'
  const [adesso] = useState(() => new Date())

  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [erroreDirectory, setErroreDirectory] = useState(false)
  const [note, setNote] = useState<SuggerimentoArrivato[]>([])
  const [notePronte, setNotePronte] = useState(false)
  const [segni, setSegni] = useState<Record<string, SegnoSuggerimento>>(leggiRevisione)
  const [inviti, setInviti] = useState<InvitoAdmin[]>([])
  const [feedback, setFeedback] = useState<FeedbackLetto[]>([])
  const [feedbackPronti, setFeedbackPronti] = useState(false)
  const [erroreFeedback, setErroreFeedback] = useState(false)
  const [visti, setVisti] = useState<Set<string>>(leggiVisti)
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

  useEffect(() => {
    if (!operator) return
    let vivo = true
    caricaDirectory()
    caricaInviti()
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
  }, [operator, caricaDirectory, caricaInviti])

  // Numeri: all'apertura e a ogni ritorno sulla Panoramica, al massimo una volta al minuto.
  useEffect(() => {
    if (!operator || tab !== 'panoramica') return
    if (Date.now() - ultimiContatori.current < CACHE_CONTATORI_MS) return
    caricaContatori()
  }, [operator, tab, caricaContatori])

  // Aprire il tab Feedback segna come visti quelli arrivati.
  useEffect(() => {
    if (tab !== 'feedback' || feedback.every((f) => visti.has(f.id))) return
    const prossimi = new Set([...visti, ...feedback.map((f) => f.id)])
    setVisti(prossimi)
    scriviVisti(prossimi)
  }, [tab, feedback, visti])

  const rows = useMemo(() => (directory ? salonRows(directory, frasi.uteSenzaNome) : []), [directory, frasi.uteSenzaNome])
  const azioni = useAzioniPiano(rows, (row) => {
    setDirectory((current) => current ? {
      ...current,
      pro: current.pro.filter((item) => item.salonId !== row.salonId),
      entries: current.entries.filter((entry) => entry.uid !== row.salonId),
    } : current)
    setParams({ tab: 'saloni' })
    caricaDirectory()
  })

  if (!operator) return <Navigate to="/impostazioni" replace />

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
  const daVedere = suggerimentiDaVedere(note, segni)
  const daFare = daFareOggi({ inviti, fineBeta, feedback, feedbackVisti: visti, suggerimentiDaVedere: daVedere }, adesso)
  const nuovi: Partial<Record<TabAdmin, number>> = {
    beta: righe.filter((r) => r.beta === 'invitato').length,
    feedback: feedback.filter((f) => !visti.has(f.id)).length,
    suggerimenti: daVedere,
  }

  function vai(prossimi: Record<string, string>) {
    setParams(prossimi)
  }

  function cambiaTab(prossimo: TabAdmin) {
    setSelezione(null)
    vai(prossimo === 'panoramica' ? {} : { tab: prossimo })
  }

  function apriSalone(salonId: string, vistaScheda?: VistaScheda) {
    setSelezione(null)
    vai({ tab: tab === 'beta' ? 'beta' : 'saloni', id: salonId, ...(vistaScheda && vistaScheda !== 'azioni' ? { vista: vistaScheda } : {}) })
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

  const rigaAperta = salonAperto ? righe.find((r) => r.row.salonId === salonAperto) : undefined
  const inDettaglio = salonAperto !== '' && (tab === 'saloni' || tab === 'beta')
  const inCoda = tab === 'suggerimenti' && categoria !== ''
  const riepilogoAccount = directory ? `${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}` : ''

  let titolo: string = frasi.adminManager
  let sottotitolo: string | undefined
  let onBack: (() => void) | undefined
  let backTo: string | undefined = '/impostazioni'
  let azioneTestata: ReactNode = null
  if (inDettaglio && rigaAperta) {
    titolo = nomeSalone(rigaAperta.row)
    sottotitolo = [rigaAperta.row.salonName.trim() !== '' ? rigaAperta.row.ownerName : '', rigaAperta.info.citta ?? ''].filter(Boolean).join(' · ') || undefined
    onBack = () => vai({ tab })
    backTo = undefined
  } else if (inDettaglio) {
    onBack = () => vai({ tab })
    backTo = undefined
  } else if (inCoda) {
    titolo = etichettaCategoria(categoria)
    onBack = () => vai({ tab: 'suggerimenti' })
    backTo = undefined
  } else if (selezione) {
    titolo = frasi.amSelezionati.replace('{{n}}', String(selezione.size))
    onBack = () => setSelezione(null)
    backTo = undefined
    azioneTestata = (
      <button type="button" onClick={() => setSelezione(new Set(rows.map((r) => r.salonId)))} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, minHeight: 44, padding: '0 6px' }}>
        {frasi.amTutti}
      </button>
    )
  } else if (tab === 'saloni' && directory) {
    azioneTestata = (
      <button type="button" onClick={() => setSelezione(new Set())} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, minHeight: 44, padding: '0 6px' }}>
        {frasi.amSeleziona}
      </button>
    )
  }

  const nomiInvito = (invito?.salonIds ?? []).map(nomeDi)
  const salonEstendi = estendi30 ? nomeDi(estendi30) : ''

  return (
    <ShellFrame>
      <style>{STILE_ADMIN}</style>
      <Header title={titolo} subtitle={sottotitolo} backTo={backTo} onBack={onBack} action={azioneTestata} />
      {inDettaglio || inCoda ? null : <BarraTab tab={tab} onTab={cambiaTab} nuovi={nuovi} />}
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {inDettaglio ? (
          rigaAperta ? (
            <SchedaSalone
              key={rigaAperta.row.salonId}
              row={rigaAperta.row}
              livello={rigaAperta.livello}
              pianoAttuale={azioni.pianoDi(rigaAperta.row)}
              beta={rigaAperta.beta}
              invito={invitiPer.get(rigaAperta.row.salonId)}
              info={rigaAperta.info}
              feedback={feedback.filter((f) => f.salonId === rigaAperta.row.salonId)}
              problema={azioni.problema(rigaAperta.row.salonId)}
              vista={vista}
              onVista={(v) => vai({ tab, id: rigaAperta.row.salonId, ...(v === 'azioni' ? {} : { vista: v }) })}
              caricaStorico={() => storicoInvitoBeta(rigaAperta.row.salonId)}
              onGo={() => azioni.tornaGo(rigaAperta.row)}
              onAttiva={(piano) => azioni.attiva(rigaAperta.row, piano)}
              onRegala={() => azioni.regala(rigaAperta.row)}
              onElimina={() => azioni.elimina(rigaAperta.row)}
              onInvita={(piano) => setInvito({ salonIds: [rigaAperta.row.salonId], piano })}
              onEstendi={(giorni) => esegui(() => callEstendiBeta({ salonId: rigaAperta.row.salonId, giorni }))}
              onRevoca={(testo) => esegui(async () => {
                const esito = await callRevocaBeta({ salonId: rigaAperta.row.salonId, ...(testo ? { testo } : {}) })
                if (esito.emailStato === 'non_inviata') toast.show(frasi.bypassMailKo, 'plain')
              })}
              onRevocaInvito={() => esegui(() => callRevocaBeta({ salonId: rigaAperta.row.salonId }))}
              onEarly={(valore) => esegui(() => callSegnaEarlyAdopter({ salonId: rigaAperta.row.salonId, valore }))}
              adesso={adesso}
            />
          ) : directory || erroreDirectory ? <p style={{ margin: 0 }}>{frasi.uteNessuna}</p> : <AttesaRiga testo={frasi.uteCarica} />
        ) : tab === 'panoramica' ? (
          <PanoramicaAdmin
            contatori={contatori}
            errore={erroreContatori}
            onRiprova={caricaContatori}
            daFare={daFare}
            nomeDi={nomeDi}
            apri={(prossimo, stato) => vai({ tab: prossimo, ...(stato ? { stato } : {}) })}
            onSalone={(id) => vai({ tab: 'saloni', id })}
            onEstendi30={setEstendi30}
            riepilogoAccount={riepilogoAccount}
          />
        ) : tab === 'saloni' || tab === 'beta' ? (
          <>
            <ListaSaloni
              modo={tab}
              righe={righe}
              pronte={directory !== null}
              errore={erroreDirectory && directory === null}
              inviti={invitiPer}
              filtri={filtri}
              onFiltri={setFiltri}
              filtroInvito={filtroInvito}
              onFiltroInvito={(f) => vai({ tab: 'beta', ...(f === 'tutti' ? {} : { stato: f }) })}
              conAttivita={contatori?.perSalone != null}
              selezione={tab === 'saloni' ? selezione : null}
              onSelezione={setSelezione}
              onApri={(id) => apriSalone(id)}
              adesso={adesso}
            />
            {tab === 'saloni' && selezione ? (
              <BarraSelezione
                n={selezione.size}
                onAnnulla={() => setSelezione(null)}
                onInvita={(piano) => setInvito({ salonIds: [...selezione], piano })}
                onRegala={() => setRegalaTutti(true)}
              />
            ) : null}
          </>
        ) : tab === 'feedback' ? (
          <FeedbackAdmin feedback={feedback} pronti={feedbackPronti} errore={erroreFeedback} nomeDi={nomeDi} onApri={(id) => vai({ tab: 'saloni', id, vista: 'feedback' })} />
        ) : tab === 'suggerimenti' ? (
          inCoda
            ? <CodaCategoria key={categoria} note={note} categoria={categoria} segni={segni} applica={applica} nomeDi={nomeDi} />
            : <CategorieSuggerimenti note={note} pronte={notePronte} onApri={(cat) => vai({ tab: 'suggerimenti', cat })} />
        ) : (
          <PianiPagamenti config={config} />
        )}
      </div>
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
    </ShellFrame>
  )
}
