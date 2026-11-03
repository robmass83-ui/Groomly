import { useMemo } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { nomePaese, PAESI, type CodicePaese } from '../../lib/paese'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Props = { valore: CodicePaese; onChange: (paese: CodicePaese) => void }

export function SelettorePaese({ valore, onChange }: Props) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const elenco = useMemo(() => {
    const voci = PAESI.filter((p) => p !== 'ALTRO').map((p) => ({ codice: p, nome: nomePaese(lingua, p) }))
    voci.sort((a, b) => a.nome.localeCompare(b.nome, lingua))
    return [...voci, { codice: 'ALTRO' as CodicePaese, nome: nomePaese(lingua, 'ALTRO') }]
  }, [lingua])
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0, fontSize: TYPE.base }}>
      <span style={{ fontSize: SIZES.field.label, fontWeight: 600, margin: 0, color: 'var(--tx2)' }}>{frasi.paese}</span>
      <select
        value={valore}
        onChange={(event) => onChange(event.target.value as CodicePaese)}
        style={{
          height: SIZES.field.h,
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: SIZES.field.radius,
          border: '1px solid var(--line)',
          background: 'var(--card)',
          color: 'var(--tx)',
          padding: '0 10px',
          font: 'inherit',
        }}
      >
        {elenco.map((voce) => (
          <option key={voce.codice} value={voce.codice}>{voce.nome}</option>
        ))}
      </select>
    </label>
  )
}
