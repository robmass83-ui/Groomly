import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import logoPlus from '../../assets/brand/groomly-plus-logo-orizzontale.svg'
import logoPlusScuro from '../../assets/brand/groomly-plus-logo-scuro.svg'
import logoSalone from '../../assets/brand/groomly-salon-logo-orizzontale.svg'
import logoSaloneScuro from '../../assets/brand/groomly-salon-logo-scuro.svg'
import logoVip from '../../assets/brand/groomly-vip-logo-orizzontale.svg'
import logoVipScuro from '../../assets/brand/groomly-vip-logo-scuro.svg'
import { usePiano } from '../../hooks/usePiano'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { SIZES } from '../../theme/sizes'
import { useDocumentTheme } from '../../theme/useDocumentTheme'

const LOGHI: Record<LivelloElenco, { chiaro: string; scuro: string }> = {
  base: { chiaro: logoTestata, scuro: logoTestataScuro },
  pro: { chiaro: logoPlus, scuro: logoPlusScuro },
  salone: { chiaro: logoSalone, scuro: logoSaloneScuro },
  vip: { chiaro: logoVip, scuro: logoVipScuro },
}

export function logoTestataPer(livello: LivelloElenco | undefined, scuro: boolean): string {
  const loghi = LOGHI[livello ?? 'base']
  return scuro ? loghi.scuro : loghi.chiaro
}

export function BrandBar({ as: Tag = 'div' }: { as?: 'div' | 'h1' }) {
  const dark = useDocumentTheme() === 'dark'
  const { livelloNome } = usePiano()
  const height = SIZES.brandBar.height
  return (
    <Tag data-testid="brand-bar" style={{ margin: 0, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <img alt="Groomly" src={logoTestataPer(livelloNome, dark)} height={height} style={{ display: 'block', height, width: 'auto', maxWidth: '100%' }} />
    </Tag>
  )
}
