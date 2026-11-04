import { FLAG_ICONS } from '../../assets/icons/icons'
import { frase } from '../../i18n/frase'

export function FlagIcon({ kind, size }: { kind: 'anziano' | 'mensile'; size: number }) {
  const icon = FLAG_ICONS[kind]
  return <img alt={frase(icon.label)} src={icon.src} width={size} height={size} />
}
