import { useState } from 'react'
import { Check, Lock, MessageCircle, Mic, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { usePiano } from '../hooks/usePiano'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import { funzioneVisibile } from '../lib/funzioniPiano'
import type { FeatureKey } from '../lib/piano'
import { strumentoAcceso, type ChiaveStrumento } from '../lib/strumenti'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

function Pagina({ titolo }: { titolo: string }) {
  return (
    <main style={{ padding: 16 }}>
      <h1>{titolo}</h1>
    </main>
  )
}

export function PianoPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.tuoPiano} />
}

export function TeamPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.team} />
}

export function MessaggiPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.messaggi} />
}

const BASE: { chiave: ChiaveStrumento; titolo: 'strumMessaggi' | 'strumAffidabilita' | 'strumNoteVocali'; dettaglio: 'strumMessaggiDettaglio' | 'strumAffidabilitaDettaglio' | 'strumNoteVocaliDettaglio'; icona: typeof MessageCircle }[] = [
  { chiave: 'messaggi', titolo: 'strumMessaggi', dettaglio: 'strumMessaggiDettaglio', icona: MessageCircle },
  { chiave: 'affidabilita', titolo: 'strumAffidabilita', dettaglio: 'strumAffidabilitaDettaglio', icona: ShieldCheck },
  { chiave: 'noteVocali', titolo: 'strumNoteVocali', dettaglio: 'strumNoteVocaliDettaglio', icona: Mic },
]

const PRO: { chiave: FeatureKey; titolo: 'strumPromemoria' | 'strumPronto' | 'strumRichiamo' | 'strumAuguri' | 'pagella' | 'tesseraFedelta' | 'prenotazioniOnline' | 'listaAttesa' | 'recensione' | 'statistiche' | 'emailContatto' | 'copieFoto' }[] = [
  { chiave: 'promemoriaAuto', titolo: 'strumPromemoria' },
  { chiave: 'pronto', titolo: 'strumPronto' },
  { chiave: 'richiamo', titolo: 'strumRichiamo' },
  { chiave: 'compleanno', titolo: 'strumAuguri' },
  { chiave: 'pagella', titolo: 'pagella' },
  { chiave: 'fedelta', titolo: 'tesseraFedelta' },
  { chiave: 'prenotazioni', titolo: 'prenotazioniOnline' },
  { chiave: 'listaAttesa', titolo: 'listaAttesa' },
  { chiave: 'recensioni', titolo: 'recensione' },
  { chiave: 'statistiche', titolo: 'statistiche' },
  { chiave: 'schedaCliente', titolo: 'emailContatto' },
  { chiave: 'copieCloud', titolo: 'copieFoto' },
]

export function StrumentiPage() {
  const frasi = useFrasi()
  const piano = usePiano()
  const { settings, save } = useSettings()
  const [scelta, setScelta] = useState<FeatureKey | null>(null)
  const pianoAttivo = piano.stato.livello !== 'base'
  const sceltaTitolo = PRO.find((voce) => voce.chiave === scelta)

  const accendi = (chiave: ChiaveStrumento) => {
    save({
      ...settings,
      strumenti: { ...settings.strumenti, [chiave]: !strumentoAcceso(settings, chiave) },
    })
  }

  function scegliPro(chiave: FeatureKey) {
    if (funzioneVisibile(piano.stato, piano.funzioni, chiave)) {
      setScelta(chiave)
      return
    }
    piano.apriPaywall(chiave)
  }

  return (
    <ShellFrame>
      <Header title={frasi.strumenti} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <SectionTitle>{frasi.funzioniBase}</SectionTitle>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.funzioniBaseIntro}</p>
        <Card>
          {BASE.map((riga, index) => {
            const Icona = riga.icona
            return (
              <Row key={riga.chiave} style={{ borderTop: index === 0 ? 'none' : undefined, minHeight: 56 }}>
                <IconTile tone="prim" size="sm"><Icona size={14} strokeWidth={2} aria-hidden /></IconTile>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 650 }}>{frasi[riga.titolo]}</span>
                  <small style={{ color: 'var(--tx3)' }}>{frasi[riga.dettaglio]}</small>
                </span>
                <Toggle checked={strumentoAcceso(settings, riga.chiave)} label={frasi[riga.titolo]} onChange={() => accendi(riga.chiave)} />
              </Row>
            )
          })}
          <Row style={{ minHeight: 56 }}>
            <IconTile tone="warn" size="sm"><Send size={14} strokeWidth={2} aria-hidden /></IconTile>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 650 }}>{frasi.waAuto}</span>
              <small style={{ color: 'var(--tx3)' }}>{frasi.strumWaAutoDettaglio}</small>
            </span>
            <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 650 }}>{frasi.daSviluppare}</span>
          </Row>
        </Card>

        <SectionTitle>{frasi.funzioniPro}</SectionTitle>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.funzioniProIntro}</p>
        <Card>
          <Row style={{ borderTop: 'none', minHeight: 56 }}>
            <IconTile tone="prim" size="sm"><Sparkles size={14} strokeWidth={2} aria-hidden /></IconTile>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0' }}>
              <span style={{ fontWeight: 700 }}>{frasi.impPiano}</span>
              <small style={{ color: pianoAttivo ? 'var(--ok)' : 'var(--tx3)', fontWeight: 700 }}>
                {pianoAttivo ? frasi.servAttivo : frasi.proNonAttivo}
              </small>
              {pianoAttivo ? null : (
                <button
                  type="button"
                  onClick={() => piano.apriPaywall('pagella')}
                  style={{ alignSelf: 'flex-start', minHeight: 44, border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: 0, textAlign: 'left' }}
                >
                  {piano.provaUsata ? frasi.abbonamentiInArrivo : frasi.provaGratis}
                </button>
              )}
            </span>
          </Row>
          {PRO.map((voce) => {
            const inclusa = funzioneVisibile(piano.stato, piano.funzioni, voce.chiave)
            return (
              <Row key={voce.chiave} style={{ minHeight: 48, paddingTop: 0, paddingBottom: 0 }}>
                <button
                  type="button"
                  aria-pressed={inclusa}
                  onClick={() => scegliPro(voce.chiave)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 0,
                    background: 'transparent',
                    color: 'inherit',
                    font: 'inherit',
                    textAlign: 'left',
                    padding: 0,
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 650 }}>{frasi[voce.titolo]}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: inclusa ? 'var(--ok)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 700 }}>
                    {inclusa ? <Check size={14} strokeWidth={2} aria-hidden /> : <Lock size={14} strokeWidth={2} aria-hidden />}
                    {inclusa ? frasi.proInclusa : frasi.proBloccata}
                  </span>
                </button>
              </Row>
            )
          })}
        </Card>
      </div>
      <Dialog open={scelta !== null} title={sceltaTitolo ? frasi[sceltaTitolo.titolo] : frasi.funzioniPro} onClose={() => setScelta(null)}>
        <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.proInclusa}. {frasi.funzioniProIntro}</p>
      </Dialog>
    </ShellFrame>
  )
}
