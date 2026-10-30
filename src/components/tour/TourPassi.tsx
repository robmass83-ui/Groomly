import { Capacitor } from '@capacitor/core'
import { AlignLeft, Clock, Cloud, Droplet, Image, ReceiptEuro, Scissors, Sparkles, Timer, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { firebaseEnabled, readsLocal } from '../../data/firebase/enabled'
import { getSettings, type SettingsMain } from '../../data/local/settings'
import { useCollegaDrive } from '../../hooks/useCollegaDrive'
import { useServices } from '../../hooks/useServices'
import { useSession } from '../../hooks/useSession'
import { useSettings } from '../../hooks/useSettings'
import { useFrasi } from '../../i18n/LinguaContext'
import { conBackupImpostato } from '../../lib/backupImpostato'
import { TAGLIE } from '../../lib/dogList'
import type { PassoSalone } from '../../lib/completaSalone'
import { prepareLogo } from '../../lib/dogPhoto'
import { stileLogo } from '../../lib/logoForma'
import { conIntestazioneSalone } from '../../lib/intestazioneSalone'
import { orariCompilati } from '../../lib/orari'
import { getPriceSheet, savePriceSheet } from '../../lib/priceSheet'
import { normalizeTaxCode, normalizeVat, taxCodeError, vatError } from '../../lib/profile'
import { priceSheetSchema } from '../../lib/schemas'
import { USER_TEXT } from '../../theme/text'
import type { DogSize, Service } from '../../types/models'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { OrariEditor } from '../piano/OrariEditor'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IndirizzoInput } from '../ui/IndirizzoInput'
import { Input } from '../ui/Input'
import { TourAnello, TourIllustrazione, TourPulsante, TourTappe, TourTestata } from './TourScena'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** Pezzo che entra a cascata: `i` è la sua posizione nella schermata. */
export function cascata(i: number, style?: CSSProperties): { className: string; style: Vars } {
  return { className: 'tour-cascata', style: { '--i': i, ...style } as Vars }
}

/** Impostazioni del salone per il tour: lettura fresca e scrittura con il messaggio se non riesce. */
export function useImpostazioniTour() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const { settings, save, ready } = useSettings()
  const toast = useToast()
  const frasi = useFrasi()
  function attuali(): SettingsMain {
    return firebaseEnabled() && !readsLocal() ? settings : uid ? getSettings(uid) : settings
  }
  function scrivi(ricetta: (current: SettingsMain) => SettingsMain): boolean {
    // online, prima di ready le impostazioni in memoria sono vuote o vecchie: salvarle coprirebbe quelle vere
    if (!uid || !ready) return false
    const source = attuali()
    const next = ricetta(source)
    if (next === source) return true
    const ok = save(next)
    if (!ok) toast.show(frasi.authSalvataggio, 'plain')
    return ok
  }
  return { uid, ready, attuali, scrivi }
}

// Come la scheda toelettatura: l'intestazione del listino segue i dati del salone.
function conBusiness(current: SettingsMain, business: SettingsMain['business']): SettingsMain {
  let priceSheet = current.priceSheet
  if (priceSheet && priceSheetSchema.safeParse(priceSheet).success) priceSheet = conIntestazioneSalone(priceSheet, business)
  return { ...current, business, priceSheet }
}

function grassetto(testo: string): ReactNode[] {
  return testo.split('**').map((parte, i) => (i % 2 === 1 ? <b key={i}>{parte}</b> : parte))
}

const titolo: CSSProperties = { margin: '8px 0 4px', fontSize: 22, lineHeight: 1.2, fontWeight: 750, letterSpacing: '-0.015em', color: 'var(--tx)' }
const sotto: CSSProperties = { margin: '0 0 10px', fontSize: 14, lineHeight: 1.45, color: 'var(--tx2)' }

export const linkTour: CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 10,
  background: 'none',
  font: 'inherit',
  fontWeight: 650,
  fontSize: 14,
  color: 'var(--pri)',
  cursor: 'pointer',
}

export function Piede({ i, children }: { i: number; children: ReactNode }) {
  const c = cascata(i)
  return (
    <div className={c.className} style={{ ...c.style, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 10 }}>
      {children}
    </div>
  )
}

function Salta({ onClick }: { onClick: () => void }) {
  const frasi = useFrasi()
  return <button type="button" className="tour-link" style={linkTour} onClick={onClick}>{frasi.tourSalta}</button>
}

