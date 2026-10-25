import { Scissors } from 'lucide-react'
import { SERVICE_ICONS } from '../../assets/icons/icons'
import { useFrasi } from '../../i18n/LinguaContext'
import type { ServiceIconKey } from '../../types/models'

export function ServiceIcon({ iconKey, size }: { iconKey?: ServiceIconKey; size: number }) {
  const frasi = useFrasi()
  if (!iconKey) return <Scissors data-testid="service-fallback" role="img" aria-label={frasi.lisServizio} size={size} strokeWidth={2} color="var(--tx3)" />
  const icon = SERVICE_ICONS[iconKey]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
