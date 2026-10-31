import { Fragment, useState } from 'react'
import { Bell, Cake, CalendarPlus, Check, Heart, List, Lock, MessageCircle, PawPrint, RotateCcw, Send, ShieldCheck, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { useSettings } from '../../hooks/useSettings'
import { funzioneVisibile } from '../../lib/funzioniPiano'
import type { FeatureKey } from '../../lib/piano'
import { puoCambiareModo, type ChiaveServizioEmail, type SceltaServizio } from '../../lib/serviziEmail'
import { strumentoAcceso, type ChiaveStrumento } from '../../lib/strumenti'
import { TYPE } from '../../theme/theme'
import { Dialog } from '../layout/Dialog'
import { FoglioServizio, RigaServizio } from '../piano/FoglioServizio'
import { LinkCondivisione, usePrenotazioniOnline } from '../piano/LinkCondivisione'
import { Card, Row } from '../ui/Card'
import { IconTile } from '../ui/IconTile'
import { Info } from '../ui/Info'
import { SectionTitle } from '../ui/SectionTitle'
import { Toggle } from '../ui/Toggle'

const EMAIL_DI: Partial<Record<FeatureKey, ChiaveServizioEmail>> = {
  promemoriaAuto: 'promemoria',
  pronto: 'pronto',
  compleanno: 'auguri',
  fedelta: 'fedelta',
  listaAttesa: 'attesa',
  recensioni: 'recensione',
}

function ruoloAccount(role: string | undefined): string {
  if (role === 'titolare' || role === 'socio' || role === 'collaboratore') return role
  return 'titolare'
}

function useRuolo() {
  const session = useSession()
  const role = session.gate.kind === 'in' ? session.gate.account.role : undefined
  return { collaboratore: role === 'collaboratore', ruolo: ruoloAccount(role) }
}

const BASE: { chiave: ChiaveStrumento; titolo: 'strumMessaggi' | 'strumAffidabilita'; dettaglio: 'strumMessaggiDettaglio' | 'strumAffidabilitaDettaglio'; icona: typeof MessageCircle; info?: 'infoAffidabilita' }[] = [
  { chiave: 'messaggi', titolo: 'strumMessaggi', dettaglio: 'strumMessaggiDettaglio', icona: MessageCircle },
  { chiave: 'affidabilita', titolo: 'strumAffidabilita', dettaglio: 'strumAffidabilitaDettaglio', icona: ShieldCheck, info: 'infoAffidabilita' },
]

const PRO: { chiave: FeatureKey; titolo: 'strumPromemoria' | 'strumPronto' | 'strumRichiamo' | 'strumAuguri' | 'tesseraFedelta' | 'prenotazioniOnline' | 'listaAttesa' | 'recensione'; icona: typeof Bell }[] = [
  { chiave: 'promemoriaAuto', titolo: 'strumPromemoria', icona: Bell },
  { chiave: 'pronto', titolo: 'strumPronto', icona: PawPrint },
  { chiave: 'richiamo', titolo: 'strumRichiamo', icona: RotateCcw },
  { chiave: 'compleanno', titolo: 'strumAuguri', icona: Cake },
  { chiave: 'fedelta', titolo: 'tesseraFedelta', icona: Heart },
  { chiave: 'prenotazioni', titolo: 'prenotazioniOnline', icona: CalendarPlus },
  { chiave: 'listaAttesa', titolo: 'listaAttesa', icona: List },
  { chiave: 'recensioni', titolo: 'recensione', icona: Star },
]

function testoInfo(chiave: ChiaveServizioEmail): 'infoPromemoria' | 'infoPronto' | 'infoAuguri' | 'infoRecensione' | 'infoTessera' | 'infoAttesa' {
  if (chiave === 'promemoria') return 'infoPromemoria'
  if (chiave === 'pronto') return 'infoPronto'
  if (chiave === 'auguri') return 'infoAuguri'
  if (chiave === 'recensione') return 'infoRecensione'
  if (chiave === 'attesa') return 'infoAttesa'
  return 'infoTessera'
}

export function BloccoGo() {
  const frasi = useFrasi()
  const { collaboratore } = useRuolo()
  const { settings, save } = useSettings()
  const accendi = (chiave: ChiaveStrumento) => {
    if (collaboratore) return
    save({
      ...settings,
      strumenti: { ...settings.strumenti, [chiave]: !strumentoAcceso(settings, chiave) },
    })
  }
  return (
    <>
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
              {riga.info ? <Info nome={frasi[riga.titolo]} titolo={frasi[riga.titolo]} testo={frasi[riga.info]} /> : null}
              <Toggle disabled={collaboratore} checked={strumentoAcceso(settings, riga.chiave)} label={frasi[riga.titolo]} onChange={() => accendi(riga.chiave)} />
            </Row>
          )
        })}
      </Card>
    </>
  )
}

