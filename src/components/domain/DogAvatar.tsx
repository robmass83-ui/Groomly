import { avatarForSpecies } from '../../assets/icons/icons'
import { useFileSrc } from '../../hooks/useFileSrc'
import { AVATAR_RADIUS, SIZES } from '../../theme/sizes'
import type { Species } from '../../types/models'

const SIZE = { sm: SIZES.avatar.sm, md: SIZES.avatar.md, lg: SIZES.avatar.lg, xl: SIZES.avatar.xl, grid: SIZES.avatar.grid } as const

export function DogAvatar({ alt, src, size = 'md', species, px }: { alt: string; src?: string; size?: keyof typeof SIZE; species?: Species; px?: number }) {
  const side = px ?? SIZE[size]
  const shown = useFileSrc(src, 'thumb')
  return <img alt={alt} src={shown || avatarForSpecies(species)} width={side} height={side} style={{ borderRadius: AVATAR_RADIUS[size], objectFit: 'cover', background: 'var(--surf)', ...(px === undefined ? null : { flexShrink: 0 }) }} />
}
