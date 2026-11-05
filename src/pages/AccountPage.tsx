import { EmailPromoRiga } from '../components/legale/EmailPromoRiga'
import { ScaricaAccount } from '../components/legale/ScaricaAccount'
import { ChevronRight, Info, Pencil, Scale } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { OrariEditor } from '../components/piano/OrariEditor'
import { Header } from '../components/layout/Header'
import { Dialog } from '../components/layout/Dialog'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { Input } from '../components/ui/Input'
import { IndirizzoInput } from '../components/ui/IndirizzoInput'
import { Toggle } from '../components/ui/Toggle'
import { firebaseEnabled } from '../data/firebase/enabled'
import { segnaVerificaInviata } from '../data/local/verificaInviata'
import { useFileSrc } from '../hooks/useFileSrc'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { DriveAuth } from '../lib/driveAuth'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { NOMI_LINGUA } from '../i18n/lingua'
import { etichettaDispositivo } from '../lib/dispositivoAttuale'
import { prepareLogo } from '../lib/dogPhoto'
import { conIntestazioneSalone } from '../lib/intestazioneSalone'
import { stileLogo } from '../lib/logoForma'
import { getPriceSheet, PRICE_SHEET_NOT_SAVED, PRICE_SHEET_UNREADABLE, savePriceSheet } from '../lib/priceSheet'
import { etichettaIva, esempioIva, haCodiceFiscale, paeseIndovinato, type CodicePaese } from '../lib/paese'
import { messaggioAuth } from '../lib/erroriAuth'
import { emailValida } from '../lib/codaEmail'
import { NOME_PERSONA_MAX, TITOLARE_MAX, telefonoValido } from '../lib/validazioni'
import { normalizeTaxCode, normalizeVat, taxCodeError, vatError } from '../lib/profile'
import { SelettorePaese } from '../components/ui/SelettorePaese'
import { priceSheetSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type Scheda = 'home' | 'personali' | 'sicurezza' | 'privacy'
type Foglio = 'nome' | 'titolare' | 'toelettatura' | 'orari' | 'email' | 'password' | null

const link = { display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 } as const

function schedaValida(value: string | null): Scheda {
  if (value === 'personali' || value === 'sicurezza' || value === 'privacy') return value
  return 'home'
}

export function AccountPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const toast = useToast()
  const { settings, save, ready } = useSettings()
  const [params, setParams] = useSearchParams()
  const scheda = schedaValida(params.get('scheda'))
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const email = account?.email ?? ''
  const logo = useFileSrc(settings.priceSheet?.intestazione.logo, 'full')
  const nome = settings.business.salonName.trim() || settings.business.name.trim() || email
  const iniziale = (nome.trim().charAt(0) || 'G').toUpperCase()
  const collaboratore = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  const [foglio, setFoglio] = useState<Foglio>(null)
  const [bozza, setBozza] = useState('')
  const [bozzaBusiness, setBozzaBusiness] = useState(settings.business)
  const [errori, setErrori] = useState<{ vat: string | null; taxCode: string | null }>({ vat: null, taxCode: null })
  // la partita IVA già salvata che il paese non accetta si mostra ma non blocca: conta solo se la si tocca o si cambia paese
  const [ivaToccata, setIvaToccata] = useState(false)
  const [mancanti, setMancanti] = useState<{ salonName: boolean; name: boolean }>({ salonName: false, name: false })
  const [titolareLungo, setTitolareLungo] = useState(false)
  const [cognome, setCognome] = useState('')
  const [nomeMancante, setNomeMancante] = useState(false)
  const [telefonoErrato, setTelefonoErrato] = useState(false)
  const [password, setPassword] = useState('')
  const [nuova, setNuova] = useState('')
  const [driveEmail, setDriveEmail] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  useEffect(() => {
    if (!uid) return
    let vivo = true
    DriveAuth.leggi({ uid }).then((account) => {
      if (vivo) setDriveEmail(account.collegato ? account.email ?? frasi.bakDriveCollegato : null)
    }).catch(() => {
      if (vivo) setDriveEmail(null)
    })
    return () => { vivo = false }
  }, [uid, scheda, frasi.bakDriveCollegato])

  // Le sezioni sono pagine: la home dell'account è /impostazioni/account senza scheda.
  function apri(id: Scheda) {
    const next = new URLSearchParams(params)
    if (id === 'home') next.delete('scheda')
    else next.set('scheda', id)
    setParams(next, { replace: true })
  }

  function apriFoglio(quale: Foglio, valore: string) {
    setFoglio(quale)
    setTitolareLungo(false)
    setBozza(valore)
    setPassword('')
    setNuova('')
  }

  const persona = session.gate.kind === 'in' ? session.gate.account : null
  const tuoNome = [persona?.firstName ?? '', persona?.lastName ?? ''].map((parte) => parte.trim()).filter(Boolean).join(' ')

  function apriNome() {
    apriFoglio('nome', persona?.firstName ?? '')
    setCognome(persona?.lastName ?? '')
    setNomeMancante(false)
  }

  async function salvaNome() {
    if (bozza.trim() === '') {
      setNomeMancante(true)
      return
    }
    if (!persona) return
    // Il nome si mostra subito; offline la scrittura parte quando torna la rete.
    session.replaceAccount({ ...persona, firstName: bozza.trim(), lastName: cognome.trim() })
    setFoglio(null)
    const mod = await import('../data/firebase/client')
    await mod.aggiornaNomeAccount(bozza, cognome).catch((error: unknown) => toast.show(messaggioAuth(lingua, error), 'plain'))
  }

  function salvaProfilo() {
    if (bozza.trim().length > TITOLARE_MAX) {
      setTitolareLungo(true)
      return
    }
    const ok = save({ ...settings, business: { ...settings.business, titolare: bozza.trim() } })
    if (!ok) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    setFoglio(null)
  }

  // Il logo vive nell’intestazione del listino: si cambia da qui senza aprire la gestione listino.
  async function cambiaLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let nuovo: string
    try {
      nuovo = await prepareLogo(file)
    } catch {
      toast.show(frasi.schedaFotoGrande, 'plain')
      return
    }
    const sheet = getPriceSheet(settings)
    const message = savePriceSheet(settings, { ...sheet, intestazione: { ...sheet.intestazione, logo: nuovo } }, save)
    if (message) toast.show(message === PRICE_SHEET_UNREADABLE ? frasi.lisIlleggibile : message === PRICE_SHEET_NOT_SAVED ? frasi.manNonSalvato : frasi.authSalvataggio, 'plain')
  }

  // Senza paese salvato (né dall'indirizzo) si parte da quello del fuso del telefono, altrimenti Italia.
  const paeseBozza: CodicePaese = bozzaBusiness.paese ?? paeseIndovinato()
  const paeseSalone: CodicePaese = settings.business.paese ?? 'IT'

  function apriToelettatura() {
    const business = settings.business
    setBozzaBusiness(business)
    setIvaToccata(false)
    setTelefonoErrato(false)
    setMancanti({ salonName: false, name: false })
    setErrori({ vat: vatError(business.vatNumber, business.paese ?? 'IT', lingua), taxCode: null })
    setFoglio('toelettatura')
  }

  function scegliPaese(paese: CodicePaese) {
    setBozzaBusiness({ ...bozzaBusiness, paese, paeseScelto: true })
    setIvaToccata(true)
    setErrori({ ...errori, vat: vatError(bozzaBusiness.vatNumber, paese, lingua) })
  }

  function cambiaIndirizzo(next: { indirizzo: string; placeId?: string; paese?: CodicePaese }) {
    // Il paese dell'indirizzo si propone solo se il titolare non l'ha scelto a mano.
    const daIndirizzo = next.paese && bozzaBusiness.paeseScelto !== true ? next.paese : null
    setBozzaBusiness({ ...bozzaBusiness, address: next.indirizzo, placeId: next.placeId, ...(daIndirizzo ? { paese: daIndirizzo } : {}) })
    if (daIndirizzo) setErrori({ ...errori, vat: vatError(bozzaBusiness.vatNumber, daIndirizzo, lingua) })
  }

  function salvaToelettatura() {
    const telefonoSbagliato = bozzaBusiness.phone.trim() !== '' && !telefonoValido(bozzaBusiness.phone)
    setTelefonoErrato(telefonoSbagliato)
    const vuoti = { salonName: bozzaBusiness.salonName.trim() === '', name: bozzaBusiness.name.trim() === '' }
    setMancanti(vuoti)
    const vat = vatError(bozzaBusiness.vatNumber, paeseBozza, lingua)
    const taxCode = haCodiceFiscale(paeseBozza) ? taxCodeError(bozzaBusiness.taxCode, lingua) : null
    setErrori({ vat, taxCode })
    if (vuoti.salonName || vuoti.name || telefonoSbagliato) return
    if ((vat !== null && ivaToccata) || taxCode !== null) return
    // Il placeId vecchio non passa: resta solo quello della bozza (tolto se l’indirizzo è stato riscritto a mano).
    const { placeId: _vecchio, ...resto } = settings.business
    const conPaese = {
      ...resto,
      titolare: settings.business.titolare,
      salonName: bozzaBusiness.salonName.trim(),
      name: bozzaBusiness.name.trim(),
      vatNumber: normalizeVat(bozzaBusiness.vatNumber),
      phone: bozzaBusiness.phone.trim(),
      address: bozzaBusiness.address.trim(),
      ...(bozzaBusiness.placeId ? { placeId: bozzaBusiness.placeId } : {}),
      taxCode: normalizeTaxCode(bozzaBusiness.taxCode),
      paese: paeseBozza,
    }
    const business = bozzaBusiness.paeseScelto === true ? { ...conPaese, paeseScelto: true } : conPaese
    let priceSheet = settings.priceSheet
    if (priceSheet && priceSheetSchema.safeParse(priceSheet).success) {
      priceSheet = conIntestazioneSalone(priceSheet, business)
    }
    const ok = save({ ...settings, business, priceSheet })
    if (!ok) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    setFoglio(null)
  }

  const modifica = params.get('modifica')
  useEffect(() => {
    if (!ready || modifica !== 'toelettatura' || collaboratore) return
    apriToelettatura()
    const next = new URLSearchParams(params)
    next.delete('modifica')
    setParams(next, { replace: true })
  }, [ready, modifica, collaboratore])

  async function salvaPassword() {
    if (nuova.trim().length < 8) {
      toast.show(frasi.authMinimo, 'plain')
      return
    }
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.cambiaPassword(password, nuova)
      toast.show(frasi.accSalvato, 'plain')
      setFoglio(null)
    } catch (error) {
      toast.show(messaggioAuth(lingua, error), 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function salvaEmail() {
    if (!emailValida(bozza.trim())) {
      toast.show(frasi.authEmailValida, 'plain')
      return
    }
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.cambiaEmailAccesso(password, bozza)
      toast.show(firebaseEnabled() ? frasi.accInviata : frasi.accSalvato, 'plain')
      setFoglio(null)
    } catch (error) {
      toast.show(messaggioAuth(lingua, error), 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function inviaVerifica() {
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      const { alreadyVerified } = await mod.sendVerification()
      if (!alreadyVerified && persona) segnaVerificaInviata(persona.email)
      toast.show(alreadyVerified ? frasi.accGiaVerificata : frasi.accInviata, 'plain')
    } catch (error) {
      toast.show(messaggioAuth(lingua, error), 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function esciAltri() {
    if (!firebaseEnabled()) {
      toast.show(frasi.delOffline, 'plain')
      return
    }
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.esciAltriDispositivi()
      toast.show(frasi.accSalvato, 'plain')
    } catch (error) {
      toast.show(messaggioAuth(lingua, error), 'plain')
    } finally {
      setOccupato(false)
    }
  }

  const titoli: Record<Exclude<Scheda, 'home'>, string> = {
    personali: frasi.accPersonali,
    sicurezza: frasi.accSicurezza,
    privacy: frasi.accPrivacy,
  }
  const linguaNome = NOMI_LINGUA[lingua]

  return (
    <ShellFrame>
      {scheda === 'home'
        ? <Header title={frasi.hubGestisci} backTo="/impostazioni" />
        : <Header title={titoli[scheda]} onBack={() => apri('home')} />}
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {scheda === 'home' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 20, overflowWrap: 'anywhere', ...USER_TEXT }}>{nome}</div>
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta, overflowWrap: 'anywhere' }}>{email}</div>
              </div>
              <Logo logo={logo} iniziale={iniziale} larghezzaMax={140} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {([
                ['personali', frasi.accPersonali],
                ['sicurezza', frasi.accSicurezza],
                ['privacy', frasi.accPrivacy],
              ] as const).map(([id, titolo]) => (
                <button key={id} type="button" onClick={() => apri(id)} style={riquadro}>
                  {titolo}
                </button>
              ))}
            </div>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <Link to="/impostazioni/legale" style={link}>
                  <Scale size={16} strokeWidth={2} aria-hidden color="var(--tx2)" />
                  <span style={{ flex: 1 }}>{frasi.impLegale}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
              <Row style={{ minHeight: 52 }}>
                <Link to="/impostazioni/info" style={link}>
                  <Info size={16} strokeWidth={2} aria-hidden color="var(--tx2)" />
                  <span style={{ flex: 1 }}>{frasi.hubInfoApp}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
            </Card>
          </>
        ) : null}

        {scheda === 'personali' ? (
          <>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <Logo logo={logo} iniziale={iniziale} />
                <span style={{ flex: 1 }}>{frasi.hubPassoLogo}</span>
                {collaboratore ? null : (
                  <>
                    <button type="button" onClick={() => logoRef.current?.click()} aria-label={frasi.accCambiaLogo} style={{ color: 'var(--tx2)', minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', padding: 0 }}>
                      <Pencil size={16} strokeWidth={2} aria-hidden />
                    </button>
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      hidden
                      data-testid="account-logo"
                      onChange={(event) => void cambiaLogo(event)}
                    />
                  </>
                )}
              </Row>
              <Riga titolo={frasi.accTuoNome} valore={tuoNome} onClick={apriNome} />
              <Riga titolo={frasi.accTitolare} valore={settings.business.titolare} onClick={collaboratore ? undefined : () => apriFoglio('titolare', settings.business.titolare)} />
              <Row style={{ minHeight: 52 }}>
                <button type="button" onClick={() => apriFoglio('email', email)} style={rigaBtn}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span>{frasi.emailContatto}</span>
                    <small style={{ color: 'var(--tx3)' }}>{email}</small>
                  </span>
                  <Chip tone={session.emailVerified ? 'ok' : 'warn'}>{session.emailVerified ? frasi.accVerificata : frasi.accNonVerificata}</Chip>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </button>
              </Row>
              <Row style={{ minHeight: 52 }}>
                <Link to="/impostazioni" state={{ openLingua: true }} style={link}>
                  <span style={{ flex: 1 }}>{frasi.linguaTua}</span>
                  <span style={{ color: 'var(--tx2)' }}>{linguaNome}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
            </Card>
            {collaboratore ? null : (
              <>
                <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accToelettatura}</p>
                <Card>
                  <Riga prima titolo={frasi.authRagione} valore={settings.business.name} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authRagione}`} onClick={apriToelettatura} />
                  <Riga titolo={etichettaIva(lingua, paeseSalone)} valore={settings.business.vatNumber} etichetta={`${frasi.accModificaToelettatura}, ${etichettaIva(lingua, paeseSalone)}`} onClick={apriToelettatura} />
                  {haCodiceFiscale(paeseSalone) ? <Riga titolo={frasi.authCodiceFiscale} valore={settings.business.taxCode} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authCodiceFiscale}`} onClick={apriToelettatura} /> : null}
                  <Riga titolo={frasi.authNomeSalone} valore={settings.business.salonName} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authNomeSalone}`} onClick={apriToelettatura} />
                  <Riga titolo={frasi.schedaTelefono} valore={settings.business.phone} etichetta={`${frasi.accModificaToelettatura}, ${frasi.schedaTelefono}`} onClick={apriToelettatura} />
                  <Riga titolo={frasi.authIndirizzo} valore={settings.business.address} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authIndirizzo}`} onClick={apriToelettatura} />
                  <Riga titolo={frasi.orariApertura} valore="" onClick={() => setFoglio('orari')} />
                </Card>
              </>
            )}
          </>
        ) : null}

        {scheda === 'sicurezza' ? (
          <>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accAccesso}</p>
            <Card>
              <Riga titolo={frasi.accPassword} valore="" onClick={() => apriFoglio('password', '')} />
              <Riga titolo={frasi.accCambiaEmail} valore={email} onClick={() => apriFoglio('email', email)} />
              <Row style={{ minHeight: 52 }}>
                <button type="button" onClick={() => { void inviaVerifica() }} disabled={occupato || !firebaseEnabled()} style={rigaBtn}>
                  <span style={{ flex: 1 }}>{frasi.accVerificaEmail}</span>
                  <Chip tone={session.emailVerified ? 'ok' : 'warn'}>{session.emailVerified ? frasi.accVerificata : frasi.accNonVerificata}</Chip>
                </button>
              </Row>
            </Card>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accCollegati}</p>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span>{frasi.accDriveBackup}</span>
                  <span style={{ color: driveEmail ? 'var(--tx2)' : 'var(--tx3)', fontSize: TYPE.meta, overflowWrap: 'anywhere' }}>{driveEmail ?? frasi.bakDriveNon}</span>
                </span>
              </Row>
            </Card>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accAttivitaAccesso}</p>
            <Card>
              <Row style={{ borderTop: 'none', alignItems: 'flex-start', minHeight: 52 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 650 }}>{etichettaDispositivo(navigator.userAgent)}</span>
                  <small style={{ color: 'var(--pri)', fontWeight: 700 }}>{frasi.accAttuale}</small>
                  <small style={{ color: 'var(--tx3)' }}>{frasi.accSoloQui}</small>
                </span>
              </Row>
              <Row style={{ minHeight: 52 }}>
                <Button variant="secondary" onClick={() => { void esciAltri() }} disabled={occupato || !firebaseEnabled()} style={{ flex: 1 }}>{frasi.accEsciAltri}</Button>
              </Row>
            </Card>
          </>
        ) : null}

        {scheda === 'privacy' ? (
          <>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.privacy}</p>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <Link to="/impostazioni/legale" style={link}>
                  <span style={{ flex: 1 }}>{frasi.accCentro}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
            </Card>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accComunicazioni}</p>
            <Card>
              {/* Promozioni, metriche e telefono di recupero stanno nelle impostazioni del salone: le cambiano titolare e socio. */}
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <span style={{ flex: 1 }}>{frasi.accPromo}</span>
                <Toggle checked={settings.emailPromo === true} label={frasi.accPromo} disabled={collaboratore} onChange={(acceso) => save({ ...settings, emailPromo: acceso })} />
              </Row>
              <Row style={{ minHeight: 52 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span>{frasi.accServizio}</span>
                  <small style={{ color: 'var(--tx3)' }}>{frasi.accServizioDettaglio}</small>
                </span>
              </Row>
              <Row style={{ minHeight: 52 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span>{frasi.metriche}</span>
                  <small style={{ color: 'var(--tx3)' }}>{frasi.metricheDettaglio}</small>
                </span>
                <Toggle checked={settings.consensoMetriche === true} label={frasi.metriche} disabled={collaboratore} onChange={(acceso) => save({ ...settings, consensoMetriche: acceso })} />
              </Row>
              <EmailPromoRiga />
            </Card>
            {collaboratore ? <ScaricaAccount /> : (
              <>
            <p style={{ margin: 0, fontWeight: 750, fontSize: 13 }}>{frasi.accTuoiDati}</p>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <Link to="/impostazioni" state={{ openBackup: true }} style={link}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span>{frasi.accScarica}</span>
                    <small style={{ color: 'var(--tx3)' }}>{frasi.accScaricaDettaglio}</small>
                  </span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
            </Card>
              </>
            )}
            <p style={{ margin: '12px 0 0', fontWeight: 750, fontSize: 13, color: 'var(--tx3)' }}>{frasi.accSicurezzaAccount}</p>
            <Card>
              <Row style={{ borderTop: 'none', minHeight: 52 }}>
                <Link to="/impostazioni/account/elimina" style={{ ...link, color: 'var(--tx2)' }}>
                  <span style={{ flex: 1 }}>{frasi.eliminaAccount}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </Row>
            </Card>
          </>
        ) : null}
      </div>

      <Dialog open={foglio === 'nome'} title={frasi.accTuoNome} onClose={() => setFoglio(null)}>
        <Input label={frasi.authNome} value={bozza} maxLength={NOME_PERSONA_MAX} autoComplete="given-name" error={nomeMancante ? frasi.campoObbligatorio : undefined} onChange={(event) => { setBozza(event.target.value); setNomeMancante(false) }} />
        <Input label={frasi.authCognome} value={cognome} maxLength={NOME_PERSONA_MAX} autoComplete="family-name" onChange={(event) => setCognome(event.target.value)} />
        <Button onClick={() => { void salvaNome() }}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'titolare'} title={frasi.accTitolare} onClose={() => setFoglio(null)}>
        <Input label={frasi.accTitolare} value={bozza} maxLength={TITOLARE_MAX} error={titolareLungo ? frasi.accTitolareLungo : undefined} onChange={(event) => { setBozza(event.target.value); setTitolareLungo(false) }} />
        <Button onClick={salvaProfilo}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'toelettatura'} title={frasi.accToelettatura} onClose={() => setFoglio(null)}>
        <Input label={frasi.authRagione} value={bozzaBusiness.name} error={mancanti.name ? frasi.campoObbligatorio : undefined} onChange={(event) => { setBozzaBusiness({ ...bozzaBusiness, name: event.target.value }); setMancanti({ ...mancanti, name: false }) }} />
        <Input label={frasi.authNomeSalone} value={bozzaBusiness.salonName} error={mancanti.salonName ? frasi.campoObbligatorio : undefined} onChange={(event) => { setBozzaBusiness({ ...bozzaBusiness, salonName: event.target.value }); setMancanti({ ...mancanti, salonName: false }) }} />
        <SelettorePaese valore={paeseBozza} onChange={scegliPaese} />
        <Input
          label={etichettaIva(lingua, paeseBozza)}
          value={bozzaBusiness.vatNumber}
          placeholder={esempioIva(paeseBozza)}
          error={errori.vat ?? undefined}
          onChange={(event) => {
            setBozzaBusiness({ ...bozzaBusiness, vatNumber: event.target.value })
            setIvaToccata(true)
            if (errori.vat) setErrori({ ...errori, vat: vatError(event.target.value, paeseBozza, lingua) })
          }}
        />
        {haCodiceFiscale(paeseBozza) ? (
          <Input label={frasi.authCodiceFiscale} value={bozzaBusiness.taxCode} autoCapitalize="characters" error={errori.taxCode ?? undefined} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, taxCode: event.target.value })} />
        ) : null}
        <Input label={frasi.schedaTelefono} type="tel" value={bozzaBusiness.phone} error={telefonoErrato ? frasi.schedaTelefonoInvalido : undefined} onChange={(event) => { setBozzaBusiness({ ...bozzaBusiness, phone: event.target.value }); setTelefonoErrato(false) }} />
        <IndirizzoInput label={frasi.authIndirizzo} valore={bozzaBusiness.address} placeId={bozzaBusiness.placeId} onChange={cambiaIndirizzo} />
        {haCodiceFiscale(paeseBozza) ? <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.authBastaIva}</small> : null}
        <Button onClick={salvaToelettatura}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'orari'} title={frasi.orariApertura} onClose={() => setFoglio(null)}>
        <OrariEditor mostra orari={settings.orari} onChange={(orari) => save({ ...settings, orari })} />
      </Dialog>
      <Dialog open={foglio === 'password'} title={frasi.accPassword} onClose={() => setFoglio(null)}>
        <Input label={frasi.accPasswordAttuale} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Input label={frasi.accPasswordNuova} type="password" value={nuova} onChange={(event) => setNuova(event.target.value)} />
        <Button onClick={() => { void salvaPassword() }} disabled={occupato}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'email'} title={frasi.accCambiaEmail} onClose={() => setFoglio(null)}>
        <Input label={frasi.accEmailNuova} type="email" value={bozza} onChange={(event) => setBozza(event.target.value)} />
        <Input label={frasi.accPasswordAttuale} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button onClick={() => { void salvaEmail() }} disabled={occupato}>{frasi.schedaSalva}</Button>
      </Dialog>
    </ShellFrame>
  )
}

