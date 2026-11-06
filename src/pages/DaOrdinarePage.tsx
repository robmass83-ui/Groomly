import { Check, Copy, Mail, MessageCircle, Send, Truck } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Header } from '../components/layout/Header'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Contatore } from '../components/magazzino/Contatore'
import { conIcona } from '../components/magazzino/categorie'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useProdotti } from '../hooks/useProdotti'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { normalizeSearch } from '../lib/normalizza'
import { apriEsterno } from '../lib/openDocument'
import { arrivatoProdotto, daOrdinare, fornitori, misuraProdotto, quantitaProposta, type Prodotto } from '../lib/prodotti'
import { normalizzaTelefono, urlWhatsApp } from '../lib/whatsapp'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

interface Gruppo {
  nome: string
  telefono: string
  email: string
  righe: Prodotto[]
}

const sezione: CSSProperties = { margin: '4px 2px 0', fontSize: TYPE.section, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase', color: 'var(--tx2)' }

function gruppi(prodotti: Prodotto[], tutti: Prodotto[], senzaNome: string): Gruppo[] {
  const noti = fornitori(tutti)
  const mappa = new Map<string, Gruppo>()
  for (const prodotto of prodotti) {
    const chiave = normalizeSearch(prodotto.ditta)
    const noto = noti.find((item) => normalizeSearch(item.nome) === chiave)
    const gruppo = mappa.get(chiave) ?? { nome: noto?.nome ?? senzaNome, telefono: noto?.telefono ?? '', email: noto?.email ?? '', righe: [] }
    gruppo.righe.push(prodotto)
    mappa.set(chiave, gruppo)
  }
  return [...mappa.values()]
}

export function DaOrdinarePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { gate } = useSession()
  const { settings } = useSettings()
  const toast = useToast()
  const { prodotti, save } = useProdotti(gate.kind === 'in' ? gate.account.uid : '')
  const [tolti, setTolti] = useState<ReadonlySet<string>>(new Set())
  const [numeri, setNumeri] = useState<Record<string, number>>({})
  const [invio, setInvio] = useState<{ coda: Gruppo[]; testo: string } | null>(null)
  const elenco = gruppi(daOrdinare(prodotti), prodotti, frasi.magSenzaFornitore)
  const inArrivo = prodotti.filter((item) => item.inArrivo > 0)
  const quanti = (prodotto: Prodotto) => numeri[prodotto.id] ?? quantitaProposta(prodotto)
  const scelti = elenco.map((gruppo) => ({ ...gruppo, righe: gruppo.righe.filter((item) => !tolti.has(item.id)) })).filter((gruppo) => gruppo.righe.length > 0)

  function nonRiuscito() {
    toast.show(frasi.authSalvataggio, 'plain')
  }

  function testoOrdine(gruppo: Gruppo): string {
    const righe = gruppo.righe.map((item) => {
      const dettaglio = [misuraProdotto(item, lingua), item.codice ? `(${item.codice})` : ''].filter(Boolean).join(' ')
      return `${quanti(item)} × ${item.nome}${dettaglio ? ` ${dettaglio}` : ''}`
    })
    return [frasi.magOrdineInizio, ...righe, t(lingua, 'magOrdineFine', { salone: settings.business.salonName }).replace(/,\s*$/, '')].join('\n')
  }

  function apri(coda: Gruppo[]) {
    setInvio(coda.length > 0 ? { coda, testo: testoOrdine(coda[0]) } : null)
  }

  // Dopo l'invio i prodotti passano in «In arrivo» e il fornitore dopo si apre da solo.
  function inviato() {
    if (!invio) return
    const [gruppo, ...resto] = invio.coda
    const adesso = new Date()
    for (const item of gruppo.righe) void save({ ...item, inArrivo: quanti(item), ordinatoIl: adesso.getTime(), updatedAt: adesso }).catch(nonRiuscito)
    apri(resto)
  }

  function whatsapp() {
    if (!invio) return
    const numero = normalizzaTelefono(invio.coda[0].telefono) ?? invio.coda[0].telefono.replace(/\D/g, '')
    void apriEsterno(urlWhatsApp(numero, invio.testo))
    inviato()
  }

  function email() {
    if (!invio) return
    window.location.href = `mailto:${invio.coda[0].email}?subject=${encodeURIComponent(frasi.magOrdineOggetto)}&body=${encodeURIComponent(invio.testo)}`
    inviato()
  }

  function copia() {
    if (!invio) return
    void navigator.clipboard.writeText(invio.testo).then(() => {
      toast.show(frasi.magTestoCopiato, 'ok')
      inviato()
    }).catch(nonRiuscito)
  }

  return (
    <ShellFrame showFab={false}>
      <Header title={frasi.magStatoOrdina} backTo="/altro/magazzino" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {elenco.length === 0 && inArrivo.length === 0 ? (
          <p style={{ margin: 0, padding: '28px 0', textAlign: 'center', color: 'var(--tx3)' }}>{frasi.magTuttoAPosto}</p>
        ) : null}
        {elenco.map((gruppo) => (
          <Card key={gruppo.nome}>
            <div style={{ padding: '4px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontWeight: 750 }}><Truck size={18} strokeWidth={2} aria-hidden /><span style={USER_TEXT}>{gruppo.nome}</span></div>
              {gruppo.righe.map((item) => {
                const attivo = !tolti.has(item.id)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 58, borderTop: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={attivo}
                      aria-label={item.nome}
                      onClick={() => {
                        const next = new Set(tolti)
                        if (!next.delete(item.id)) next.add(item.id)
                        setTolti(next)
                      }}
                      style={{ width: 44, height: 44, flex: 'none', display: 'grid', placeItems: 'center', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                    >
                      <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 8, background: attivo ? 'var(--pri-solid)' : 'transparent', boxShadow: attivo ? undefined : 'inset 0 0 0 2px var(--line2)', color: 'var(--on-pri)' }}>
                        {attivo ? <Check size={16} strokeWidth={2.4} aria-hidden /> : null}
                      </span>
                    </button>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ ...USER_TEXT, fontWeight: 650 }}>{item.nome}</span>
                      <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{[misuraProdotto(item, lingua), item.pezzi === 0 ? frasi.magStatoFinito : t(lingua, 'magNeHai', { n: item.pezzi })].filter(Boolean).join(' · ')}</small>
                    </span>
                    <Contatore etichetta={item.nome} valore={quanti(item)} onChange={(valore) => setNumeri({ ...numeri, [item.id]: valore })} min={1} />
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
        {scelti.length > 0 ? (
          <Button type="button" size="lg" onClick={() => apri(scelti)} style={{ ...conIcona, width: '100%' }}>
            <Send size={16} strokeWidth={2} aria-hidden />{scelti.length === 1 ? frasi.magPreparaUno : t(lingua, 'magPreparaConto', { n: scelti.length })}
          </Button>
        ) : null}
        {inArrivo.length > 0 ? (
          <>
            <h2 style={sezione}>{frasi.magInArrivo}</h2>
            <Card>
              {inArrivo.map((item, indice) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 58, padding: '6px 12px', borderTop: indice === 0 ? undefined : '1px solid var(--line)' }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...USER_TEXT, fontWeight: 650 }}>{item.inArrivo} × {item.nome}</span>
                    {item.ditta ? <small style={{ ...USER_TEXT, color: 'var(--tx3)', fontSize: TYPE.meta }}>{item.ditta}</small> : null}
                  </span>
                  <Button type="button" variant="secondary" onClick={() => { void save(arrivatoProdotto(item, new Date())).catch(nonRiuscito) }}>{frasi.magArrivato}</Button>
                </div>
              ))}
            </Card>
          </>
        ) : null}
      </div>
      {invio ? (
        <Sheet
          open
          closeButton
          title={t(lingua, 'magOrdineA', { nome: invio.coda[0].nome })}
          onClose={() => setInvio(null)}
          footer={(
            <>
              <Button type="button" size="lg" onClick={whatsapp} style={{ ...conIcona, width: '100%' }}><MessageCircle size={16} strokeWidth={2} aria-hidden />{frasi.magInviaWhatsapp}</Button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <Button type="button" style={conIcona} variant="ghost" disabled={!invio.coda[0].email} onClick={email}><Mail size={16} strokeWidth={2} aria-hidden />{frasi.magInviaEmail}</Button>
                <Button type="button" style={conIcona} variant="ghost" onClick={copia}><Copy size={16} strokeWidth={2} aria-hidden />{frasi.magCopia}</Button>
              </div>
            </>
          )}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <small style={{ fontWeight: 600, color: 'var(--tx2)' }}>{frasi.magTestoOrdine}</small>
            <textarea value={invio.testo} onChange={(event) => setInvio({ ...invio, testo: event.target.value })} rows={7} style={{ width: '100%', padding: 10, border: '1px solid var(--line2)', borderRadius: 10, background: 'var(--surf)', color: 'var(--tx)', font: 'inherit', fontSize: 13, resize: 'vertical' }} />
          </label>
        </Sheet>
      ) : null}
    </ShellFrame>
  )
}
