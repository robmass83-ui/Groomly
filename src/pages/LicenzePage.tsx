import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { LICENZE } from '../data/licenze'
import { useFrasi } from '../i18n/LinguaContext'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function LicenzePage() {
  const frasi = useFrasi()
  return (
    <ShellFrame>
      <Header title={frasi.legLicenze} backTo="/impostazioni/legale" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.legLicenzeTesto}</p>
        <Card>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {LICENZE.map((voce, index) => (
              <li
                key={`${voce.nome}@${voce.versione}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36, padding: '4px 12px', borderTop: index === 0 ? 'none' : '1px solid var(--line)', fontSize: TYPE.meta }}
              >
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{voce.nome} {voce.versione}</span>
                <small style={{ color: 'var(--tx3)', flex: 'none', maxWidth: '45%', textAlign: 'right' }}>{voce.licenza}</small>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </ShellFrame>
  )
}