function Logo({ logo, iniziale, larghezzaMax }: { logo?: string; iniziale: string; larghezzaMax?: number }) {
  if (logo) return <img alt="" src={logo} style={stileLogo(64, larghezzaMax)} />
  return (
    <span aria-hidden style={{ width: 64, height: 64, borderRadius: 32, display: 'grid', placeItems: 'center', background: 'var(--surf)', color: 'var(--tx)', fontWeight: 750, fontSize: 22 }}>
      {iniziale}
    </span>
  )
}

function Riga({ titolo, valore, onClick, etichetta, prima }: { titolo: string; valore: string; onClick?: () => void; etichetta?: string; prima?: boolean }) {
  if (!onClick) {
    // Sola lettura: nessun gesto di modifica, il salvataggio sarebbe rifiutato dalle regole.
    return (
      <Row style={{ minHeight: 52, ...(prima ? { borderTop: 'none' } : {}) }}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span>{titolo}</span>
          {valore ? <small style={{ color: 'var(--tx3)', ...USER_TEXT }}>{valore}</small> : null}
        </span>
      </Row>
    )
  }
  return (
    <Row style={{ minHeight: 52, ...(prima ? { borderTop: 'none' } : {}) }}>
      <button type="button" onClick={onClick} aria-label={etichetta} style={rigaBtn}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span>{titolo}</span>
          {valore ? <small style={{ color: 'var(--tx3)', ...USER_TEXT }}>{valore}</small> : null}
        </span>
        <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
      </button>
    </Row>
  )
}

const rigaBtn = {
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  gap: 8,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left' as const,
  padding: 0,
  minHeight: 44,
  width: '100%',
}

const riquadro = {
  minHeight: 72,
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  boxShadow: 'var(--sh-2)',
  color: 'var(--tx)',
  font: 'inherit',
  fontWeight: 700,
  fontSize: 13,
  padding: 8,
}
