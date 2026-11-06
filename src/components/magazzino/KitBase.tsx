import { Check } from 'lucide-react'
import { useState } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { CATALOGO_PRODOTTI, KIT_BASE } from '../../lib/catalogoProdotti'
import { muoviProdotto, type Prodotto } from '../../lib/prodotti'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Contatore } from './Contatore'

const VOCI = CATALOGO_PRODOTTI.filter((voce) => KIT_BASE.includes(voce.frase))
const SOGLIA_KIT = 2

export function KitBase({ onSalva, onDaSolo }: { onSalva: (prodotti: Prodotto[]) => void; onDaSolo: () => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [scelti, setScelti] = useState<ReadonlySet<string>>(new Set(KIT_BASE))
  const [quantita, setQuantita] = useState(false)
  const [pezzi, setPezzi] = useState<Record<string, number>>({})
  const voci = VOCI.filter((voce) => scelti.has(voce.frase))

  function cambia(frase: string) {
    const next = new Set(scelti)
    if (!next.delete(frase)) next.add(frase)
    setScelti(next)
  }

  function salva() {
    const adesso = new Date()
    onSalva(voci.map((voce) => muoviProdotto({
      id: crypto.randomUUID(),
      nome: frasi[voce.frase],
      categoria: voce.categoria,
      pezzi: 0,
      quantita: voce.quantita,
      unita: voce.unita,
      ditta: '',
      telefono: '',
      email: '',
      codice: '',
      soglia: SOGLIA_KIT,
      inArrivo: 0,
      ordinatoIl: null,
      movimenti: [],
      createdAt: adesso,
      updatedAt: adesso,
    }, pezzi[voce.frase] ?? 1, adesso)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '6px 4px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 750 }}>{quantita ? frasi.magKitQuanti : frasi.magKitTitolo}</h2>
        <small style={{ color: 'var(--tx3)' }}>{quantita ? frasi.magKitQuantiDettaglio : frasi.magKitDettaglio}</small>
      </div>
      <Card>
        {(quantita ? voci : VOCI).map((voce, indice) => {
          const bordo = indice === 0 ? undefined : '1px solid var(--line)'
          if (quantita) {
            return (
              <div key={voce.frase} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 12px', borderTop: bordo }}>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{frasi[voce.frase]}</span>
                <Contatore etichetta={frasi[voce.frase]} valore={pezzi[voce.frase] ?? 1} onChange={(valore) => setPezzi({ ...pezzi, [voce.frase]: valore })} />
              </div>
            )
          }
          const attivo = scelti.has(voce.frase)
          return (
            <button key={voce.frase} type="button" role="checkbox" aria-checked={attivo} onClick={() => cambia(voce.frase)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '6px 12px', border: 0, borderTop: bordo, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 26, height: 26, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 8, background: attivo ? 'var(--pri-solid)' : 'transparent', boxShadow: attivo ? undefined : 'inset 0 0 0 2px var(--line2)', color: 'var(--on-pri)' }}>
                {attivo ? <Check size={16} strokeWidth={2.4} aria-hidden /> : null}
              </span>
              {frasi[voce.frase]}
            </button>
          )
        })}
      </Card>
      {quantita ? (
        <Button type="button" size="lg" onClick={salva} style={{ width: '100%' }}>{frasi.magKitSalva}</Button>
      ) : (
        <Button type="button" size="lg" disabled={voci.length === 0} onClick={() => setQuantita(true)} style={{ width: '100%' }}>{t(lingua, 'magKitContinua', { n: voci.length })}</Button>
      )}
      <Button type="button" variant="ghost" onClick={quantita ? () => setQuantita(false) : onDaSolo} style={{ width: '100%' }}>{quantita ? frasi.homeIndietro : frasi.magKitDaSolo}</Button>
    </div>
  )
}
