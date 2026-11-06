import { AlertTriangle, Check, ChevronRight, Minus, Plus, Search } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { DatiProdotto, type BozzaProdotto } from '../components/magazzino/DatiProdotto'
import { KitBase } from '../components/magazzino/KitBase'
import { MovimentoSheet, type ModoMovimento } from '../components/magazzino/MovimentoSheet'
import { SceltaProdotto } from '../components/magazzino/SceltaProdotto'
import { Tacche } from '../components/magazzino/Tacche'
import { ETICHETTA_CATEGORIA, chipMagazzino } from '../components/magazzino/categorie'
import { IconButton } from '../components/ui/IconButton'
import { SearchBar } from '../components/ui/SearchBar'
import { useProdotti } from '../hooks/useProdotti'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { CATEGORIE_PRODOTTO, daOrdinare, filtraProdotti, misuraProdotto, muoviProdotto, statoProdotto, type FiltroProdotti, type Prodotto, type StatoProdotto } from '../lib/prodotti'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export const ETICHETTA_STATO = { ok: 'magStatoOk', ordina: 'magStatoOrdina', finito: 'magStatoFinito' } as const satisfies Record<StatoProdotto, string>
export const COLORE_STATO: Record<StatoProdotto, string> = { ok: 'var(--ok)', ordina: 'var(--warn)', finito: 'var(--bad)' }

type Aperto =
  | { tipo: 'scelta' }
  | { tipo: 'dati'; bozza: BozzaProdotto }
  | { tipo: 'movimento'; id: string; modo: ModoMovimento }
  | null

const riga: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 78, padding: '8px 8px 8px 12px', borderRadius: 14, background: 'var(--card)', boxShadow: 'var(--sh-1)' }

const togli: CSSProperties = { width: 48, height: 48, flex: 'none', display: 'grid', placeItems: 'center', border: 0, borderRadius: 14, background: 'var(--pri-s)', color: 'var(--pri)', cursor: 'pointer' }

// Sopra la barra in basso, allineato al bordo della colonna dell'app.
const aggiungi: CSSProperties = {
  position: 'fixed',
  zIndex: 19,
  right: 'max(16px, calc((100% - 640px) / 2 + 16px))',
  bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 18px 0 14px',
  border: 0,
  borderRadius: 16,
  background: 'var(--pri-solid)',
  color: 'var(--on-pri)',
  font: 'inherit',
  fontWeight: 700,
  boxShadow: 'var(--sh-btn)',
  cursor: 'pointer',
}

