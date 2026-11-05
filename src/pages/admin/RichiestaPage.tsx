import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminDati } from '../../components/admin/AdminDati'
import { AIUTO } from '../../components/admin/comuni'
import { useEtichettaCategoria } from '../../components/admin/etichettaCategoria'
import { RigaFeedback } from '../../components/admin/FeedbackAdmin'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Dialog } from '../../components/layout/Dialog'
import { useToast } from '../../components/layout/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { Segmented } from '../../components/ui/Segmented'
import { Toggle } from '../../components/ui/Toggle'
import { AttesaRiga } from '../../components/ui/Zampette'
import {
  callEliminaModelloAssistenza,
  callImpostaStatoAssistenza,
  callRispondiAssistenza,
  callSalvaModelloAssistenza,
  elencoModelliAssistenza,
  type ModelloAssistenza,
} from '../../data/firebase/adminClient'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { STATI_ASSISTENZA, type EsitoEmailRisposta, type StatoAssistenza } from '../../lib/assistenza'
import { TESTO_MAX, TITOLO_MAX } from '../../lib/avvisiSistema'
import { PERCORSO_ASSISTENZA, percorsoSalone } from '../../lib/percorsoAdmin'
import { USER_TEXT } from '../../theme/text'
import { useNomeStato } from './AssistenzaPage'
import { CORPO } from './comune'

