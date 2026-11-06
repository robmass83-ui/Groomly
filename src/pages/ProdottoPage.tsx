import { AlertTriangle, ArrowDown, ArrowUp, Check, Minus, PackageOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { ConfrontoTanica } from '../components/magazzino/ConfrontoTanica'
import { DatiProdotto } from '../components/magazzino/DatiProdotto'
import { MovimentoSheet, type ModoMovimento } from '../components/magazzino/MovimentoSheet'
import { Tacche } from '../components/magazzino/Tacche'
import { conIcona } from '../components/magazzino/categorie'
import { SegnoPlus } from '../components/piano/SegnoPlus'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { useProdotti } from '../hooks/useProdotti'
import { useSession } from '../hooks/useSession'
import { useStimeMagazzino } from '../hooks/useStimeMagazzino'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { euro } from '../i18n/format'
import { t } from '../i18n/t'
import { daButtare, dosaggio, misura, misuraProdotto, muoviProdotto, scadenzaProdotto, statoProdotto, totaleProdotto, type Prodotto } from '../lib/prodotti'
import { chiudiConfronto, correggiConsumo, costoLavaggio, fraseDurata, type Confronto } from '../lib/stimeMagazzino'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { COLORE_STATO, ETICHETTA_STATO } from './MagazzinoPage'
import { ShellFrame } from './ShellFrame'

const ELENCO = '/altro/magazzino'

export function ProdottoPage() {
  const { id } = useParams()
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { gate } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const { prodotti, save, remove } = useProdotti(gate.kind === 'in' ? gate.account.uid : '')
  const [movimento, setMovimento] = useState<ModoMovimento | null>(null)
  const [modifica, setModifica] = useState(false)
  const [conferma, setConferma] = useState(false)
  const [domanda, setDomanda] = useState<Confronto | null>(null)
  const stime = useStimeMagazzino(gate.kind === 'in' ? gate.account.uid : '', prodotti)
  const prodotto = prodotti.find((item) => item.id === id)
  if (!prodotto) return <Navigate to={ELENCO} replace />
  const elimina = !(gate.kind === 'in' && gate.account.role === 'collaboratore')
  const stato = statoProdotto(prodotto)
  const Icona = stato === 'ok' ? Check : AlertTriangle
  const totale = totaleProdotto(prodotto, lingua)
  const data = new Intl.DateTimeFormat(lingua, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const giorno = new Intl.DateTimeFormat(lingua, { day: 'numeric', month: 'short' })
  const mese = new Intl.DateTimeFormat(lingua, { month: 'short', year: 'numeric' })
  const scadenza = scadenzaProdotto(prodotto)
  const stima = stime.stima(prodotto)
  const durata = stima && prodotto.pezzi > 0 ? fraseDurata(stima.giorni) : null
  const lavaggio = stime.accesso ? costoLavaggio(prodotto) : null
  const conStima = prodotto.uso === 'salone' && prodotto.mlPerCane !== null && prodotto.quantita !== null
  const consumoMese = stima ? (stima.consumoMese >= 1000 ? misura(Math.round(stima.consumoMese / 100) / 10, 'l', lingua) : misura(Math.round(stima.consumoMese), 'ml', lingua)) : ''
  const dettagli = [
    prodotto.diluizione === null ? null : `${t(lingua, 'magDiluizione', { n: prodotto.diluizione })} · ${t(lingua, 'magDosaggio', dosaggio(prodotto.diluizione))}`,
    prodotto.costo === null ? null : t(lingua, 'magCostoPezzo', { importo: euro(lingua, prodotto.costo) }),
    prodotto.uso === 'vendita' && prodotto.prezzoVendita !== null ? t(lingua, 'magPrezzoVendita', { importo: euro(lingua, prodotto.prezzoVendita) }) : null,
  ].filter((riga) => riga !== null)

  // Senza aspettare il cloud: offline la scrittura parte quando torna la rete.
  function nonRiuscito() {
    toast.show(frasi.authSalvataggio, 'plain')
  }

  function salvaProdotto(aggiornato: Prodotto) {
    void save(aggiornato).catch(nonRiuscito)
  }

  function rispondi(aggiorna: boolean) {
    if (prodotto && domanda) salvaProdotto(aggiorna ? correggiConsumo(prodotto, domanda, new Date()) : chiudiConfronto(prodotto, new Date()))
    setDomanda(null)
  }

  function onElimina() {
    if (!prodotto) return
    void remove(prodotto.id).catch(nonRiuscito)
    navigate(ELENCO, { replace: true })
  }

  return (
    <ShellFrame showFab={false}>
      <Header
        title={prodotto.nome}
        subtitle={[misuraProdotto(prodotto, lingua), prodotto.ditta, prodotto.codice].filter(Boolean).join(' · ') || undefined}
        backTo={ELENCO}
        action={<IconButton label={frasi.magModifica} onClick={() => setModifica(true)}><Pencil size={18} strokeWidth={2} aria-hidden /></IconButton>}
      />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 40, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{prodotto.pezzi}</strong>
                <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{totale ? t(lingua, 'magPezziTotale', { totale }) : frasi.magPezzi}</small>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: COLORE_STATO[stato], fontWeight: 700, fontSize: 13 }}><Icona size={14} strokeWidth={2.4} aria-hidden />{frasi[ETICHETTA_STATO[stato]]}</span>
            </div>
            <Tacche grandi pezzi={prodotto.pezzi} soglia={prodotto.soglia} stato={stato} />
            <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{prodotto.soglia > 0 ? t(lingua, 'magAvvisoA', { n: prodotto.soglia }) : frasi.magSenzaAvviso}</small>
            {prodotto.inArrivo > 0 ? <small style={{ color: 'var(--pri-ink)', fontWeight: 700 }}>{t(lingua, 'magInArrivoConto', { n: prodotto.inArrivo })}</small> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <Button type="button" style={conIcona} variant="secondary" disabled={prodotto.pezzi === 0} onClick={() => setMovimento('usati')}><Minus size={16} strokeWidth={2.2} aria-hidden />{frasi.magUsati}</Button>
              <Button type="button" style={conIcona} onClick={() => setMovimento('arrivati')}><Plus size={16} strokeWidth={2.2} aria-hidden />{frasi.magArrivati}</Button>
            </div>
          </div>
        </Card>
        {dettagli.length > 0 || prodotto.apertoIl !== null || prodotto.pezzi > 0 ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, fontSize: 13 }}>
              {dettagli.map((riga) => <span key={riga}>{riga}</span>)}
              {prodotto.apertoIl !== null ? (
                <span style={{ color: daButtare(prodotto, new Date()) ? 'var(--bad)' : undefined, fontWeight: daButtare(prodotto, new Date()) ? 700 : undefined }}>
                  {[t(lingua, 'magApertoIl', { data: giorno.format(new Date(prodotto.apertoIl)) }), scadenza ? t(lingua, 'magDaUsareEntro', { data: mese.format(scadenza) }) : ''].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              {prodotto.pezzi > 0 ? <Button type="button" variant="secondary" style={{ ...conIcona, width: '100%' }} onClick={() => { const adesso = new Date(); salvaProdotto({ ...prodotto, apertoIl: adesso.getTime(), updatedAt: adesso }) }}><PackageOpen size={16} strokeWidth={2} aria-hidden />{frasi.magHoAperto}</Button> : null}
            </div>
          </Card>
        ) : null}
        {conStima && !stime.accesso ? (
          <button type="button" onClick={stime.apri} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 12, border: '1px solid var(--line)', borderRadius: 14, background: 'var(--card)', color: 'var(--tx)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontWeight: 650 }}>{frasi.magQuantoDura}<SegnoPlus feature="stimeMagazzino" /></span>
            <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.magQuantoDuraAnteprima}</small>
          </button>
        ) : null}
        {stime.accesso && (durata || lavaggio !== null) ? (
          <Card aria-label={frasi.magQuantoDura}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 12 }}>
              <strong style={{ fontSize: 13 }}>{frasi.magQuantoDura}</strong>
              {durata ? <span style={{ fontWeight: 650 }}>{t(lingua, durata.chiave, { n: durata.n })}</span> : null}
              {consumoMese ? <small style={{ color: 'var(--tx2)' }}>{t(lingua, 'magConsumoMese', { quantita: consumoMese })}</small> : null}
              {lavaggio !== null ? <small style={{ color: 'var(--tx2)' }}>{t(lingua, 'magCostoLavaggio', { importo: euro(lingua, lavaggio) })}</small> : null}
              <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.magStimaNota}</small>
            </div>
          </Card>
        ) : null}
        {prodotto.movimenti.length > 0 ? (
          <>
            <h2 style={{ margin: '4px 2px 0', fontSize: TYPE.section, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase', color: 'var(--tx2)' }}>{frasi.magStorico}</h2>
            <Card>
              {prodotto.movimenti.map((item, indice) => {
                const entrata = item.delta > 0
                const Freccia = entrata ? ArrowUp : ArrowDown
                return (
                  <div key={`${item.at}-${indice}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 54, padding: '6px 12px', borderTop: indice === 0 ? undefined : '1px solid var(--line)' }}>
                    <span style={{ width: 32, height: 32, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 10, background: entrata ? 'var(--ok-s)' : 'var(--pri-s)', color: entrata ? 'var(--ok)' : 'var(--pri)' }}><Freccia size={16} strokeWidth={2} aria-hidden /></span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 650 }}>{t(lingua, entrata ? 'magMovArrivati' : 'magMovUsati', { n: Math.abs(item.delta) })}</span>
                      <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{data.format(new Date(item.at))}</small>
                    </span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{item.dopo - item.delta} → {item.dopo}</strong>
                  </div>
                )
              })}
            </Card>
          </>
        ) : null}
        {elimina ? <Button type="button" variant="ghost" onClick={() => setConferma(true)} style={{ ...conIcona, width: '100%', color: 'var(--bad)' }}><Trash2 size={16} strokeWidth={2} aria-hidden />{frasi.magElimina}</Button> : null}
      </div>
      {movimento ? (
        <MovimentoSheet
          prodotto={prodotto}
          modoIniziale={movimento}
          onClose={() => setMovimento(null)}
          onConferma={(delta) => {
            setMovimento(null)
            const dopo = muoviProdotto(prodotto, delta, new Date())
            salvaProdotto(dopo)
            if (delta < 0) setDomanda(stime.confronto(dopo))
          }}
        />
      ) : null}
      {domanda ? <ConfrontoTanica confronto={domanda} onRisposta={rispondi} /> : null}
      {modifica ? (
        <DatiProdotto
          bozza={{ nome: prodotto.nome, categoria: prodotto.categoria, quantita: prodotto.quantita, unita: prodotto.unita, libero: true }}
          esistente={prodotto}
          prodotti={prodotti}
          onClose={() => setModifica(false)}
          save={save}
          onSalvato={() => setModifica(false)}
        />
      ) : null}
      {conferma ? (
        <Dialog open title={t(lingua, 'magEliminaDomanda', { nome: prodotto.nome })} onClose={() => setConferma(false)}>
          <p style={{ margin: 0, color: 'var(--tx2)' }}>{frasi.magEliminaDettaglio}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setConferma(false)}>{frasi.homeAnnulla}</Button>
            <Button type="button" variant="bad" onClick={onElimina}>{frasi.magEliminaConferma}</Button>
          </div>
        </Dialog>
      ) : null}
    </ShellFrame>
  )
}
