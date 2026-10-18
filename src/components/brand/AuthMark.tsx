import logoChiaro from '../../assets/brand/groomly-logo-animato.svg'
import logoScuro from '../../assets/brand/groomly-logo-animato-scuro.svg'
import { useSettings } from '../../hooks/useSettings'
import { prefersDark, resolveTheme } from '../../theme/theme'

export function AuthMark() {
  const { theme } = useSettings()
  const dark = resolveTheme(theme, prefersDark()) === 'dark'
  return (
    <div data-testid="auth-mark" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px', gap: 4 }}>
      <div data-testid="auth-mark-frame" style={{ width: 180, height: 104, overflow: 'hidden' }}>
        <img alt="Groomly" src={dark ? logoScuro : logoChiaro} width={180} style={{ display: 'block', height: 'auto' }} />
      </div>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1, color: 'var(--tx)' }}>Groomly</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tx3)' }}>toelettatura</p>
    </div>
  )
}
