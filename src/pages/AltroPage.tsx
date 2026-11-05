import { ChevronRight, Lightbulb } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { VOCI_ALTRO, vociVisibili } from '../lib/vociAltro'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const riga: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minHeight: 68,
  padding: '10px 12px',
  color: 'inherit',
  textDecoration: 'none',
}

function Corpo({ icona, titolo, dettaglio }: { icona: ReactNode; titolo: string; dettaglio: string }) {
  return (
    <>
      {icona}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 650 }}>{titolo}</span>
        <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{dettaglio}</small>
      </span>
      <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
    </>
  )
}

export function AltroPage() {
  const frasi = useFrasi()
  const { gate } = useSession()
  const voci = vociVisibili(VOCI_ALTRO, gate.kind === 'in' ? gate.account.role : undefined)
  return (
    <ShellFrame>
      <Header title={frasi.navAltro} />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {voci.length > 0 ? (
          <Card>
            {voci.map((voce, index) => (
              <Link key={voce.to} to={voce.to} style={{ ...riga, borderTop: index === 0 ? undefined : '1px solid var(--line)' }}>
                <Corpo
                  icona={<IconTile tone="prim"><voce.icona size={20} strokeWidth={2} aria-hidden /></IconTile>}
                  titolo={frasi[voce.titolo]}
                  dettaglio={frasi[voce.dettaglio]}
                />
              </Link>
            ))}
          </Card>
        ) : null}
        <Card>
          <Link to="/impostazioni/suggerimenti" state={{ da: '/altro' }} style={riga}>
            <Corpo
              icona={<IconTile tone="warn"><Lightbulb size={20} strokeWidth={2} aria-hidden /></IconTile>}
              titolo={frasi.altroProponi}
              dettaglio={frasi.altroProponiDettaglio}
            />
          </Link>
        </Card>
      </div>
    </ShellFrame>
  )
}
