import { haAccesso, vistaFunzione, type FeatureKey } from '../lib/piano'
import { usePiano } from './usePiano'

export function usePlus(feature: FeatureKey): { accesso: boolean; visibile: boolean; apri: () => void } {
  const piano = usePiano()
  const accesso = haAccesso(piano.stato, feature)
  return {
    accesso,
    visibile: accesso || vistaFunzione(feature) === 'badge',
    apri: () => piano.apriPaywall(feature),
  }
}
