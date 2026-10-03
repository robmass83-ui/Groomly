import { TEMPERAMENT_ICONS } from '../../assets/icons/icons'

export function TemperamentIcon({ kind, size }: { kind: keyof typeof TEMPERAMENT_ICONS; size: number }) {
  const icon = TEMPERAMENT_ICONS[kind]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