/** Testata, illustrazione grande, titolo e sottotitolo dei passi con pochi campi. */
function Intestazione({ n, m, tono, icona, testo, dettaglio }: { n: number; m: number; tono: Parameters<typeof TourIllustrazione>[0]['tono']; icona: LucideIcon; testo: string; dettaglio: string }) {
  return (
    <>
      <div {...cascata(0)}><TourTestata n={n} m={m} /></div>
      <div {...cascata(1)}><TourIllustrazione tono={tono} icona={icona} /></div>
      <h1 {...cascata(2, titolo)}>{testo}</h1>
      <p {...cascata(3, sotto)}>{dettaglio}</p>
    </>
  )
}

/** Nei passi con tanti campi il riquadro da 56px sta accanto al titolo. */
function IntestazioneCompatta({ n, m, tono, icona, testo, dettaglio }: { n: number; m: number; tono: Parameters<typeof TourIllustrazione>[0]['tono']; icona: LucideIcon; testo: string; dettaglio?: string }) {
  return (
    <>
      <div {...cascata(0)}><TourTestata n={n} m={m} /></div>
      <div {...cascata(1, { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 })}>
        <TourIllustrazione tono={tono} icona={icona} compatta />
        <div>
          <h1 style={{ ...titolo, margin: 0, fontSize: 19 }}>{testo}</h1>
          {dettaglio ? <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{dettaglio}</div> : null}
        </div>
      </div>
    </>
  )
}

export type PassoProps = { n: number; m: number; onFatto: () => void; onSalta: () => void }

export function PassoLogo({ n, m, onFatto, onSalta }: PassoProps) {
  const frasi = useFrasi()
  const toast = useToast()
  const { save } = useSettings()
  const { attuali } = useImpostazioniTour()
  const [logo, setLogo] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function scegli(event: ChangeEvent<HTMLInputElement>) {
    const scelto = event.target.files?.[0]
    event.target.value = ''
    if (!scelto) return
    try {
      setLogo(await prepareLogo(scelto))
    } catch {
      toast.show(frasi.schedaFotoGrande, 'plain')
    }
  }

  function fatto() {
    if (!logo) return
    const current = attuali()
    const sheet = getPriceSheet(current)
    const errore = savePriceSheet(current, { ...sheet, intestazione: { ...sheet.intestazione, logo } }, save)
    if (errore) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    onFatto()
  }

  return (
    <>
      <Intestazione n={n} m={m} tono="logo" icona={Image} testo={frasi.tourLogoTitolo} dettaglio={frasi.tourLogoSotto} />
      <div {...cascata(4, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 })}>
        {logo ? <img src={logo} alt="" style={stileLogo(96, 240)} /> : null}
        <Button variant="secondary" size="lg" onClick={() => file.current?.click()} style={{ width: '100%' }}>
          {logo ? frasi.tourLogoCambia : frasi.tourLogoScegli}
        </Button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void scegli(e) }} aria-label={frasi.tourLogoScegli} />
      </div>
      <Piede i={5}>
        <TourPulsante pronto={logo !== null} disabled={logo === null} onClick={fatto}>{frasi.tourFatto}</TourPulsante>
        <Salta onClick={onSalta} />
      </Piede>
    </>
  )
}

export function PassoSede({ n, m, onFatto, onSalta }: PassoProps) {
  const frasi = useFrasi()
  const { attuali, scrivi } = useImpostazioniTour()
  const [iniziale] = useState(attuali)
  const [indirizzo, setIndirizzo] = useState(iniziale.business.address)
  const [placeId, setPlaceId] = useState(iniziale.business.placeId)
  const [orari, setOrari] = useState(iniziale.orari)
  const valido = indirizzo.trim() !== '' && orariCompilati(orari)

  function fatto() {
    if (!valido) return
    const ok = scrivi((current) => {
      // il placeId vale solo per l'indirizzo scelto dai suggerimenti
      const { placeId: _vecchio, ...resto } = current.business
      const business = { ...resto, address: indirizzo.trim(), ...(placeId ? { placeId } : {}) }
      return { ...conBusiness(current, business), orari }
    })
    if (ok) onFatto()
  }

  return (
    <>
      <IntestazioneCompatta n={n} m={m} tono="sede" icona={Clock} testo={frasi.tourSedeTitolo} />
      {/* ogni pezzo a cascata è un contesto di sovrapposizione: senza zIndex gli orari coprono i suggerimenti */}
      <div {...cascata(2, { marginTop: 12, position: 'relative', zIndex: 2 })}>
        <IndirizzoInput
          label={frasi.tourSedeIndirizzo}
          valore={indirizzo}
          placeId={placeId}
          onChange={(next) => {
            setIndirizzo(next.indirizzo)
            setPlaceId(next.placeId)
          }}
        />
      </div>
      <div {...cascata(3, { marginTop: 10 })}>
        <OrariEditor mostra orari={orari} onChange={setOrari} tour titolo={frasi.tourSedeOrari} />
      </div>
      <p {...cascata(4, { fontSize: 11.5, color: 'var(--tx3)', margin: '6px 2px 0' })}>{frasi.tourSedeNota}</p>
      <Piede i={5}>
        <TourPulsante pronto={valido} disabled={!valido} onClick={fatto}>{frasi.tourFatto}</TourPulsante>
        <Salta onClick={onSalta} />
      </Piede>
    </>
  )
}

