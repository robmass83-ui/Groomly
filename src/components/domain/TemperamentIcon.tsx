import { TEMPERAMENT_ICONS } from '../../assets/icons/icons'
import { frase } from '../../i18n/frase'

export function TemperamentIcon({ kind, size }: { kind: keyof typeof TEMPERAMENT_ICONS; size: number }) {
  const icon = TEMPERAMENT_ICONS[kind]
  return <img alt={frase(icon.label)} src={icon.src} width={size} height={size} />
}
