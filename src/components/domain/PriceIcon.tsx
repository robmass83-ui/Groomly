import { PRICE_ICONS, type PriceIconKey } from '../../assets/icons/icons'

export function PriceIcon({ iconKey, size }: { iconKey: PriceIconKey; size: number }) {
  const icon = PRICE_ICONS[iconKey]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
