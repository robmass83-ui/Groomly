import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { ensureServiceSeed } from '../data/local/services'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { activeServicesSubtitle } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import type { ThemeChoice } from '../theme/theme'

export function SettingsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const { settings, choose } = useSettings()
  const toast = useToast()
  const activeCount = uid ? ensureServiceSeed(uid).filter((service) => service.active).length : 0

  function onTheme(theme: ThemeChoice) {
    if (!choose(theme)) toast.show('Salvataggio non riuscito', 'plain')
  }

  return (
    <PhoneShell>
      <Header title="Impostazioni" backTo="/" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <SectionTitle>Aspetto</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Tema</span>
            <Segmented label="Tema" value={settings.theme} onChange={onTheme} options={[
              { value: 'light', label: 'Chiaro' },
              { value: 'dark', label: 'Scuro' },
              { value: 'auto', label: 'Auto' },
            ]} />
          </Row>
        </Card>
        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/servizi" style={{ display: 'flex', flex: 1, flexDirection: 'column', color: 'inherit', textDecoration: 'none' }}>
              <span>Servizi e durate</span>
              <small style={{ color: 'var(--tx3)' }}>{activeServicesSubtitle(activeCount)}</small>
            </Link>
          </Row>
        </Card>
        <p style={{ textAlign: 'center', color: 'var(--tx3)' }}>Groomly v1.0</p>
        <Button variant="ghost" onClick={() => session.logout()}>Esci</Button>
      </div>
    </PhoneShell>
  )
}
