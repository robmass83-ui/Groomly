import { Bell, Cake, CalendarPlus, Heart, List, MessageCircle, PawPrint, RotateCcw, Send, ShieldCheck, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LinkCondivisione } from '../components/piano/LinkCondivisione'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import type { Chiave } from '../i18n/t'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { haAccesso } from '../lib/piano'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type VoceVetrina = {
  titolo: Chiave
  dettaglio: Chiave
  icona: typeof MessageCircle
  extra?: Chiave
}

const BASE_VETRINA: VoceVetrina[] = [
  { titolo: 'strumMessaggi', dettaglio: 'strumMessaggiDettaglio', icona: MessageCircle },
  { titolo: 'strumAffidabilita', dettaglio: 'strumAffidabilitaDettaglio', icona: ShieldCheck },
]

const PRO_VETRINA: VoceVetrina[] = [
  { titolo: 'strumPromemoria', dettaglio: 'vetrinaPromemoria', icona: Bell },
  { titolo: 'strumPronto', dettaglio: 'vetrinaPronto', icona: PawPrint },
  { titolo: 'strumRichiamo', dettaglio: 'vetrinaRichiamo', icona: RotateCcw, extra: 'inSviluppo' },
  { titolo: 'waAuto', dettaglio: 'strumWaAutoDettaglio', icona: Send, extra: 'inSviluppo' },
  { titolo: 'strumAuguri', dettaglio: 'vetrinaAuguri', icona: Cake },
  { titolo: 'tesseraFedelta', dettaglio: 'vetrinaFedelta', icona: Heart },
  { titolo: 'prenotazioniOnline', dettaglio: 'vetrinaPrenotazioni', icona: CalendarPlus },
  { titolo: 'listaAttesa', dettaglio: 'vetrinaAttesa', icona: List },
  { titolo: 'recensione', dettaglio: 'vetrinaRecensione', icona: Star },
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
