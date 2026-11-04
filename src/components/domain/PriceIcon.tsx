import { PRICE_ICONS, type PriceIconKey } from '../../assets/icons/icons'
import { frase } from '../../i18n/frase'

export function PriceIcon({ iconKey, size }: { iconKey: PriceIconKey; size: number }) {
  const icon = PRICE_ICONS[iconKey]
  return <img alt={frase(icon.label)} src={icon.src} width={size} height={size} />
}
