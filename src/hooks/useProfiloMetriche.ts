import { Capacitor } from '@capacitor/core'
import { accountNonEliminabile } from '../lib/accountProtetto'
import type { ProfiloMetriche } from '../lib/metriche'
import { usePiano } from './usePiano'
import { useSession } from './useSession'

export function useProfiloMetriche(): ProfiloMetriche | null {
  const session = useSession()
  const piano = usePiano()
  if (session.gate.kind !== 'in') return null
  const { account } = session.gate
  const vip = piano.livelloNome === 'vip'
  return {
    nativo: Capacitor.isNativePlatform(),
    ...(account.role ? { role: account.role } : {}),
    admin: session.admin || account.admin === true,
    protetto: accountNonEliminabile({ email: account.email, salonId: account.salonId, uid: account.uid, vip }),
    vip,
    email: account.email,
  }
}
