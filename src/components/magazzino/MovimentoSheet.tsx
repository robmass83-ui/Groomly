import { useState, type CSSProperties } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { misuraProdotto, type Prodotto } from '../../lib/prodotti'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { Segmented } from '../ui/Segmented'
import { Contatore } from './Contatore'

export type ModoMovimento = 'usati' | 'arrivati'

const RAPIDI = [1, 2, 3, 5]

function rapido(attivo: boolean): CSSProperties {
  return {
    minHeight: 44,
    border: 0,
    borderRadius: 12,
    background: attivo ? 'var(--pri-s)' : 'var(--surf)',
    boxShadow: attivo ? 'inset 0 0 0 2px var(--pri-solid)' : undefined,
    color: attivo ? 'var(--pri-ink)' : 'var(--tx)',
    font: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
  }
}

export function MovimentoSheet({ prodotto, modoIniziale, onClose, onConferma }: { prodotto: Prodotto; modoIniziale: ModoMovimento; onClose: () => void; onConferma: (delta: number) => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [modo, setModo] = useState<ModoMovimento>(prodotto.pezzi === 0 ? 'arrivati' : modoIniziale)
  const [numero, setNumero] = useState(1)
  const usati = modo === 'usati'
  const massimo = usati ? prodotto.pezzi : 9999
  const quanti = Math.min(numero, massimo)
  const dopo = prodotto.pezzi + (usati ? -quanti : quanti)
  const misura = misuraProdotto(prodotto, lingua)
  return (
    <Sheet
      open
      closeButton
      title={prodotto.nome}
      onClose={onClose}
      footer={<Button type="button" size="lg" disabled={quanti === 0} onClick={() => onConferma(usati ? -quanti : quanti)} style={{ width: '100%' }}>{t(lingua, usati ? 'magScala' : 'magCarica', { n: quanti })}</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <small style={{ color: 'var(--tx3)' }}>{[misura, t(lingua, 'magNeHai', { n: prodotto.pezzi })].filter(Boolean).join(' · ')}</small>
        <Segmented fill label={frasi.magMovimento} value={modo} onChange={setModo} options={[{ value: 'usati', label: frasi.magUsati }, { value: 'arrivati', label: frasi.magArrivati }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {RAPIDI.map((valore) => (
            <button key={valore} type="button" aria-pressed={quanti === valore} disabled={valore > massimo} onClick={() => setNumero(valore)} style={{ ...rapido(quanti === valore), opacity: valore > massimo ? 0.5 : 1 }}>{valore}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Contatore etichetta={frasi.magPezzi} valore={quanti} onChange={setNumero} min={1} max={massimo} />
        </div>
        <p style={{ margin: 0, padding: 10, borderRadius: 12, background: 'var(--surf)', textAlign: 'center', fontWeight: 700 }}>{t(lingua, 'magDaA', { da: prodotto.pezzi, a: dopo })}</p>
      </div>
    </Sheet>
  )
}
