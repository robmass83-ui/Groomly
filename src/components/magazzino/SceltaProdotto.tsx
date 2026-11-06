import { ChevronRight, Pencil, RotateCcw } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { CATALOGO_PRODOTTI, type VoceProdotto } from '../../lib/catalogoProdotti'
import { normalizeSearch } from '../../lib/normalizza'
import { CATEGORIE_PRODOTTO, type CategoriaProdotto, type Prodotto } from '../../lib/prodotti'
import { USER_TEXT } from '../../theme/text'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { SearchBar } from '../ui/SearchBar'
import { ETICHETTA_CATEGORIA, chipMagazzino, conIcona } from './categorie'

const RICOMPRA = 3

const voceRiga: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '6px 2px', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }

export function SceltaProdotto({ prodotti, onClose, onCatalogo, onLibero, onEsistente }: {
  prodotti: Prodotto[]
  onClose: () => void
  onCatalogo: (voce: VoceProdotto) => void
  onLibero: (nome: string) => void
  onEsistente: (prodotto: Prodotto) => void
}) {
  const frasi = useFrasi()
  const [testo, setTesto] = useState('')
  const [categoria, setCategoria] = useState<CategoriaProdotto>('shampoo')
  const cercato = normalizeSearch(testo)
  const voci = CATALOGO_PRODOTTI.filter((voce) => (cercato ? normalizeSearch(frasi[voce.frase]).includes(cercato) : voce.categoria === categoria))
  const ricompra = [...prodotti].sort((a, b) => a.pezzi - b.pezzi).slice(0, RICOMPRA)

  function scegli(voce: VoceProdotto) {
    const nome = normalizeSearch(frasi[voce.frase])
    const esistente = prodotti.find((prodotto) => normalizeSearch(prodotto.nome) === nome)
    if (esistente) onEsistente(esistente)
    else onCatalogo(voce)
  }

  return (
    <Sheet
      open
      closeButton
      title={frasi.magAggiungi}
      onClose={onClose}
      footer={<Button type="button" variant="ghost" onClick={() => onLibero(testo.trim())} style={{ ...conIcona, width: '100%' }}><Pencil size={16} strokeWidth={2} aria-hidden />{frasi.magScriviTu}</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SearchBar mode="input" placeholder={frasi.magCercaLista} value={testo} onChange={setTesto} />
        {cercato ? null : (
          <>
            {ricompra.length > 0 ? (
              <section aria-label={frasi.magRicompra} style={{ display: 'flex', flexDirection: 'column' }}>
                <small style={{ fontWeight: 700, color: 'var(--tx2)' }}>{frasi.magRicompra}</small>
                {ricompra.map((prodotto) => (
                  <button key={prodotto.id} type="button" onClick={() => onEsistente(prodotto)} style={voceRiga}>
                    <RotateCcw size={16} strokeWidth={2} color="var(--pri)" aria-hidden />
                    <span style={{ ...USER_TEXT, flex: 1, minWidth: 0 }}>{prodotto.nome}</span>
                  </button>
                ))}
              </section>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIE_PRODOTTO.map((item) => (
                <button key={item} type="button" aria-pressed={categoria === item} onClick={() => setCategoria(item)} style={chipMagazzino(categoria === item)}>{frasi[ETICHETTA_CATEGORIA[item]]}</button>
              ))}
            </div>
          </>
        )}
        {voci.length === 0 ? <p style={{ margin: 0, padding: '12px 0', textAlign: 'center', color: 'var(--tx3)' }}>{frasi.magNessunRisultato}</p> : null}
        <div>
          {voci.map((voce, indice) => (
            <button key={voce.frase} type="button" onClick={() => scegli(voce)} style={{ ...voceRiga, borderTop: indice === 0 ? undefined : '1px solid var(--line)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>{frasi[voce.frase]}</span>
              <ChevronRight size={16} strokeWidth={2} color="var(--tx3)" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
