import { useState } from 'react'
import { BarChart3, Bell, Cake, CalendarPlus, Check, ClipboardList, Cloud, Heart, List, Lock, Mail, MessageCircle, Mic, PawPrint, RotateCcw, Send, ShieldCheck, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { LinkCondivisione } from '../components/piano/LinkCondivisione'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import type { Chiave } from '../i18n/t'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { haAccesso, type FeatureKey } from '../lib/piano'
import { strumentoAcceso, type ChiaveStrumento } from '../lib/strumenti'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const PAGINA_PRO: Partial<Record<FeatureKey, string>> = {
  promemoriaAuto: '/impostazioni/info',
  pronto: '/impostazioni/info',
  richiamo: '/impostazioni/info',
  compleanno: '/impostazioni/info',
  statistiche: '/incassi/statistiche',
}

type VoceVetrina = {
  titolo: Chiave
  dettaglio: Chiave
  icona: typeof MessageCircle
  extra?: Chiave
}

const BASE_VETRINA: VoceVetrina[] = [
  { titolo: 'strumMessaggi', dettaglio: 'strumMessaggiDettaglio', icona: MessageCircle },
  { titolo: 'strumAffidabilita', dettaglio: 'strumAffidabilitaDettaglio', icona: ShieldCheck },
  { titolo: 'strumNoteVocali', dettaglio: 'strumNoteVocaliDettaglio', icona: Mic },
  { titolo: 'waAuto', dettaglio: 'strumWaAutoDettaglio', icona: Send, extra: 'daSviluppare' },
]

const PRO_VETRINA: VoceVetrina[] = [
  { titolo: 'strumPromemoria', dettaglio: 'vetrinaPromemoria', icona: Bell },
  { titolo: 'strumPronto', dettaglio: 'vetrinaPronto', icona: PawPrint },
  { titolo: 'strumRichiamo', dettaglio: 'vetrinaRichiamo', icona: RotateCcw },
  { titolo: 'strumAuguri', dettaglio: 'vetrinaAuguri', icona: Cake },
  { titolo: 'pagella', dettaglio: 'vetrinaPagella', icona: ClipboardList },
  { titolo: 'tesseraFedelta', dettaglio: 'vetrinaFedelta', icona: Heart },
  { titolo: 'prenotazioniOnline', dettaglio: 'vetrinaPrenotazioni', icona: CalendarPlus },
  { titolo: 'listaAttesa', dettaglio: 'vetrinaAttesa', icona: List },
  { titolo: 'recensione', dettaglio: 'vetrinaRecensione', icona: Star },
  { titolo: 'statistiche', dettaglio: 'vetrinaStatistiche', icona: BarChart3 },
  { titolo: 'emailContatto', dettaglio: 'vetrinaEmail', icona: Mail },
  { titolo: 'copieFoto', dettaglio: 'vetrinaFoto', icona: Cloud },
]

function GruppoVetrina({ titolo, voci }: { titolo: string; voci: VoceVetrina[] }) {
  const frasi = useFrasi()
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle count={voci.length}>{titolo}</SectionTitle>
      <Card>
        {voci.map((voce, index) => {
          const Icona = voce.icona
          return (
            <Row key={voce.titolo} style={{ borderTop: index === 0 ? 'none' : undefined, flexDirection: 'column', alignItems: 'stretch', height: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <IconTile tone="prim" size="sm"><Icona size={14} strokeWidth={2} aria-hidden /></IconTile>
                <span style={{ fontWeight: 600 }}>{frasi[voce.titolo]}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Chip>{frasi[voce.dettaglio]}</Chip>
                {voce.extra ? <Chip tone="warn">{frasi[voce.extra]}</Chip> : null}
              </div>
            </Row>
          )
        })}
      </Card>
    </section>
  )
}

export function PianoPage() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const collaboratore = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  const accesso = funzioneVisibile(piano.stato, piano.funzioni, 'prenotazioni')
  const salone = haAccesso(piano.stato, 'team')
  return (
    <ShellFrame>
      <Header title={frasi.hubPiano} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap, paddingBottom: 128 }}>
        {accesso ? <LinkCondivisione /> : null}
        <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.pianoInvito}</p>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle>{frasi.profiloBase}</SectionTitle>
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.profiloBaseTesto}</p>
        </section>
        <GruppoVetrina titolo={frasi.servizioBase} voci={BASE_VETRINA} />
        <GruppoVetrina titolo={frasi.servizioPro} voci={PRO_VETRINA} />
        {piano.stato.livello === 'base' && !collaboratore ? (
          <Button
            onClick={() => {
              if (piano.provaUsata) piano.apriPaywall('pagella')
              else void piano.prova()
            }}
            style={{ width: '100%' }}
          >
            {piano.provaUsata ? frasi.abbonamentiInArrivo : frasi.provaGratis}
          </Button>
        ) : null}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle>{frasi.servizioSalone}</SectionTitle>
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.servizioSaloneIntro}</p>
          <Card>
            <Row style={{ borderTop: 'none', minHeight: 48 }}>
              {salone ? (
                <Link to="/impostazioni/pro" style={{ flex: 1, color: 'inherit', textDecoration: 'none', fontWeight: 650 }}>{frasi.hubCollaboratori}</Link>
              ) : (
                <span style={{ flex: 1, fontWeight: 650 }}>{frasi.hubCollaboratori}</span>
              )}
              <span style={{ color: salone ? 'var(--ok)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 700 }}>{salone ? frasi.proInclusa : frasi.sbloccaSalone}</span>
            </Row>
            <Row style={{ minHeight: 48 }}>
              <span style={{ flex: 1, fontWeight: 650 }}>{frasi.postiExtraEtichetta}</span>
              <span style={{ color: salone ? 'var(--ok)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 700 }}>{salone ? frasi.proInclusa : frasi.sbloccaSalone}</span>
            </Row>
          </Card>
          {salone ? null : (
            <Button onClick={() => { void piano.avvisa('team') }} style={{ width: '100%' }}>{frasi.avvisaSalone}</Button>
          )}
        </section>
      </div>
    </ShellFrame>
  )
}

export function TeamPage() {
  const frasi = useFrasi()
  return (
    <ShellFrame>
      <Header title={frasi.team} backTo="/impostazioni" />
    </ShellFrame>
  )
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
  const session = useSession()
  const navigate = useNavigate()
  const { settings, save } = useSettings()
  const [scelta, setScelta] = useState<FeatureKey | null>(null)
  const sceltaTitolo = PRO.find((voce) => voce.chiave === scelta)
  const collaboratore = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  const salone = funzioneVisibile(piano.stato, piano.funzioni, 'team')

  const accendi = (chiave: ChiaveStrumento) => {
    save({
      ...settings,
      strumenti: { ...settings.strumenti, [chiave]: !strumentoAcceso(settings, chiave) },
    })
  }

  function scegliPro(chiave: FeatureKey) {
    if (!funzioneVisibile(piano.stato, piano.funzioni, chiave)) {
      if (collaboratore) return
      piano.apriPaywall(chiave)
      return
    }
    if (chiave === 'copieCloud') {
      navigate('/impostazioni', { state: { openBackup: true } })
      return
    }
    const pagina = PAGINA_PRO[chiave]
    if (pagina) {
      navigate(pagina)
      return
    }
    if (chiave === 'prenotazioni') {
      document.getElementById('prenotazioni-online')?.scrollIntoView({ block: 'center' })
      return
    }
    setScelta(chiave)
  }

  return (
    <ShellFrame>
      <Header title={frasi.strumenti} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap, paddingBottom: 128 }}>
        <SectionTitle>{frasi.servizioBase}</SectionTitle>
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

        <SectionTitle>{frasi.servizioPro}</SectionTitle>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.servizioProIntro}</p>
        <Card>
          {PRO.map((voce, index) => {
            const inclusa = funzioneVisibile(piano.stato, piano.funzioni, voce.chiave)
            return (
              <Row key={voce.chiave} style={{ borderTop: index === 0 ? 'none' : undefined, minHeight: 48, paddingTop: 0, paddingBottom: 0 }}>
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
                    {inclusa ? frasi.proInclusa : collaboratore ? frasi.pianoLoAccendeTitolare : frasi.proBloccata}
                  </span>
                </button>
              </Row>
            )
          })}
        </Card>
        <LinkCondivisione />
        <SectionTitle>{frasi.servizioSalone}</SectionTitle>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.servizioSaloneIntro}</p>
        <Card>
          <Row style={{ borderTop: 'none', minHeight: 48, paddingTop: 0, paddingBottom: 0 }}>
            <button type="button" onClick={() => {
              if (collaboratore) return
              if (!salone) {
                piano.apriPaywall('team')
                return
              }
              navigate('/impostazioni/pro')
            }} style={{ flex: 1, minHeight: 48, display: 'flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}>
              <span style={{ flex: 1, fontWeight: 650 }}>{frasi.hubCollaboratori}</span>
              <span style={{ color: salone ? 'var(--ok)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 700 }}>{salone ? frasi.proInclusa : collaboratore ? frasi.pianoLoAccendeTitolare : frasi.sbloccaSalone}</span>
            </button>
          </Row>
          <Row style={{ minHeight: 48 }}>
            <span style={{ flex: 1, fontWeight: 650 }}>{frasi.postiExtraEtichetta}</span>
            <span style={{ color: funzioneVisibile(piano.stato, piano.funzioni, 'postiExtra') ? 'var(--ok)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 700 }}>
              {funzioneVisibile(piano.stato, piano.funzioni, 'postiExtra') ? frasi.proInclusa : collaboratore ? frasi.pianoLoAccendeTitolare : frasi.sbloccaSalone}
            </span>
          </Row>
        </Card>
      </div>
      <Dialog open={scelta !== null} title={sceltaTitolo ? frasi[sceltaTitolo.titolo] : frasi.funzioniPro} onClose={() => setScelta(null)}>
        {scelta === 'fedelta' ? (
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>{frasi.tesseraFedelta}</span>
            <Toggle checked={settings.fedeltaAccesa === true} label={frasi.tesseraFedelta} onChange={(acceso) => save({ ...settings, fedeltaAccesa: acceso })} />
          </Row>
        ) : null}
        {scelta === 'recensioni' ? (
          <Input label={frasi.linkRecensioni} value={settings.linkRecensioni ?? ''} onChange={(event) => save({ ...settings, linkRecensioni: event.target.value })} />
        ) : null}
        {scelta === 'pagella' || scelta === 'listaAttesa' || scelta === 'schedaCliente' ? (
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.proAncora}</p>
        ) : null}
      </Dialog>
    </ShellFrame>
  )
}
