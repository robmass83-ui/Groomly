import { ChevronRight, Pencil } from 'lucide-react'
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
import { useFileSrc } from '../hooks/useFileSrc'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { etichettaDispositivo } from '../lib/dispositivoAttuale'
import { prepareLogo } from '../lib/dogPhoto'
import { conIntestazioneSalone } from '../lib/intestazioneSalone'
import { stileLogo } from '../lib/logoForma'
import { guardCaptureClick } from '../lib/photoCapture'
import { getPriceSheet, PRICE_SHEET_NOT_SAVED, PRICE_SHEET_UNREADABLE, savePriceSheet } from '../lib/priceSheet'
import { normalizeTaxCode, normalizeVat, taxCodeError, vatError } from '../lib/profile'
import { priceSheetSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type Scheda = 'home' | 'personali' | 'sicurezza' | 'privacy'
type Foglio = 'titolare' | 'toelettatura' | 'orari' | 'email' | 'password' | 'recupero' | null

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
  const [password, setPassword] = useState('')
  const [nuova, setNuova] = useState('')
  const [google, setGoogle] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!firebaseEnabled()) return
    let vivo = true
    void import('../data/firebase/client').then((mod) => mod.googleCollegato()).then((collegato) => {
      if (vivo) setGoogle(collegato)
    }).catch(() => {
      if (vivo) setGoogle(false)
    })
    return () => { vivo = false }
  }, [scheda])

  function apri(id: Scheda) {
    const next = new URLSearchParams(params)
    next.set('scheda', id)
    setParams(next, { replace: true })
  }

  function apriFoglio(quale: Foglio, valore: string) {
    setFoglio(quale)
    setBozza(valore)
    setPassword('')
    setNuova('')
  }

  function salvaProfilo() {
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

  function apriToelettatura() {
    setBozzaBusiness(settings.business)
    setErrori({ vat: null, taxCode: null })
    setFoglio('toelettatura')
  }

  function salvaToelettatura() {
    const vat = vatError(bozzaBusiness.vatNumber)
    const taxCode = taxCodeError(bozzaBusiness.taxCode)
    setErrori({ vat, taxCode })
    if (vat !== null || taxCode !== null) return
    // Il placeId vecchio non passa: resta solo quello della bozza (tolto se l’indirizzo è stato riscritto a mano).
    const { placeId: _vecchio, ...resto } = settings.business
    const business = {
      ...resto,
      titolare: settings.business.titolare,
      salonName: bozzaBusiness.salonName.trim(),
      name: bozzaBusiness.name.trim(),
      vatNumber: normalizeVat(bozzaBusiness.vatNumber),
      phone: bozzaBusiness.phone.trim(),
      address: bozzaBusiness.address.trim(),
      ...(bozzaBusiness.placeId ? { placeId: bozzaBusiness.placeId } : {}),
      taxCode: normalizeTaxCode(bozzaBusiness.taxCode),
    }
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
    setBozzaBusiness(settings.business)
    setErrori({ vat: null, taxCode: null })
    setFoglio('toelettatura')
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
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function salvaEmail() {
    if (!bozza.includes('@')) {
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
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function inviaVerifica() {
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.sendVerification()
      toast.show(frasi.accInviata, 'plain')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  async function toggleGoogle() {
    if (!firebaseEnabled()) {
      toast.show(frasi.accGoogleWeb, 'plain')
      return
    }
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      if (google) await mod.scollegaGoogle()
      else await mod.collegaGoogle()
      setGoogle(!google)
    } catch (error) {
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
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
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  const tab: { id: Scheda; label: string }[] = [
    { id: 'home', label: frasi.accHome },
    { id: 'personali', label: frasi.accPersonali },
    { id: 'sicurezza', label: frasi.accSicurezza },
    { id: 'privacy', label: frasi.accPrivacy },
  ]
  const linguaNome = lingua === 'en' ? 'English' : lingua === 'es' ? 'Español' : 'Italiano'
  const suggerimento = !session.emailVerified
    ? frasi.accSuggerimentoEmail
    : settings.telefonoRecupero
      ? null
      : frasi.accSuggerimentoTelefono

  return (
    <ShellFrame>
      <Header title={frasi.hubGestisci} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <div role="tablist" aria-label={frasi.hubGestisci} style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {tab.map((voce) => {
            const acceso = voce.id === scheda
            return (
              <button
                key={voce.id}
                type="button"
                role="tab"
                aria-selected={acceso}
                onClick={() => apri(voce.id)}
                style={{
                  minHeight: 44,
                  flex: 'none',
                  border: 0,
                  borderBottom: acceso ? '2px solid var(--pri)' : '2px solid transparent',
                  background: 'transparent',
                  color: acceso ? 'var(--tx)' : 'var(--tx3)',
                  font: 'inherit',
                  fontWeight: 700,
                  padding: '0 4px',
                }}
              >
                {voce.label}
              </button>
            )
          })}
        </div>

        {scheda === 'home' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0' }}>
              <Logo logo={logo} iniziale={iniziale} larghezzaMax={220} />
              <div style={{ fontWeight: 700, fontSize: 20, ...USER_TEXT }}>{nome}</div>
              <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{email}</div>
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
            {suggerimento ? (
              <Card>
                <Row style={{ borderTop: 'none', minHeight: 52 }}>
                  <button type="button" onClick={() => apri(suggerimento === frasi.accSuggerimentoEmail ? 'sicurezza' : 'personali')} style={{ ...link, border: 0, background: 'transparent', font: 'inherit', textAlign: 'left' }}>
                    <span style={{ flex: 1, fontWeight: 700 }}>{frasi.hubSuggerimenti}</span>
                    <span style={{ color: 'var(--tx2)', fontSize: TYPE.meta }}>{suggerimento}</span>
                  </button>
                </Row>
              </Card>
            ) : null}
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
                      onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
                      onChange={(event) => void cambiaLogo(event)}
                    />
                  </>
                )}
              </Row>
              <Riga titolo={frasi.accTitolare} valore={settings.business.titolare} onClick={() => apriFoglio('titolare', settings.business.titolare)} />
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
                  <Riga titolo={frasi.authIva} valore={settings.business.vatNumber} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authIva}`} onClick={apriToelettatura} />
                  <Riga titolo={frasi.authCodiceFiscale} valore={settings.business.taxCode} etichetta={`${frasi.accModificaToelettatura}, ${frasi.authCodiceFiscale}`} onClick={apriToelettatura} />
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
                <span style={{ flex: 1 }}>{frasi.accGoogle}</span>
                <Button variant="secondary" onClick={() => { void toggleGoogle() }} disabled={occupato}>{google ? frasi.accScollega : frasi.accCollega}</Button>
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
            {collaboratore ? null : (
              <Card>
                <Riga titolo={frasi.accTelefonoRecupero} valore={settings.telefonoRecupero ?? ''} onClick={() => apriFoglio('recupero', settings.telefonoRecupero ?? '')} />
              </Card>
            )}
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
            </Card>
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

      <Dialog open={foglio === 'titolare'} title={frasi.accTitolare} onClose={() => setFoglio(null)}>
        <Input label={frasi.accTitolare} value={bozza} onChange={(event) => setBozza(event.target.value)} />
        <Button onClick={salvaProfilo}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'toelettatura'} title={frasi.accToelettatura} onClose={() => setFoglio(null)}>
        <Input label={frasi.authRagione} value={bozzaBusiness.name} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, name: event.target.value })} />
        <Input label={frasi.authNomeSalone} value={bozzaBusiness.salonName} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, salonName: event.target.value })} />
        <Input label={frasi.authIva} value={bozzaBusiness.vatNumber} error={errori.vat ?? undefined} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, vatNumber: event.target.value })} />
        <Input label={frasi.authCodiceFiscale} value={bozzaBusiness.taxCode} autoCapitalize="characters" error={errori.taxCode ?? undefined} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, taxCode: event.target.value })} />
        <Input label={frasi.schedaTelefono} type="tel" value={bozzaBusiness.phone} onChange={(event) => setBozzaBusiness({ ...bozzaBusiness, phone: event.target.value })} />
        <IndirizzoInput label={frasi.authIndirizzo} valore={bozzaBusiness.address} placeId={bozzaBusiness.placeId} onChange={(next) => setBozzaBusiness({ ...bozzaBusiness, address: next.indirizzo, placeId: next.placeId })} />
        <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.authBastaIva}</small>
        <Button onClick={salvaToelettatura}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={foglio === 'orari'} title={frasi.orariApertura} onClose={() => setFoglio(null)}>
        <OrariEditor mostra orari={settings.orari} onChange={(orari) => save({ ...settings, orari })} />
      </Dialog>
      <Dialog open={foglio === 'recupero'} title={frasi.accTelefonoRecupero} onClose={() => setFoglio(null)}>
        <Input label={frasi.accTelefonoRecupero} value={bozza} onChange={(event) => setBozza(event.target.value)} />
        <Button onClick={() => {
          const ok = save({ ...settings, telefonoRecupero: bozza.trim() })
          if (!ok) toast.show(frasi.authSalvataggio, 'plain')
          else setFoglio(null)
        }}>{frasi.schedaSalva}</Button>
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

function Riga({ titolo, valore, onClick, etichetta, prima }: { titolo: string; valore: string; onClick: () => void; etichetta?: string; prima?: boolean }) {
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
