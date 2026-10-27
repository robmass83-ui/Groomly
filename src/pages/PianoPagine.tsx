import { useState } from 'react'
import { BarChart3, Bell, Cake, CalendarPlus, Check, Cloud, Heart, List, Lock, Mail, MessageCircle, Mic, PawPrint, RotateCcw, Send, ShieldCheck, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { FoglioServizio, RigaServizio } from '../components/piano/FoglioServizio'
import { LinkCondivisione } from '../components/piano/LinkCondivisione'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconTile } from '../components/ui/IconTile'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import type { Chiave } from '../i18n/t'
import { listDogs } from '../data/local/dogs'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { haAccesso, type FeatureKey } from '../lib/piano'
import { puoCambiareModo, type ChiaveServizioEmail, type SceltaServizio } from '../lib/serviziEmail'
import { strumentoAcceso, type ChiaveStrumento } from '../lib/strumenti'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const PAGINA_PRO: Partial<Record<FeatureKey, string>> = {
  statistiche: '/incassi/statistiche',
}

const EMAIL_DI: Partial<Record<FeatureKey, ChiaveServizioEmail>> = {
  promemoriaAuto: 'promemoria',
  pronto: 'pronto',
  compleanno: 'auguri',
  fedelta: 'fedelta',
  listaAttesa: 'attesa',
  recensioni: 'recensione',
}

function titoloServizio(chiave: ChiaveServizioEmail): 'strumPromemoria' | 'strumPronto' | 'strumAuguri' | 'recensione' | 'listaAttesa' | 'tesseraFedelta' {
  if (chiave === 'promemoria') return 'strumPromemoria'
  if (chiave === 'pronto') return 'strumPronto'
  if (chiave === 'auguri') return 'strumAuguri'
  if (chiave === 'recensione') return 'recensione'
  if (chiave === 'attesa') return 'listaAttesa'
  return 'tesseraFedelta'
}

function ruoloAccount(role: string | undefined): string {
  if (role === 'titolare' || role === 'socio' || role === 'collaboratore') return role
  return 'titolare'
}

function caniInAttesa(attesa: unknown, uid: string): { id: string; nome: string }[] {
  if (!Array.isArray(attesa)) return []
  const cani = uid ? listDogs(uid) : []
  return attesa.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const id = 'id' in item && typeof item.id === 'string' ? item.id : ''
    if (!id) return []
    const nomeSalvato = 'nomeCane' in item && typeof item.nomeCane === 'string' ? item.nomeCane : ''
    const dogId = 'dogId' in item && typeof item.dogId === 'string' ? item.dogId : ''
    const nome = nomeSalvato || cani.find((cane) => cane.id === dogId)?.name || dogId || id
    return [{ id, nome }]
  })
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
  { titolo: 'waAuto', dettaglio: 'strumWaAutoDettaglio', icona: Send, extra: 'inSviluppo' },
]