export function BloccoPlus() {
  const frasi = useFrasi()
  const piano = usePiano()
  const { collaboratore, ruolo } = useRuolo()
  const { settings, save } = useSettings()
  const prenotazioni = usePrenotazioniOnline()
  const [prontoAperto, setProntoAperto] = useState(false)
  const [spiegaManca, setSpiegaManca] = useState(false)

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

  function scegliPro(chiave: FeatureKey) {
    if (chiave === 'richiamo') return
    if (!funzioneVisibile(piano.stato, piano.funzioni, chiave)) {
      if (collaboratore) return
      piano.apriPaywall(chiave)
      return
    }
    if (chiave === 'prenotazioni') {
      document.getElementById('prenotazioni-online')?.scrollIntoView({ block: 'center' })
    }
  }

  return (
    <>
      <SectionTitle>{frasi.servizioPro}</SectionTitle>
      <Card>
        {PRO.map((voce, index) => {
          const email = EMAIL_DI[voce.chiave]
          const bordo = { borderTop: index === 0 ? 'none' : undefined, minHeight: 48 } as const
          if (voce.chiave === 'prenotazioni') {
            const Icona = voce.icona
            return (
              <Row key={voce.chiave} style={{ ...bordo, height: 'auto', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
                  <Icona size={14} strokeWidth={2} aria-hidden />
                  <span style={{ flex: 1, fontWeight: 650 }}>{frasi.prenotazioniOnline}</span>
                  <Toggle
                    checked={prenotazioni.acceso}
                    disabled={collaboratore}
                    label={frasi.prenotazioniOnline}
                    onChange={(on) => {
                      if (!funzioneVisibile(piano.stato, piano.funzioni, 'prenotazioni')) {
                        piano.apriPaywall('prenotazioni')
                        return
                      }
                      // Se manca qualcosa per accenderle lo dice subito qui sotto, non solo nel riquadro del link.
                      if (on && !prenotazioni.decisione.ok) {
                        setSpiegaManca(true)
                        return
                      }
                      setSpiegaManca(false)
                      prenotazioni.cambia(on)
                    }}
                  />
                </div>
                {spiegaManca && !prenotazioni.decisione.ok ? (
                  <p role="status" style={{ margin: '0 0 8px', color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>
                    {prenotazioni.decisione.manca === 'servizi' ? (
                      <Link to="/impostazioni/servizi" style={{ color: 'var(--pri)', fontWeight: 700 }}>{frasi.prenotaMancaServizi}</Link>
                    ) : prenotazioni.decisione.manca === 'fiscale' ? frasi.prenotaMancaFiscale : frasi.prenotaMancaProfilo}
                  </p>
                ) : null}
                {prenotazioni.errore ? <p style={{ margin: '0 0 8px', color: 'var(--bad)', fontSize: TYPE.meta }}>{prenotazioni.errore}</p> : null}
              </Row>
            )
          }
          if (voce.chiave === 'richiamo') {
            return (
              <Fragment key={voce.chiave}>
                <Row style={bordo}>
                  <RigaServizio
                    titolo={frasi[voce.titolo]}
                    stato="sviluppo"
                    ruolo={ruolo}
                    icona={voce.icona}
                    onApri={() => scegliPro(voce.chiave)}
                  />
                </Row>
                <Row style={{ minHeight: 48 }}>
                  <RigaServizio titolo={frasi.waAuto} stato="sviluppo" ruolo={ruolo} icona={Send} onApri={() => undefined} />
                </Row>
              </Fragment>
            )
          }
          if (email === 'pronto') {
            const sceltaPronto = settings.serviziEmail?.pronto ?? { modo: 'spento' }
            const acceso = sceltaPronto.modo === 'manuale' || sceltaPronto.modo === 'automatico'
            const Icona = voce.icona
            return (
              <Row key={voce.chiave} style={bordo}>
                <Icona size={14} strokeWidth={2} aria-hidden />
                <span style={{ flex: 1, fontWeight: 650 }}>{frasi.strumPronto}</span>
                <Info nome={frasi.strumPronto} titolo={frasi.strumPronto} testo={frasi.infoPronto} />
                {acceso ? (
                  <button
                    type="button"
                    onClick={() => { if (puoCambiareModo(ruolo)) setProntoAperto(true) }}
                    style={{ minHeight: 44, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 650, padding: '0 8px' }}
                  >
                    {sceltaPronto.modo === 'manuale' ? frasi.servizioManuale : frasi.servizioAutomatico}
                  </button>
                ) : null}
                <Toggle
                  checked={acceso}
                  disabled={!puoCambiareModo(ruolo)}
                  label={frasi.strumPronto}
                  onChange={(on) => {
                    if (!funzioneVisibile(piano.stato, piano.funzioni, 'pronto')) {
                      if (!collaboratore) piano.apriPaywall('pronto')
                      return
                    }
                    if (!on) salvaServizio('pronto', { ...sceltaPronto, modo: 'spento' })
                    else setProntoAperto(true)
                  }}
                />
              </Row>
            )
          }
          if (email) {
            return (
              <Row key={voce.chiave} style={{ ...bordo, height: 'auto', alignItems: 'stretch' }}>
                <FoglioServizio
                  chiave={email}
                  scelta={settings.serviziEmail?.[email] ?? { modo: 'spento' }}
                  ruolo={ruolo}
                  icona={voce.icona}
                  info={<Info nome={frasi[voce.titolo]} titolo={frasi[voce.titolo]} testo={frasi[testoInfo(email)]} />}
                  onChange={(prossima) => {
                    if (!funzioneVisibile(piano.stato, piano.funzioni, voce.chiave)) {
                      if (!collaboratore) piano.apriPaywall(voce.chiave)
                      return
                    }
                    salvaServizio(email, prossima)
                  }}
                  link={settings.linkRecensioni ?? ''}
                  onLink={(valore) => save({ ...settings, linkRecensioni: valore })}
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
      <Dialog open={prontoAperto} title={frasi.strumPronto} onClose={() => setProntoAperto(false)}>
        <FoglioServizio
          chiave="pronto"
          scelta={settings.serviziEmail?.pronto ?? { modo: 'spento' }}
          ruolo={ruolo}
          onChange={(prossima) => {
            salvaServizio('pronto', prossima)
            setProntoAperto(false)
          }}
        />
      </Dialog>
    </>
  )
}

export function BloccoSalone() {
  const frasi = useFrasi()
  const piano = usePiano()
  const navigate = useNavigate()
  const { collaboratore } = useRuolo()
  const salone = funzioneVisibile(piano.stato, piano.funzioni, 'team')
  return (
    <>
      <SectionTitle>{frasi.servizioSalone}</SectionTitle>
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
    </>
  )
}
