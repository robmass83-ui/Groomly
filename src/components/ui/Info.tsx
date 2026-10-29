import { Info as InfoIcon } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { Button } from './Button'

export function Info({
  nome,
  titolo,
  testo,
  etichetta,
}: {
  nome: string
  titolo: string
  testo: string
  etichetta?: string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [aperto, setAperto] = useState(false)
  const [premuto, setPremuto] = useState(false)
  const ridotto = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <>
      <button
        type="button"
        aria-label={etichetta ?? t(lingua, 'notInfo', { nome })}
        onClick={() => setAperto(true)}
        onPointerDown={() => setPremuto(true)}
        onPointerUp={() => setPremuto(false)}
        onPointerLeave={() => setPremuto(false)}
        style={{
          width: 36,
          height: 44,
          border: 0,
          borderRadius: 8,
          background: premuto ? 'var(--pri-s)' : 'transparent',
          color: 'var(--tx3)',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          flex: 'none',
          transition: ridotto ? 'none' : 'background 150ms',
        }}
      >
        <InfoIcon size={16} strokeWidth={2} aria-hidden />
      </button>
      <Dialog open={aperto} title={titolo} onClose={() => setAperto(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', whiteSpace: 'pre-wrap' }}>{testo}</p>
        <Button onClick={() => setAperto(false)}>{frasi.notCapito}</Button>
      </Dialog>
    </>
  )
}
