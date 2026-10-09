import { AVATAR_PLACEHOLDER } from '../../assets/icons/icons'
import { AVATAR_RADIUS, SIZES } from '../../theme/sizes'

const SIZE = { sm: SIZES.avatar.sm, md: SIZES.avatar.md, lg: SIZES.avatar.lg, xl: SIZES.avatar.xl, grid: SIZES.avatar.grid } as const

export function DogAvatar({ alt, src, size = 'md' }: { alt: string; src?: string; size?: keyof typeof SIZE }) {
  return <img alt={alt} src={src || AVATAR_PLACEHOLDER} width={SIZE[size]} height={SIZE[size]} style={{ borderRadius: AVATAR_RADIUS[size], objectFit: 'cover', background: 'var(--surf)' }} />
}
