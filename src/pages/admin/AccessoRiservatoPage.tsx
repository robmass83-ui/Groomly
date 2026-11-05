import { Button } from '../../components/ui/Button'
import { useEsci } from '../../hooks/useEsci'
import { useFrasi } from '../../i18n/LinguaContext'
import { USER_TEXT } from '../../theme/text'

/** Sul sito admin chi non ha il claim non ha nessuna Home a cui tornare. */
export function AccessoRiservatoPage() {
  const frasi = useFrasi()
  const { esci, foglio, occupato } = useEsci()
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg)', color: 'var(--tx)' }}>
      <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>{frasi.consRiservato}</h1>
        <p style={{ margin: 0, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.consRiservatoTesto}</p>
        <Button disabled={occupato} onClick={esci}>{frasi.impEsci}</Button>
      </div>
      {foglio}
    </main>
  )
}