export const SERVIZI_TOUR = ['bagno', 'taglio', 'bagno-taglio', 'stripping'] as const

const ICONE_SERVIZI: Record<(typeof SERVIZI_TOUR)[number], { icona: LucideIcon; tc: string; tb: string }> = {
  bagno: { icona: Droplet, tc: 'var(--s-bagno)', tb: 'var(--s-bagno-bg)' },
  taglio: { icona: Scissors, tc: 'var(--s-taglio)', tb: 'var(--s-taglio-bg)' },
  'bagno-taglio': { icona: Sparkles, tc: 'var(--s-combo)', tb: 'var(--s-combo-bg)' },
  stripping: { icona: AlignLeft, tc: 'var(--s-strip)', tb: 'var(--s-strip-bg)' },
}

// prezzi come nel listino: punto o virgola, al massimo due decimali; minuti interi
const cifra = (testo: string) => Number(testo.trim().replace(',', '.'))

function cifraValida(testo: string, fase: 'prezzi' | 'tempi'): boolean {
  const t = testo.trim()
  if (fase === 'prezzi') return /^\d{1,4}([.,]\d{1,2})?$/.test(t)
  if (!/^\d{1,4}$/.test(t)) return false
  const n = Number(t)
  return n >= 5 && n <= 600
}

// la casella pulsa a ogni cambio: si toglie e si rimette la classe
function lampeggia(event: FormEvent<HTMLInputElement>) {
  const casella = event.currentTarget
  casella.classList.remove('tour-flash')
  void casella.offsetWidth
  casella.classList.add('tour-flash')
}

const COLONNA = 46

