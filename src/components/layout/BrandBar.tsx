import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import { SIZES } from '../../theme/sizes'
import { useDocumentTheme } from '../../theme/useDocumentTheme'

export function BrandBar({ size = 'regular', as: Tag = 'div' }: { size?: 'regular' | 'large'; as?: 'div' | 'h1' }) {
  const dark = useDocumentTheme() === 'dark'
  const height = SIZES.brandBar[size]
  return (
    <Tag data-testid="brand-bar" style={{ margin: 0, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <img alt="Groomly" src={dark ? logoTestataScuro : logoTestata} height={height} style={{ display: 'block', height, width: 'auto', maxWidth: '100%' }} />
    </Tag>
  )
}
