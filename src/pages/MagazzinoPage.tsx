import { Droplet, Droplets, Package, Plus, SprayCan, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { SearchBar } from '../components/ui/SearchBar'
import { useProdotti } from '../hooks/useProdotti'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { CATEGORIE_PRODOTTO, filtraProdotti, misuraProdotto, type CategoriaProdotto, type FiltroProdotti } from '../lib/prodotti'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export const ETICHETTA_CATEGORIA = {
  shampoo: 'magCatShampoo',
  balsami: 'magCatBalsami',
  profumi: 'magCatProfumi',
  altro: 'magCatAltro',
} as const satisfies Record<CategoriaProdotto, string>

const ICONA_CATEGORIA: Record<CategoriaProdotto, LucideIcon> = {
  shampoo: Droplet,
  balsami: Droplets,
  profumi: SprayCan,
  altro: Package,
}

const riga: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minHeight: 66,
  padding: '10px 12px',
  color: 'inherit',
  textDecoration: 'none',
}

// Sopra la barra in basso, allineato al bordo della colonna dell'app.
const aggiungi: CSSProperties = {
  position: 'fixed',
  zIndex: 19,
  right: 'max(16px, calc((100% - 640px) / 2 + 16px))',
  bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
  width: 56,
  height: 56,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--pri-solid)',
  color: 'var(--on-pri)',
  boxShadow: 'var(--sh-btn)',
}

function chip(attivo: boolean): CSSProperties {
  return {
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 18,
    border: `1px solid ${attivo ? 'var(--pri-solid)' : 'var(--line)'}`,
    background: attivo ? 'var(--pri-solid)' : 'var(--card)',
    color: attivo ? 'var(--on-pri)' : 'var(--tx)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

export function MagazzinoPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { gate } = useSession()
  const { prodotti } = useProdotti(gate.kind === 'in' ? gate.account.uid : '')
  const [testo, setTesto] = useState('')
  const [filtro, setFiltro] = useState<FiltroProdotti>('tutti')
  const trovati = filtraProdotti(prodotti, testo, filtro)
  const conto = prodotti.length === 1 ? frasi.magProdottoUno : t(lingua, 'magProdottiConto', { n: prodotti.length })
  return (
    <ShellFrame showFab={false}>
      <Header title={frasi.magTitolo} subtitle={prodotti.length > 0 ? conto : undefined} backTo="/altro" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {prodotti.length === 0 ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', textAlign: 'center' }}>
              <IconTile tone="prim"><Package size={20} strokeWidth={2} aria-hidden /></IconTile>
              <strong>{frasi.magVuoto}</strong>
              <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.magVuotoDettaglio}</small>
              <Link to="/altro/magazzino/nuovo" style={{ marginTop: 4, padding: '10px 16px', borderRadius: 12, background: 'var(--pri-solid)', color: 'var(--on-pri)', fontWeight: 700, textDecoration: 'none' }}>{frasi.magPrimo}</Link>
            </div>
          </Card>
        ) : (
          <>
            <SearchBar mode="input" placeholder={frasi.magCerca} value={testo} onChange={setTesto} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" aria-pressed={filtro === 'tutti'} onClick={() => setFiltro('tutti')} style={chip(filtro === 'tutti')}>{frasi.magTutti}</button>
              {CATEGORIE_PRODOTTO.map((categoria) => (
                <button key={categoria} type="button" aria-pressed={filtro === categoria} onClick={() => setFiltro(categoria)} style={chip(filtro === categoria)}>
                  {frasi[ETICHETTA_CATEGORIA[categoria]]}
                </button>
              ))}
            </div>
            {trovati.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 0', textAlign: 'center', color: 'var(--tx3)' }}>{frasi.magNessunRisultato}</p>
            ) : (
              <Card>
                {trovati.map((prodotto, index) => {
                  const Icona = ICONA_CATEGORIA[prodotto.categoria]
                  const dettaglio = [prodotto.ditta, prodotto.codice].filter(Boolean).join(' · ')
                  const misura = misuraProdotto(prodotto, lingua)
                  return (
                    <Link key={prodotto.id} to={`/altro/magazzino/${prodotto.id}`} style={{ ...riga, borderTop: index === 0 ? undefined : '1px solid var(--line)' }}>
                      <IconTile tone="prim"><Icona size={20} strokeWidth={2} aria-hidden /></IconTile>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ ...USER_TEXT, fontWeight: 650 }}>{prodotto.nome}</span>
                        {dettaglio ? <small style={{ ...USER_TEXT, color: 'var(--tx3)', fontSize: TYPE.meta }}>{dettaglio}</small> : null}
                      </span>
                      {misura ? <span style={{ flex: 'none', padding: '4px 9px', borderRadius: 9, background: 'var(--surf)', fontWeight: 700, fontSize: 13 }}>{misura}</span> : null}
                    </Link>
                  )
                })}
              </Card>
            )}
            {/* L'ultima riga non deve finire sotto il + */}
            <div aria-hidden style={{ height: 56 }} />
          </>
        )}
      </div>
      {prodotti.length > 0 ? (
        <Link to="/altro/magazzino/nuovo" aria-label={frasi.magAggiungi} style={aggiungi}>
          <Plus size={26} strokeWidth={2.2} aria-hidden />
        </Link>
      ) : null}
    </ShellFrame>
  )
}