export function PassoPrezzi({ n, m, fase, onTempi, onFatto, onSalta }: PassoProps & { fase: 'prezzi' | 'tempi'; onTempi: () => void }) {
  const frasi = useFrasi()
  const toast = useToast()
  const { uid } = useImpostazioniTour()
  const { services, saveExisting } = useServices(uid ?? '')
  const campo = fase === 'prezzi' ? 'price' : 'durationMin'
  const righe = SERVIZI_TOUR.flatMap((id) => {
    const servizio = services.find((s) => s.id === id && s.active)
    return servizio ? [{ id, servizio }] : []
  })
  // solo le caselle toccate: le altre leggono il valore salvato
  const [bozza, setBozza] = useState<Record<string, string>>({})
  const valore = (s: Service, taglia: DogSize) => bozza[`${s.id}.${taglia}`] ?? String(s[campo][taglia])
  const valido = righe.every(({ servizio }) => TAGLIE.every((taglia) => cifraValida(valore(servizio, taglia), fase)))
  const nomiTaglia: Record<DogSize, string> = { piccola: frasi.tourPiccola, media: frasi.tourMedia, grande: frasi.tourGrande }

  function salva() {
    if (!valido) return
    for (const { id, servizio } of righe) {
      const nuovo = { ...servizio[campo] }
      for (const taglia of TAGLIE) nuovo[taglia] = cifra(valore(servizio, taglia))
      const prima = servizio[campo]
      if (TAGLIE.every((taglia) => nuovo[taglia] === prima[taglia])) continue
      if (!saveExisting(id, { [campo]: nuovo })) {
        toast.show(frasi.authSalvataggio, 'plain')
        return
      }
    }
    if (fase === 'prezzi') onTempi()
    else onFatto()
  }

  return (
    <>
      <IntestazioneCompatta
        n={n}
        m={m}
        tono="listino"
        icona={fase === 'prezzi' ? Scissors : Timer}
        testo={fase === 'prezzi' ? frasi.tourPrezziTitolo : frasi.tourTempiTitolo}
        dettaglio={fase === 'prezzi' ? frasi.tourPrezziSotto : frasi.tourTempiSotto}
      />
      <div {...cascata(1)}><TourTappe attiva={fase === 'prezzi' ? 1 : 2} /></div>
      <div {...cascata(2, { marginTop: 10 })}>
        <Card>
          <div aria-hidden style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '6px 10px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--tx3)', textTransform: 'uppercase' }}>
            {TAGLIE.map((taglia) => <span key={taglia} style={{ width: COLONNA, textAlign: 'center' }}>{nomiTaglia[taglia]}</span>)}
          </div>
          {righe.map(({ id, servizio }, r) => {
            const tono = ICONE_SERVIZI[id]
            const Icona = tono.icona
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderTop: r === 0 ? 'none' : '1px solid var(--line)' }}>
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', flex: 'none', background: tono.tb, color: tono.tc }}>
                  <Icona size={14} strokeWidth={2.2} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13, ...USER_TEXT }}>{servizio.name}</span>
                {TAGLIE.map((taglia) => {
                  const testo = valore(servizio, taglia)
                  const ok = cifraValida(testo, fase)
                  return (
                    <input
                      key={taglia}
                      type="text"
                      inputMode={fase === 'prezzi' ? 'decimal' : 'numeric'}
                      className="tour-campo"
                      aria-label={`${servizio.name} ${nomiTaglia[taglia].toLocaleLowerCase()}`}
                      aria-invalid={ok ? undefined : true}
                      value={testo}
                      onInput={lampeggia}
                      onChange={(e) => {
                        const pulito = fase === 'prezzi'
                          ? e.target.value.replace(/[^\d.,]/g, '').slice(0, 7)
                          : e.target.value.replace(/\D/g, '').slice(0, 4)
                        setBozza((b) => ({ ...b, [`${servizio.id}.${taglia}`]: pulito }))
                      }}
                      style={{
                        width: COLONNA,
                        minHeight: 40,
                        flex: 'none',
                        boxSizing: 'border-box',
                        borderRadius: 8,
                        border: `1px solid ${ok ? 'var(--line2)' : 'var(--bad)'}`,
                        background: 'var(--surf)',
                        color: 'var(--tx)',
                        font: 'inherit',
                        fontSize: 13,
                        textAlign: 'center',
                        padding: 0,
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </Card>
      </div>
      <div role="note" className="tour-avviso-prezzi" style={{ display: 'flex', gap: 8, marginTop: 10, padding: 10, borderRadius: 12, background: 'var(--warn-s)', color: 'var(--warn)', fontSize: 12, lineHeight: 1.4 }}>
        <TriangleAlert size={16} strokeWidth={2.2} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
        <span>{grassetto(fase === 'prezzi' ? frasi.tourPrezziAvviso : frasi.tourTempiAvviso)}</span>
      </div>
      <Piede i={4}>
        <TourPulsante pronto={valido} disabled={!valido} onClick={salva}>
          {fase === 'prezzi' ? frasi.tourAvantiTempi : frasi.tourFatto}
        </TourPulsante>
        <Salta onClick={onSalta} />
      </Piede>
    </>
  )
}

export function PassoBackup({ n, m, aggiornaDrive, onFatto, onSalta }: PassoProps & { aggiornaDrive: (email: string | null) => void }) {
  const frasi = useFrasi()
  const { scrivi } = useImpostazioniTour()
  const drive = useCollegaDrive(aggiornaDrive)
  const telefono = Capacitor.isNativePlatform()

  function impostato() {
    if (scrivi((current) => conBackupImpostato(current, true))) onFatto()
  }

  async function collega() {
    if ((await drive.collega()) === 'collegato') impostato()
  }

  async function conferma() {
    if (await drive.conferma()) impostato()
  }

  return (
    <>
      <Intestazione n={n} m={m} tono="backup" icona={Cloud} testo={frasi.tourBackupTitolo} dettaglio={frasi.tourBackupSotto} />
      {telefono ? null : (
        <p {...cascata(4, { ...sotto, display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', color: 'var(--tx)' })}>
          {frasi.tourBackupWeb}
        </p>
      )}
      <Piede i={5}>
        {telefono ? (
          <>
            <TourPulsante freccia={false} disabled={drive.busy} onClick={() => { void collega() }}>{frasi.bakDriveCollega}</TourPulsante>
            <Salta onClick={onSalta} />
          </>
        ) : (
          // Sul web Drive non si collega: "Avanti" vale come salto.
          <TourPulsante onClick={onSalta}>{frasi.tourAvanti}</TourPulsante>
        )}
      </Piede>
      <Dialog open={drive.proposta !== null} title={frasi.bakDriveCollega} onClose={drive.annullaProposta}>
        <p style={{ margin: 0 }}>{frasi.bakUsaAccount.replace('{{email}}', drive.proposta ?? '')}</p>
        <Button onClick={() => { void conferma() }} disabled={drive.busy}>{frasi.bakDriveCollega}</Button>
        <Button variant="secondary" onClick={drive.annullaProposta}>{frasi.bakNonOra}</Button>
      </Dialog>
    </>
  )
}

export function PassoFiscale({ n, m, onFatto, onSalta }: PassoProps) {
  const frasi = useFrasi()
  const { scrivi } = useImpostazioniTour()
  const [iva, setIva] = useState('')
  const [cf, setCf] = useState('')
  const [toccati, setToccati] = useState({ iva: false, cf: false })
  const erroreIva = vatError(iva)
  const erroreCf = taxCodeError(cf)
  // basta uno dei due, purché scritto bene
  const valido = (normalizeVat(iva) !== '' || normalizeTaxCode(cf) !== '') && erroreIva === null && erroreCf === null

  function fatto() {
    if (!valido) return
    const ok = scrivi((current) => conBusiness(current, {
      ...current.business,
      ...(normalizeVat(iva) ? { vatNumber: normalizeVat(iva) } : {}),
      ...(normalizeTaxCode(cf) ? { taxCode: normalizeTaxCode(cf) } : {}),
    }))
    if (ok) onFatto()
  }

  return (
    <>
      <Intestazione n={n} m={m} tono="fiscale" icona={ReceiptEuro} testo={frasi.tourFiscaleTitolo} dettaglio={frasi.tourFiscaleSotto} />
      <div {...cascata(4, { display: 'flex', flexDirection: 'column', gap: 10 })}>
        <Input
          label={frasi.tourFiscaleIva}
          className="tour-campo"
          inputMode="numeric"
          autoComplete="off"
          placeholder={frasi.tourFiscaleIvaAiuto}
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          onBlur={() => setToccati((t) => ({ ...t, iva: true }))}
          error={toccati.iva ? erroreIva ?? undefined : undefined}
        />
        <Input
          label={frasi.tourFiscaleCf}
          className="tour-campo"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={frasi.tourFiscaleCfAiuto}
          value={cf}
          onChange={(e) => setCf(e.target.value)}
          onBlur={() => setToccati((t) => ({ ...t, cf: true }))}
          error={toccati.cf ? erroreCf ?? undefined : undefined}
        />
      </div>
      <Piede i={5}>
        <TourPulsante pronto={valido} disabled={!valido} onClick={fatto}>{frasi.tourFatto}</TourPulsante>
        <Salta onClick={onSalta} />
      </Piede>
    </>
  )
}

const ETICHETTE_PASSO = {
  logo: 'hubPassoLogo',
  sede: 'hubPassoSede',
  listino: 'hubPassoListino',
  backup: 'hubPassoBackup',
  email: 'hubPassoEmail',
  fiscale: 'hubPassoFiscale',
} as const satisfies Record<PassoSalone, string>

export function TourFine({ passi, onEntra }: { passi: readonly { id: PassoSalone; fatto: boolean }[]; onEntra: () => void }) {
  const frasi = useFrasi()
  const fatti = passi.filter((p) => p.fatto).length
  const completo = passi.length > 0 && fatti === passi.length
  return (
    <>
      <div {...cascata(0)}><TourAnello fatti={fatti} tutti={passi.length} /></div>
      <h1 {...cascata(1, { ...titolo, textAlign: 'center' })}>{completo ? frasi.tourFinePronto : frasi.tourFineQuasi}</h1>
      <p {...cascata(2, { ...sotto, textAlign: 'center' })}>{frasi.tourFineSotto.replace('{{card}}', frasi.hubCompleta)}</p>
      <Card style={{ padding: '4px 12px', marginTop: 6 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {passi.map((passo, i) => (
            <li
              key={passo.id}
              className="tour-riga"
              style={{ '--i': i, display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, fontSize: 14, borderTop: i === 0 ? 'none' : '1px solid var(--line)' } as Vars}
            >
              {passo.fatto ? (
                <span className="tour-spunta" style={{ '--i': i, width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--ok)', color: '#fff' } as Vars} aria-hidden>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
              ) : (
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', border: '2px solid var(--line2)' }} />
              )}
              <span>{frasi[ETICHETTE_PASSO[passo.id]]}</span>
              {passo.fatto ? null : <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--pri)' }}>{frasi.tourDaFare}</span>}
            </li>
          ))}
        </ul>
      </Card>
      <Piede i={4}>
        <TourPulsante freccia={false} onClick={onEntra}>{frasi.tourEntra}</TourPulsante>
      </Piede>
    </>
  )
}
