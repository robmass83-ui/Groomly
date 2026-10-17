import logoChiaro from '../../assets/brand/groomly-logo-animato.svg'
import logoScuro from '../../assets/brand/groomly-logo-animato-scuro.svg'
import { useSettings } from '../../hooks/useSettings'
import { prefersDark, resolveTheme } from '../../theme/theme'

export function AuthMark() {
  const { theme } = useSettings()
  const dark = resolveTheme(theme, prefersDark()) === 'dark'
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)', display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
      <img alt="Groomly" src={dark ? logoScuro : logoChiaro} width={148} style={{ display: 'block', height: 'auto' }} />
    </div>
  )
}