export function MagazzinoPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { gate } = useSession()
  const toast = useToast()
  const { prodotti, save } = useProdotti(gate.kind === 'in' ? gate.account.uid : '')
  const [testo, setTesto] = useState('')
  const [cerca, setCerca] = useState(false)
  const [filtro, setFiltro] = useState<FiltroProdotti>('tutti')
  const [aperto, setAperto] = useState<Aperto>(null)
  const trovati = filtraProdotti(prodotti, testo, filtro)
  const mancano = daOrdinare(prodotti).length
  const conto = prodotti.length === 1 ? frasi.magProdottoUno : t(lingua, 'magProdottiConto', { n: prodotti.length })
  const movimento = aperto?.tipo === 'movimento' ? prodotti.find((item) => item.id === aperto.id) : undefined

  // Senza aspettare il cloud: offline la scrittura parte quando torna la rete.
  function salva(prodotto: Prodotto) {
    void save(prodotto).catch(() => toast.show(frasi.authSalvataggio, 'plain'))
  }

  function muovi(prodotto: Prodotto, delta: number) {
    const dopo = muoviProdotto(prodotto, delta, new Date())
    if (dopo === prodotto) return
    salva(dopo)
    toast.show(
      `${prodotto.nome}: ${prodotto.pezzi} → ${dopo.pezzi}`,
      'plain',
      { label: frasi.homeAnnulla, onClick: () => salva({ ...prodotto, updatedAt: new Date() }) },
      undefined,
      5000,
    )
  }

  return (
    <ShellFrame showFab={false}>
      <Header
        title={frasi.magTitolo}
        subtitle={prodotti.length > 0 ? conto : undefined}
        backTo="/altro"
        action={prodotti.length > 0 ? <IconButton label={frasi.magCerca} aria-expanded={cerca} onClick={() => { setCerca(!cerca); setTesto('') }}><Search size={18} strokeWidth={2} aria-hidden /></IconButton> : undefined}
      />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {prodotti.length === 0 ? (
          <KitBase onSalva={(nuovi) => nuovi.forEach(salva)} onDaSolo={() => setAperto({ tipo: 'scelta' })} />
        ) : (
          <>
            {cerca ? <SearchBar mode="input" placeholder={frasi.magCerca} value={testo} onChange={setTesto} /> : null}
            {mancano > 0 ? (
              <Link to="/altro/magazzino/ordini" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '8px 12px', borderRadius: 14, background: 'var(--warn-s)', color: 'var(--warn)', textDecoration: 'none' }}>
                <AlertTriangle size={20} strokeWidth={2} aria-hidden />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <strong>{mancano === 1 ? frasi.magDaOrdinareUno : t(lingua, 'magDaOrdinareConto', { n: mancano })}</strong>
                  <small style={{ fontSize: TYPE.meta }}>{frasi.magVediLista}</small>
                </span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden />
              </Link>
            ) : null}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <button type="button" aria-pressed={filtro === 'tutti'} onClick={() => setFiltro('tutti')} style={{ ...chipMagazzino(filtro === 'tutti'), flex: 'none' }}>{frasi.magTutti}</button>
              <button type="button" aria-pressed={filtro === 'daOrdinare'} onClick={() => setFiltro('daOrdinare')} style={{ ...chipMagazzino(filtro === 'daOrdinare'), flex: 'none' }}>{frasi.magStatoOrdina}</button>
              {CATEGORIE_PRODOTTO.map((categoria) => (
                <button key={categoria} type="button" aria-pressed={filtro === categoria} onClick={() => setFiltro(categoria)} style={{ ...chipMagazzino(filtro === categoria), flex: 'none' }}>
                  {categoria === 'cura' ? frasi.magCatCura : frasi[ETICHETTA_CATEGORIA[categoria]]}
                </button>
              ))}
            </div>
            {trovati.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 0', textAlign: 'center', color: 'var(--tx3)' }}>{frasi.magNessunRisultato}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trovati.map((prodotto) => {
                  const stato = statoProdotto(prodotto)
                  const Icona = stato === 'ok' ? Check : AlertTriangle
                  const misura = misuraProdotto(prodotto, lingua)
                  return (
                    <div key={prodotto.id} style={riga}>
                      <Link to={`/altro/magazzino/${prodotto.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, color: 'inherit', textDecoration: 'none' }}>
                        <span style={{ ...USER_TEXT, fontWeight: 650 }}>{prodotto.nome}</span>
                        <small style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 6px', fontSize: TYPE.meta, color: 'var(--tx3)' }}>
                          {misura ? <span>{misura}</span> : null}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: COLORE_STATO[stato], fontWeight: 700 }}><Icona size={12} strokeWidth={2.4} aria-hidden />{frasi[ETICHETTA_STATO[stato]]}</span>
                        </small>
                        <span style={{ marginTop: 4 }}><Tacche pezzi={prodotto.pezzi} soglia={prodotto.soglia} stato={stato} /></span>
                      </Link>
                      <button type="button" aria-label={t(lingua, 'magCambiaPezzi', { nome: prodotto.nome, n: prodotto.pezzi })} onClick={() => setAperto({ tipo: 'movimento', id: prodotto.id, modo: 'usati' })} style={{ minWidth: 44, minHeight: 48, border: 0, borderRadius: 12, background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}>{prodotto.pezzi}</button>
                      <button type="button" aria-label={t(lingua, 'magTogliUno', { nome: prodotto.nome })} disabled={prodotto.pezzi === 0} onClick={() => muovi(prodotto, -1)} style={{ ...togli, opacity: prodotto.pezzi === 0 ? 0.5 : 1 }}>
                        <Minus size={20} strokeWidth={2.2} aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {/* L'ultima riga non deve finire sotto il tasto */}
            <div aria-hidden style={{ height: 64 }} />
          </>
        )}
      </div>
      {prodotti.length > 0 ? (
        <button type="button" onClick={() => setAperto({ tipo: 'scelta' })} style={aggiungi}>
          <Plus size={22} strokeWidth={2.2} aria-hidden />{frasi.magAggiungiBreve}
        </button>
      ) : null}
      {aperto?.tipo === 'scelta' ? (
        <SceltaProdotto
          prodotti={prodotti}
          onClose={() => setAperto(null)}
          onCatalogo={(voce) => setAperto({ tipo: 'dati', bozza: { nome: frasi[voce.frase], categoria: voce.categoria, quantita: voce.quantita, unita: voce.unita, libero: false, diluizione: voce.diluizione, mlPerCane: voce.mlPerCane } })}
          onLibero={(nome) => setAperto({ tipo: 'dati', bozza: { nome, categoria: 'lavaggio', quantita: null, unita: 'l', libero: true } })}
          onEsistente={(prodotto) => setAperto({ tipo: 'movimento', id: prodotto.id, modo: 'arrivati' })}
        />
      ) : null}
      {aperto?.tipo === 'dati' ? (
        <DatiProdotto bozza={aperto.bozza} prodotti={prodotti} onClose={() => setAperto(null)} save={save} onSalvato={() => setAperto(null)} />
      ) : null}
      {movimento && aperto?.tipo === 'movimento' ? (
        <MovimentoSheet prodotto={movimento} modoIniziale={aperto.modo} onClose={() => setAperto(null)} onConferma={(delta) => { setAperto(null); muovi(movimento, delta) }} />
      ) : null}
    </ShellFrame>
  )
}
