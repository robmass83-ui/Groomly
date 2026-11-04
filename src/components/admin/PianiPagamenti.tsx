import { ChevronRight, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { Card, Row } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'
import { AttesaRiga } from '../ui/Zampette'
import { callImpostaConfigPiani } from '../../data/firebase/client'
import { callAnnunciaPagamenti, callImpostaMostraPiani, type ConfigGlobale } from '../../data/firebase/adminClient'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { CHIAVE_SDK_MAX, OFFERING_ID_MAX, OFFERTA_MAX, type ConfigPiani, type LinguaOfferta } from '../../lib/configPiani'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, Nota, RIGA } from './comuni'
import { PannelloAccensione } from './PannelloAccensione'

const GIORNO = 86_400_000
type Interruttore = 'mostraPiani' | 'provaSelfService' | 'showPrezziInBeta'

function oggiIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PianiPagamenti({ config }: { config: ConfigGlobale | null }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const [ottimisti, setOttimisti] = useState<Partial<Record<Interruttore, boolean>>>({})
  const [inVolo, setInVolo] = useState<Partial<Record<Interruttore, boolean>>>({})
  const [piani, setPiani] = useState<ConfigPiani | null>(null)
  const [linguaOfferta, setLinguaOfferta] = useState<LinguaOfferta>('it')
  const [offerta, setOfferta] = useState<Record<LinguaOfferta, string> | null>(null)
  const [chiave, setChiave] = useState<string | null>(null)
  const [offering, setOffering] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'offerta' | 'rc' | null>(null)
  const [annuncio, setAnnuncio] = useState<'data' | 'conferma' | null>(null)
  const [dataAnnuncio, setDataAnnuncio] = useState(oggiIso)
  const [annunciando, setAnnunciando] = useState(false)

  if (!config) return <AttesaRiga testo={frasi.uteCarica} />
  const attuali = piani ?? config.piani
  const valori: Record<Interruttore, boolean> = {
    mostraPiani: ottimisti.mostraPiani ?? config.mostraPiani,
    provaSelfService: ottimisti.provaSelfService ?? attuali.provaSelfService,
    showPrezziInBeta: ottimisti.showPrezziInBeta ?? attuali.showPrezziInBeta,
  }
  const testiOfferta = offerta ?? attuali.offertaEarlyAdopter
  const chiaveSdk = chiave ?? attuali.revenueCat.chiaveSdk
  const idOffering = offering ?? attuali.revenueCat.offeringId

  async function cambia(nome: Interruttore, valore: boolean) {
    if (inVolo[nome]) return
    setInVolo((c) => ({ ...c, [nome]: true }))
    setOttimisti((c) => ({ ...c, [nome]: valore }))
    try {
      if (nome === 'mostraPiani') await callImpostaMostraPiani(valore)
      else setPiani(await callImpostaConfigPiani({ [nome]: valore }))
    } catch {
      setOttimisti((c) => {
        const copia = { ...c }
        delete copia[nome]
        return copia
      })
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      setInVolo((c) => ({ ...c, [nome]: false }))
    }
  }

  async function salva(cosa: 'offerta' | 'rc') {
    if (salvando) return
    setSalvando(cosa)
    try {
      const esito = await callImpostaConfigPiani(cosa === 'offerta'
        ? { offertaEarlyAdopter: testiOfferta }
        : { revenueCat: { chiaveSdk: chiaveSdk.trim(), offeringId: idOffering.trim() } })
      setPiani(esito)
      if (cosa === 'offerta') setOfferta(null)
      else {
        setChiave(null)
        setOffering(null)
      }
      toast.show(frasi.amSalvato, 'ok')
    } catch {
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      setSalvando(null)
    }
  }

  async function inviaAnnuncio() {
    if (annunciando) return
    setAnnunciando(true)
    try {
      const esito = await callAnnunciaPagamenti(new Date(`${dataAnnuncio}T09:00:00`).toISOString())
      setAnnuncio(null)
      toast.show(frasi.amAnnuncioFatto.replace('{{n}}', String(esito.email)), 'ok')
    } catch {
      toast.show(frasi.amAzioneKo, 'plain')
    } finally {
      setAnnunciando(false)
    }
  }

  const interruttori: { nome: Interruttore; titolo: string; aiuto: string }[] = [
    { nome: 'mostraPiani', titolo: frasi.amMostraPiani, aiuto: frasi.amMostraPianiAiuto },
    { nome: 'provaSelfService', titolo: frasi.amProvaSelf, aiuto: frasi.amProvaSelfAiuto },
    { nome: 'showPrezziInBeta', titolo: frasi.amPrezziBeta, aiuto: frasi.amPrezziBetaAiuto },
  ]
  const annuncioIl = attuali.annuncioPagamentiIl
  const campo = { width: '100%', boxSizing: 'border-box' as const, font: 'inherit', padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'inherit' }
  const etichetta = { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }

  return (
    <>
      <PannelloAccensione />

      <SectionTitle>{frasi.amDuranteBeta}</SectionTitle>
      <Card>
        {interruttori.map(({ nome, titolo, aiuto }, i) => (
          <Row key={nome} style={{ borderTop: i === 0 ? 'none' : undefined }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, ...USER_TEXT }}>{titolo}</div>
              <div style={AIUTO}>{aiuto}</div>
            </div>
            <Toggle checked={valori[nome]} disabled={inVolo[nome] === true} label={titolo} onChange={(v) => { void cambia(nome, v) }} />
          </Row>
        ))}
      </Card>

      <SectionTitle>{frasi.amOfferta}</SectionTitle>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Segmented
          fill
          label={frasi.amOfferta}
          value={linguaOfferta}
          onChange={setLinguaOfferta}
          options={[{ value: 'it', label: 'it' }, { value: 'en', label: 'en' }, { value: 'es', label: 'es' }]}
        />
        <textarea
          aria-label={`${frasi.amOfferta} (${linguaOfferta})`}
          value={testiOfferta[linguaOfferta]}
          maxLength={OFFERTA_MAX}
          rows={3}
          onChange={(e) => setOfferta({ ...testiOfferta, [linguaOfferta]: e.target.value.slice(0, OFFERTA_MAX) })}
          style={{ ...campo, resize: 'vertical' }}
        />
        <span style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--tx3)' }}>
          <span style={{ flex: 1 }}>{linguaOfferta !== 'it' && testiOfferta[linguaOfferta].trim() === '' ? frasi.amOffertaVuota : ''}</span>
          {frasi.amCaratteri.replace('{{n}}', String(testiOfferta[linguaOfferta].length)).replace('{{max}}', String(OFFERTA_MAX))}
        </span>
        <Button variant="secondary" disabled={salvando !== null} onClick={() => { void salva('offerta') }}>{frasi.amSalva}</Button>
      </Card>

      <SectionTitle>{frasi.amRevenueCat}</SectionTitle>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={etichetta}>
          {frasi.amChiaveSdk}
          <input value={chiaveSdk} placeholder="goog_…" maxLength={CHIAVE_SDK_MAX} autoComplete="off" spellCheck={false} onChange={(e) => setChiave(e.target.value)} style={campo} />
        </label>
        <label style={etichetta}>
          {frasi.amOffering}
          <input value={idOffering} maxLength={OFFERING_ID_MAX} autoComplete="off" spellCheck={false} onChange={(e) => setOffering(e.target.value)} style={campo} />
        </label>
        <Nota>{frasi.amChiaveNota}</Nota>
        <Button variant="secondary" disabled={salvando !== null} onClick={() => { void salva('rc') }}>{frasi.amSalva}</Button>
      </Card>

      <Card>
        <button
          type="button"
          disabled={annuncioIl !== null}
          onClick={() => setAnnuncio('data')}
          style={{ ...RIGA, borderTop: 'none', cursor: annuncioIl ? 'default' : 'pointer' }}
        >
          <Megaphone size={18} aria-hidden color="var(--pri)" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700 }}>{frasi.amAnnuncio}</span>
            <span style={AIUTO}>
              {annuncioIl
                ? frasi.amAnnuncioInviato.replace('{{data}}', dataCorta(lingua, new Date(annuncioIl))).replace('{{dal}}', dataCorta(lingua, new Date(Date.parse(annuncioIl) + 15 * GIORNO)))
                : frasi.amAnnuncioAiuto}
            </span>
          </span>
          {annuncioIl ? null : <ChevronRight size={16} aria-hidden color="var(--tx3)" />}
        </button>
      </Card>

      <Dialog open={annuncio !== null} title={frasi.amAnnuncio} onClose={() => setAnnuncio(null)}>
        {annuncio === 'data' ? (
          <>
            <label style={etichetta}>
              {frasi.amAnnuncioData}
              <input type="date" value={dataAnnuncio} min={oggiIso()} onChange={(e) => setDataAnnuncio(e.target.value)} style={campo} />
            </label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.amAnnuncioAiuto}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setAnnuncio(null)}>{frasi.uteAnnulla}</Button>
              <Button style={{ flex: 1 }} disabled={dataAnnuncio === ''} onClick={() => setAnnuncio('conferma')}>{frasi.amAvanti}</Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amAnnuncioConferma}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setAnnuncio(null)}>{frasi.uteAnnulla}</Button>
              <Button variant="bad" style={{ flex: 1 }} disabled={annunciando} onClick={() => { void inviaAnnuncio() }}>{frasi.amInviaAnnuncio}</Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  )
}
