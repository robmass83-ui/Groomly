import { useEffect, useRef, useState } from 'react'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'
import {
  callAnteprimaComunicazione,
  callInviaComunicazione,
  type AnteprimaComunicazione,
  type InputComunicazione,
} from '../../data/firebase/adminClient'
import { LINGUE, NOMI_LINGUA, type Lingua } from '../../i18n/lingua'
import { useFrasi } from '../../i18n/LinguaContext'
import { FILTRI_VUOTI, filtraSaloni, type Filtri } from '../../lib/adminManager'
import { TESTO_MAX, TIPI_AVVISO, TITOLO_MAX, testoPerLingua, type TipoAvviso, type Traduzioni } from '../../lib/avvisiSistema'
import { USER_TEXT } from '../../theme/text'
import { useAdminDati } from './AdminDati'
import { AIUTO } from './comuni'
import { ListaSaloni } from './ListaSaloni'
import { useRiconferma } from './RiconfermaPassword'

const ATTESA_ANTEPRIMA_MS = 300
const CAMPO = { font: 'inherit', padding: 10, borderRadius: 10, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', outline: 'none', width: '100%', boxSizing: 'border-box' } as const

type Testi = Record<Lingua, { titolo: string; testo: string }>
type TipoEmail = 'promozionale' | 'servizio'

function testiVuoti(): Testi {
  return Object.fromEntries(LINGUE.map((l) => [l, { titolo: '', testo: '' }])) as Testi
}

function testiDaInviare(testi: Testi): InputComunicazione['testi'] {
  const tradotti: Traduzioni = {}
  for (const lingua of LINGUE) {
    if (lingua !== 'it' && testi[lingua].titolo.trim() !== '') tradotti[lingua] = testi[lingua]
  }
  return { it: testi.it, ...tradotti }
}

export function ModuloComunicazione({ onInviata }: { onInviata: () => void }) {
  const frasi = useFrasi()
  const toast = useToast()
  const dati = useAdminDati()
  const { conRiconferma, dialogo } = useRiconferma()
  const [tipo, setTipo] = useState<TipoAvviso>('aggiornamento')
  const [aTutti, setATutti] = useState(true)
  const [scelti, setScelti] = useState<Set<string> | null>(new Set())
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI)
  const [lingua, setLingua] = useState<Lingua>('it')
  const [testi, setTesti] = useState<Testi>(testiVuoti)
  const [conEmail, setConEmail] = useState(false)
  const [tipoEmail, setTipoEmail] = useState<TipoEmail>('promozionale')
  const [anteprima, setAnteprima] = useState<AnteprimaComunicazione | null>(null)
  const [occupato, setOccupato] = useState(false)
  const inVolo = useRef(false)
  const idRichiesta = useRef(crypto.randomUUID())

  const nomiTipo: Record<TipoAvviso, string> = {
    importante: frasi.avsTipoImportante,
    aggiornamento: frasi.avsTipoAggiornamento,
    manutenzione: frasi.avsTipoManutenzione,
    novita: frasi.avsTipoNovita,
  }
  const salonIds: string[] | 'tutti' = aTutti ? 'tutti' : [...(scelti ?? [])]
  const email = conEmail ? tipoEmail : 'nessuna'
  const chiaveAnteprima = JSON.stringify({ salonIds, email, lingue: LINGUE.filter((l) => testi[l].titolo.trim() !== '') })
  const senzaDestinatari = salonIds !== 'tutti' && salonIds.length === 0

  useEffect(() => {
    if (senzaDestinatari) {
      setAnteprima(null)
      return
    }
    let vivo = true
    const timer = window.setTimeout(() => {
      void callAnteprimaComunicazione({ tipo, salonIds, testi: testiDaInviare(testi), email })
        .then((esito) => { if (vivo) setAnteprima(esito) })
        .catch(() => { if (vivo) setAnteprima(null) })
    }, ATTESA_ANTEPRIMA_MS)
    return () => {
      vivo = false
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveAnteprima])

  const bloccata = conEmail && anteprima?.bloccata === true
  const pronta = testi.it.titolo.trim() !== '' && !senzaDestinatari && !bloccata && (!conEmail || anteprima !== null)

  function scriviTesto(campo: 'titolo' | 'testo', valore: string) {
    setTesti((attuali) => ({ ...attuali, [lingua]: { ...attuali[lingua], [campo]: valore } }))
  }

  async function invia() {
    if (inVolo.current || !pronta) return
    inVolo.current = true
    setOccupato(true)
    try {
      await conRiconferma(() => callInviaComunicazione({ tipo, salonIds, testi: testiDaInviare(testi), email, idRichiesta: idRichiesta.current }))
      idRichiesta.current = crypto.randomUUID()
      setTesti(testiVuoti())
      setConEmail(false)
      toast.show(frasi.consInviata, 'ok')
      onInviata()
    } catch (caught) {
      toast.show(caught instanceof Error && caught.message !== '' ? caught.message : frasi.amAzioneKo, 'plain')
    } finally {
      inVolo.current = false
      setOccupato(false)
    }
  }

  const visto = testoPerLingua({ ...testi.it, traduzioni: testiDaInviare(testi) }, lingua)

  return (
    <>
      <Segmented fill label={frasi.avsTipo} value={tipo} onChange={setTipo} options={TIPI_AVVISO.map((t) => ({ value: t, label: nomiTipo[t] }))} />
      <Segmented
        fill
        label={frasi.consDestinatari}
        value={aTutti ? 'tutti' : 'scelti'}
        onChange={(valore) => setATutti(valore === 'tutti')}
        options={[{ value: 'tutti', label: frasi.consATutti }, { value: 'scelti', label: frasi.consAlcuni }]}
      />
      {aTutti ? null : (
        <>
          <Button
            variant="secondary"
            onClick={() => setScelti(new Set(filtraSaloni(dati.righe, filtri, dati.adesso).map((r) => r.row.salonId)))}
          >
            {frasi.consVisibili}
          </Button>
          <ListaSaloni
            modo="saloni"
            righe={dati.righe}
            pronte={dati.directory !== null}
            errore={dati.erroreDirectory && dati.directory === null}
            inviti={dati.invitiPer}
            filtri={filtri}
            onFiltri={setFiltri}
            filtroInvito="tutti"
            onFiltroInvito={() => undefined}
            conAttivita={dati.contatori?.perSalone != null}
            selezione={scelti}
            onSelezione={(prossimi) => setScelti(prossimi ?? new Set())}
            onApri={() => undefined}
            adesso={dati.adesso}
          />
        </>
      )}
      <Segmented
        fill
        label={frasi.consLingua}
        value={lingua}
        onChange={setLingua}
        options={LINGUE.map((l) => ({ value: l, label: NOMI_LINGUA[l] }))}
      />
      <input aria-label={frasi.avsTitolo} placeholder={frasi.avsTitolo} value={testi[lingua].titolo} maxLength={TITOLO_MAX} onChange={(e) => scriviTesto('titolo', e.target.value)} style={CAMPO} />
      <textarea aria-label={frasi.avsTesto} placeholder={frasi.avsTesto} rows={5} value={testi[lingua].testo} maxLength={TESTO_MAX} onChange={(e) => scriviTesto('testo', e.target.value)} style={CAMPO} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontWeight: 600 }}>{frasi.consAncheEmail}</span>
        <Toggle checked={conEmail} label={frasi.consAncheEmail} onChange={setConEmail} />
      </label>
      {conEmail ? (
        <>
          <Segmented
            fill
            label={frasi.consTipoEmail}
            value={tipoEmail}
            onChange={setTipoEmail}
            options={[{ value: 'promozionale', label: frasi.consPromozionale }, { value: 'servizio', label: frasi.consServizio }]}
          />
          {tipoEmail === 'servizio' ? <p style={{ ...AIUTO, margin: 0 }}>{frasi.consPromemoriaServizio}</p> : null}
        </>
      ) : null}
      <SectionTitle color="var(--tx3)">{frasi.consAnteprima}</SectionTitle>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visto.titolo !== '' ? <strong style={USER_TEXT}>{visto.titolo}</strong> : null}
        {visto.testo !== '' ? <span style={{ whiteSpace: 'pre-line', ...USER_TEXT }}>{visto.testo}</span> : null}
        {anteprima ? (
          <>
            <span style={AIUTO}>{frasi.consAnteprimaAccount.replace('{{n}}', String(anteprima.account))}</span>
            {anteprima.inItaliano > 0 ? <span style={AIUTO}>{frasi.consAnteprimaItaliano.replace('{{n}}', String(anteprima.inItaliano))}</span> : null}
            {conEmail ? <span style={AIUTO}>{frasi.consAnteprimaEmail.replace('{{n}}', String(anteprima.email))}</span> : null}
            {conEmail && anteprima.senzaConsenso > 0 ? <span style={AIUTO}>{frasi.consAnteprimaConsenso.replace('{{n}}', String(anteprima.senzaConsenso))}</span> : null}
            {conEmail ? <span style={AIUTO}>{frasi.consAnteprimaResto.replace('{{restano}}', String(anteprima.restanoOggi)).replace('{{massimo}}', String(anteprima.massimo))}</span> : null}
          </>
        ) : null}
        {bloccata ? <strong style={{ color: 'var(--bad)' }}>{frasi.consBloccata}</strong> : null}
      </Card>
      <p style={{ ...AIUTO, margin: 0 }}>{frasi.consNotaApk}</p>
      <Button disabled={!pronta || occupato} onClick={() => { void invia() }}>{frasi.consInvia}</Button>
      {dialogo}
    </>
  )
}