const PRO_VETRINA: VoceVetrina[] = [
  { titolo: 'strumPromemoria', dettaglio: 'vetrinaPromemoria', icona: Bell },
  { titolo: 'strumPronto', dettaglio: 'vetrinaPronto', icona: PawPrint },
  { titolo: 'strumRichiamo', dettaglio: 'vetrinaRichiamo', icona: RotateCcw, extra: 'inSviluppo' },
  { titolo: 'strumAuguri', dettaglio: 'vetrinaAuguri', icona: Cake },
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

const PRO: { chiave: FeatureKey; titolo: 'strumPromemoria' | 'strumPronto' | 'strumRichiamo' | 'strumAuguri' | 'tesseraFedelta' | 'prenotazioniOnline' | 'listaAttesa' | 'recensione' | 'statistiche' | 'emailContatto' | 'copieFoto'; icona: typeof Bell }[] = [
  { chiave: 'promemoriaAuto', titolo: 'strumPromemoria', icona: Bell },
  { chiave: 'pronto', titolo: 'strumPronto', icona: PawPrint },
  { chiave: 'richiamo', titolo: 'strumRichiamo', icona: RotateCcw },
  { chiave: 'compleanno', titolo: 'strumAuguri', icona: Cake },
  { chiave: 'fedelta', titolo: 'tesseraFedelta', icona: Heart },
  { chiave: 'prenotazioni', titolo: 'prenotazioniOnline', icona: CalendarPlus },
  { chiave: 'listaAttesa', titolo: 'listaAttesa', icona: List },
  { chiave: 'recensioni', titolo: 'recensione', icona: Star },
  { chiave: 'statistiche', titolo: 'statistiche', icona: BarChart3 },
  { chiave: 'schedaCliente', titolo: 'emailContatto', icona: Mail },
  { chiave: 'copieCloud', titolo: 'copieFoto', icona: Cloud },
]

export function StrumentiPage() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const navigate = useNavigate()
  const { settings, save } = useSettings()
  const [scelta, setScelta] = useState<FeatureKey | null>(null)
  const [foglio, setFoglio] = useState<ChiaveServizioEmail | null>(null)
  const sceltaTitolo = PRO.find((voce) => voce.chiave === scelta)
  const collaboratore = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  const ruolo = ruoloAccount(session.gate.kind === 'in' ? session.gate.account.role : undefined)
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const salone = funzioneVisibile(piano.stato, piano.funzioni, 'team')

  const accendi = (chiave: ChiaveStrumento) => {
    if (collaboratore) return
    save({
      ...settings,
      strumenti: { ...settings.strumenti, [chiave]: !strumentoAcceso(settings, chiave) },
    })
  }

  function salvaServizio(chiave: ChiaveServizioEmail, prossima: SceltaServizio) {
    if (chiave === 'fedelta') {
      const acceso = prossima.modo !== 'spento'
      save({
        ...settings,
        fedeltaAccesa: acceso,
        serviziEmail: { ...settings.serviziEmail, fedelta: acceso ? { modo: 'manuale' } : { modo: 'spento' } },
      })
      return
    }
    save({
      ...settings,
      serviziEmail: { ...settings.serviziEmail, [chiave]: prossima },
    })
  }

  function togliCane(id: string) {
    const raw = (settings as { attesa?: unknown }).attesa
    const attesa = Array.isArray(raw)
      ? raw.filter((item) => !item || typeof item !== 'object' || !('id' in item) || item.id !== id)
      : []
    save({ ...settings, attesa } as typeof settings)
  }

  function scegliPro(chiave: FeatureKey) {
    if (chiave === 'richiamo') return
    const email = EMAIL_DI[chiave]
    if (email) {
      if (!puoCambiareModo(ruolo)) return
      if (!funzioneVisibile(piano.stato, piano.funzioni, chiave)) {
        piano.apriPaywall(chiave)
        return
      }
      setScelta(null)
      setFoglio(email)
      return
    }
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
    setFoglio(null)
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
                <Toggle disabled={collaboratore} checked={strumentoAcceso(settings, riga.chiave)} label={frasi[riga.titolo]} onChange={() => accendi(riga.chiave)} />
              </Row>
            )
          })}
          <Row style={{ minHeight: 56 }}>
            <IconTile tone="warn" size="sm"><Send size={14} strokeWidth={2} aria-hidden /></IconTile>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 650 }}>{frasi.waAuto}</span>
              <small style={{ color: 'var(--tx3)' }}>{frasi.strumWaAutoDettaglio}</small>
            </span>
            <Chip tone="warn">{frasi.inSviluppo}</Chip>
          </Row>
        </Card>

        <SectionTitle>{frasi.servizioPro}</SectionTitle>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.servizioProIntro}</p>
        <Card>
          {PRO.map((voce, index) => {
            const email = EMAIL_DI[voce.chiave]
            const bordo = { borderTop: index === 0 ? 'none' : undefined, minHeight: 48, paddingTop: 0, paddingBottom: 0 } as const
            if (voce.chiave === 'richiamo' || email) {
              return (
                <Row key={voce.chiave} style={bordo}>
                  <RigaServizio
                    titolo={frasi[voce.titolo]}
                    stato={email ? (settings.serviziEmail?.[email]?.modo ?? 'spento') : 'sviluppo'}
                    ruolo={ruolo}
                    icona={voce.icona}
                    onApri={() => scegliPro(voce.chiave)}
                  />
                </Row>
              )
            }
            const inclusa = funzioneVisibile(piano.stato, piano.funzioni, voce.chiave)
            const Icona = voce.icona
            return (
              <Row key={voce.chiave} style={bordo}>
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
                  <Icona size={14} strokeWidth={2} aria-hidden />
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
      <Dialog
        open={foglio !== null || scelta !== null}
        title={foglio ? frasi[titoloServizio(foglio)] : sceltaTitolo ? frasi[sceltaTitolo.titolo] : frasi.funzioniPro}
        onClose={() => { setFoglio(null); setScelta(null) }}
      >
        {foglio ? (
          <FoglioServizio
            chiave={foglio}
            scelta={settings.serviziEmail?.[foglio] ?? { modo: 'spento' }}
            ruolo={ruolo}
            onChange={(prossima) => salvaServizio(foglio, prossima)}
            link={settings.linkRecensioni ?? ''}
            onLink={(valore) => save({ ...settings, linkRecensioni: valore })}
            cani={foglio === 'attesa' ? caniInAttesa((settings as { attesa?: unknown }).attesa, uid) : []}
            onTogli={togliCane}
          />
        ) : null}
        {scelta === 'schedaCliente' ? (
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.proAncora}</p>
        ) : null}
      </Dialog>
    </ShellFrame>
  )
}
