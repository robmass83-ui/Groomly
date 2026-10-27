import { useFrasi } from '../../i18n/LinguaContext'
import { Button } from '../ui/Button'

export function SegniFedelta({ timbri, onUsa }: { timbri: number; onUsa: () => void }) {
  const frasi = useFrasi()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden="true" style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 10 }, (_, indice) => {
          const pieno = indice < timbri
          return (
            <span
              key={indice}
              style={{
                width: 16,
                height: 16,
                boxSizing: 'border-box',
                borderRadius: 999,
                background: pieno ? 'var(--pri)' : 'transparent',
                border: pieno ? 'none' : '1px solid var(--line)',
              }}
            />
          )
        })}
      </div>
      <p style={{ margin: 0 }}>{frasi.segniSuDieci.replace('{{n}}', String(timbri))}</p>
      {timbri === 10 ? <Button onClick={onUsa}>{frasi.usaPremioOra}</Button> : null}
    </div>
  )
}
