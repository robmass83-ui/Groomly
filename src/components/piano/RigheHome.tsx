import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import { Card } from '../ui/Card'

// I testi vanno a capo su parole intere: a 320 px nome, data e stato restano leggibili, mai tagliati.
const aCapo = { minWidth: 0, overflowWrap: 'break-word' } as const

const tocco = {
  minHeight: 44,
  minWidth: 44,
  flex: 'none',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--pri-ink)',
  font: 'inherit',
  fontWeight: 650,
  padding: '0 8px',
  whiteSpace: 'nowrap',
} as const

function Scheda({ children }: { children: ReactNode }) {
  return (
    <Card data-scheda="riga-home" style={{ padding: `${SIZES.row.padY}px ${SIZES.row.padX}px` }}>
      {children}
    </Card>
  )
}

export function RigaPromemoria({
  nome,
  quando,
  inviato,
  onCestino,
  nota,
}: {
  nome: string
  quando: string
  inviato: boolean
  onCestino: (() => void) | null
  nota?: string
}) {
  const frasi = useFrasi()
  const parola = nota && nota !== '' ? nota : inviato ? frasi.rigaInviato : frasi.rigaDaInviare
  return (
    <Scheda>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...aCapo, ...USER_TEXT, flex: 1, fontWeight: 700 }}>{nome}</span>
            <span style={{ flex: 'none', fontSize: TYPE.meta, fontWeight: 650, color: 'var(--tx3)' }}>{frasi.codaPromemoria}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2, fontSize: TYPE.meta }}>
            {quando ? <span style={{ ...aCapo, color: 'var(--tx3)' }}>{quando}</span> : null}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 650, color: nota ? 'var(--bad)' : 'inherit' }}>
              {inviato && !nota ? (
                <Check size={14} strokeWidth={2} aria-label={parola} role="img" color="var(--ok)" />
              ) : (
                <span role="img" aria-label={parola} style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--bad)', flex: 'none' }} />
              )}
              <span style={aCapo}>{parola}</span>
            </span>
          </div>
        </div>
        {onCestino ? (
          <button type="button" onClick={onCestino} style={tocco}>{frasi.rigaCestino}</button>
        ) : null}
      </div>
    </Scheda>
  )
}

export function RigaAuguri({
  nome,
  onSi,
  onCestino,
  errore,
}: {
  nome: string
  onSi: () => void
  onCestino: () => void
  errore?: string
}) {
  const frasi = useFrasi()
  return (
    <Scheda>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...aCapo, ...USER_TEXT }}>{frasi.rigaAuguriDomanda.replace('{{cane}}', nome)}</span>
        {errore ? <span style={{ ...aCapo, fontSize: TYPE.meta, color: 'var(--bad)' }}>{errore}</span> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
          <button type="button" onClick={onSi} style={tocco}>{frasi.rigaSi}</button>
          <button type="button" onClick={onCestino} style={tocco}>{frasi.rigaCestino}</button>
        </div>
      </div>
    </Scheda>
  )
}

/** Una riga, senza pulsanti: il server ha già messo in agenda chi ha confermato. */
export function RigaConfermaAttesa({ testo: frase }: { testo: string }) {
  return (
    <Scheda>
      <span style={{ ...aCapo, ...USER_TEXT }}>{frase}</span>
    </Scheda>
  )
}