const CAMPO = { font: 'inherit', padding: 10, borderRadius: 10, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', outline: 'none', width: '100%', boxSizing: 'border-box' } as const

export function RichiestaPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const navigate = useNavigate()
  const nomeStato = useNomeStato()
  const etichettaCategoria = useEtichettaCategoria()
  const { id = '' } = useParams()
  const { richieste, richiestePronte, feedback, nomeDi, ricaricaAssistenza } = useAdminDati()
  const [testo, setTesto] = useState('')
  const [anchEmail, setAnchEmail] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const [modelli, setModelli] = useState<ModelloAssistenza[]>([])
  const [nomeModello, setNomeModello] = useState<string | null>(null)
  const idRichiesta = useRef(crypto.randomUUID())

  const caricaModelli = () => { void elencoModelliAssistenza().then(setModelli).catch(() => undefined) }
  useEffect(caricaModelli, [])

  const richiesta = richieste.find((r) => r.chiave === id)
  const indietro = () => navigate(PERCORSO_ASSISTENZA)

  if (!richiesta) {
    return (
      <>
        <TestataAdmin titolo={frasi.consAssistenza} onBack={indietro} />
        <div style={CORPO}>{richiestePronte ? <p style={{ margin: 0 }}>{frasi.consNessunaRichiesta}</p> : <AttesaRiga testo={frasi.uteCarica} />}</div>
      </>
    )
  }
  const { fonte, idOrigine } = richiesta
  const scheda = fonte === 'feedback' ? feedback.find((f) => f.id === idOrigine) : undefined

  function errore(caught: unknown) {
    toast.show(caught instanceof Error && caught.message !== '' ? caught.message : frasi.amAzioneKo, 'plain')
  }

  async function cambiaStato(stato: StatoAssistenza) {
    try {
      await callImpostaStatoAssistenza({ fonte, id: idOrigine, stato })
      ricaricaAssistenza()
    } catch (caught) {
      errore(caught)
    }
  }

  function esitoEmail(email: EsitoEmailRisposta): string {
    if (email === 'limite') return frasi.consEmailLimite
    if (email === 'non_inviata') return frasi.consEmailKo
    return frasi.consRispostaInviata
  }

  async function rispondi() {
    if (occupato || testo.trim() === '') return
    setOccupato(true)
    try {
      const email = await callRispondiAssistenza({ fonte, id: idOrigine, testo, anchEmail, idRichiesta: idRichiesta.current })
      idRichiesta.current = crypto.randomUUID()
      setTesto('')
      ricaricaAssistenza()
      toast.show(esitoEmail(email), email === 'limite' || email === 'non_inviata' ? 'plain' : 'ok')
    } catch (caught) {
      errore(caught)
    } finally {
      setOccupato(false)
    }
  }

  async function salvaModello() {
    const titolo = (nomeModello ?? '').trim()
    if (titolo === '') return
    setNomeModello(null)
    try {
      await callSalvaModelloAssistenza({ titolo, testo })
      caricaModelli()
    } catch (caught) {
      errore(caught)
    }
  }

  async function eliminaModello(modello: ModelloAssistenza) {
    try {
      await callEliminaModelloAssistenza(modello.id)
      caricaModelli()
    } catch (caught) {
      errore(caught)
    }
  }

  const meta = [richiesta.email, richiesta.categoria ? etichettaCategoria(richiesta.categoria) : frasi.consFonteFeedback, richiesta.quando ? dataCorta(lingua, new Date(richiesta.quando)) : ''].filter((p) => p !== '').join(' · ')

  return (
    <>
      <TestataAdmin titolo={nomeDi(richiesta.salonId)} sottotitolo={meta} onBack={indietro} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        <Card>
          {scheda ? <RigaFeedback feedback={scheda} nome="" primo /> : <p style={{ margin: 0, padding: 12, whiteSpace: 'pre-line', ...USER_TEXT }}>{richiesta.testo}</p>}
        </Card>
        <Link to={percorsoSalone(richiesta.salonId)} style={{ color: 'var(--pri)', fontWeight: 600 }}>{frasi.consApriSalone}</Link>
        <Segmented
          fill
          label={frasi.consStato}
          value={richiesta.stato}
          onChange={(stato) => { void cambiaStato(stato) }}
          options={STATI_ASSISTENZA.map((s) => ({ value: s, label: nomeStato[s] }))}
        />
        {richiesta.risposte.length > 0 ? (
          <>
            <SectionTitle color="var(--tx3)">{frasi.consRisposte}</SectionTitle>
            {richiesta.risposte.map((r) => (
              <Card key={r.quando} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ whiteSpace: 'pre-line', ...USER_TEXT }}>{r.testo}</span>
                <span style={AIUTO}>{[dataCorta(lingua, new Date(r.quando)), r.email === 'inviata' ? frasi.consConEmail : r.email ? frasi.consSenzaEmail : ''].filter((p) => p !== '').join(' · ')}</span>
              </Card>
            ))}
          </>
        ) : null}
        <SectionTitle color="var(--tx3)">{frasi.consRispondi}</SectionTitle>
        {modelli.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-label={frasi.consModelli}>
            {modelli.map((m) => (
              <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Button variant="secondary" size="sm" onClick={() => setTesto(m.testo)}>{m.titolo}</Button>
                <button type="button" aria-label={frasi.consEliminaModello.replace('{{nome}}', m.titolo)} onClick={() => { void eliminaModello(m) }} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', minWidth: 32, minHeight: 32, display: 'grid', placeItems: 'center' }}>
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <textarea aria-label={frasi.consTestoRisposta} rows={5} maxLength={TESTO_MAX} value={testo} onChange={(e) => setTesto(e.target.value)} style={CAMPO} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{frasi.consAncheEmail}</span>
          <Toggle checked={anchEmail} label={frasi.consAncheEmail} onChange={setAnchEmail} />
        </label>
        <p style={{ ...AIUTO, margin: 0 }}>{frasi.consNotaApk}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" disabled={testo.trim() === ''} onClick={() => setNomeModello('')}>{frasi.consSalvaModello}</Button>
          <Button style={{ flex: 1 }} disabled={occupato || testo.trim() === ''} onClick={() => { void rispondi() }}>{frasi.consInviaRisposta}</Button>
        </div>
      </div>
      <Dialog open={nomeModello !== null} title={frasi.consSalvaModello} onClose={() => setNomeModello(null)}>
        <input aria-label={frasi.consNomeModello} maxLength={TITOLO_MAX} value={nomeModello ?? ''} onChange={(e) => setNomeModello(e.target.value)} style={CAMPO} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setNomeModello(null)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={(nomeModello ?? '').trim() === ''} onClick={() => { void salvaModello() }}>{frasi.uteConferma}</Button>
        </div>
      </Dialog>
    </>
  )
}
