import { ChevronRight, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { linkLegale } from '../lib/distribuzione'
import { apriEsterno } from '../lib/openDocument'
import { SIZES } from '../theme/sizes'
import { ShellFrame } from './ShellFrame'

const link = { display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 } as const

export function LegalePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const voci: { titolo: string; href: string; esterno?: boolean }[] = [
    { titolo: frasi.legPrivacy, href: linkLegale('privacy', lingua), esterno: true },
    { titolo: frasi.legTermini, href: linkLegale('termini', lingua), esterno: true },
    { titolo: frasi.legDpa, href: linkLegale('dpa', lingua), esterno: true },
    { titolo: frasi.legLicenze, href: '/impostazioni/licenze' },
    { titolo: frasi.impComeEliminare, href: linkLegale('elimina-account', lingua), esterno: true },
  ]
  return (
    <ShellFrame>
      <Header title={frasi.impLegale} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card>
          {voci.map((voce, index) => (
            <Row key={voce.titolo} style={{ borderTop: index === 0 ? 'none' : undefined, minHeight: 52 }}>
              {voce.esterno ? (
                <button type="button" onClick={() => { void apriEsterno(voce.href) }} style={{ ...link, border: 0, background: 'transparent', font: 'inherit', textAlign: 'left' }}>
                  <Scale size={14} strokeWidth={2} aria-hidden />
                  <span style={{ flex: 1 }}>{voce.titolo}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </button>
              ) : (
                <Link to={voce.href} style={link}>
                  <Scale size={14} strokeWidth={2} aria-hidden />
                  <span style={{ flex: 1 }}>{voce.titolo}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              )}
            </Row>
          ))}
        </Card>
      </div>
    </ShellFrame>
  )
}
