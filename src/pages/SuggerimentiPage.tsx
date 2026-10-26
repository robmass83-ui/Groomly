import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { useFrasi } from '../i18n/LinguaContext'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function SuggerimentiPage() {
  const frasi = useFrasi()
  return (
    <ShellFrame>
      <Header title={frasi.hubSuggerimenti} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card>
          <Row style={{ borderTop: 'none', alignItems: 'flex-start', minHeight: 52 }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 700 }}>{frasi.sugGuida}</span>
              <small style={{ color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.sugGuidaTesto}</small>
            </span>
          </Row>
        </Card>
        <Card>
          <Row style={{ borderTop: 'none', minHeight: 52 }}>
            {aggiornamentiApkAttivi() ? (
              <Link to="/impostazioni/aggiornamenti" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700 }}>{frasi.sugNovita}</span>
                  <small style={{ color: 'var(--tx3)' }}>{frasi.sugNovitaTesto}</small>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </Link>
            ) : (
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{frasi.sugNovita}</span>
                <small style={{ color: 'var(--tx3)' }}>{frasi.sugNovitaTesto}</small>
              </span>
            )}
          </Row>
          <Row style={{ minHeight: 52 }}>
            <Link to="/impostazioni/notifiche" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 }}>
              <span style={{ flex: 1 }}>{frasi.impNotifiche}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </Row>
        </Card>
      </div>
    </ShellFrame>
  )
}
