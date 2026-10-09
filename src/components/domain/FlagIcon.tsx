import { FLAG_ICONS } from '../../assets/icons/icons'

export function FlagIcon({ kind, size }: { kind: 'anziano' | 'mensile'; size: number }) {
  const icon = FLAG_ICONS[kind]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
