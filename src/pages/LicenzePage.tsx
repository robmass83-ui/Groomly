import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { useFrasi } from '../i18n/LinguaContext'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const VOCI = [
  { nome: 'React', licenza: 'MIT', href: 'https://github.com/facebook/react' },
  { nome: 'Capacitor', licenza: 'MIT', href: 'https://github.com/ionic-team/capacitor' },
  { nome: 'Firebase', licenza: 'Apache-2.0', href: 'https://github.com/firebase/firebase-js-sdk' },
  { nome: 'Lucide', licenza: 'ISC', href: 'https://github.com/lucide-icons/lucide' },
] as const

export function LicenzePage() {
  const frasi = useFrasi()
  return (
    <ShellFrame>
      <Header title={frasi.legLicenze} backTo="/impostazioni/legale" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.legLicenzeTesto}</p>
        <Card>
          {VOCI.map((voce, index) => (
            <Row key={voce.nome} style={{ borderTop: index === 0 ? 'none' : undefined, minHeight: 52 }}>
              <a href={voce.href} style={{ flex: 1, color: 'inherit', textDecoration: 'none', minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontWeight: 650 }}>{voce.nome}</span>
                <small style={{ color: 'var(--tx3)' }}>{voce.licenza}</small>
              </a>
            </Row>
          ))}
        </Card>
      </div>
    </ShellFrame>
  )
}
