import { usesOnlyCloudData } from '../lib/salonPath'
import { useSession } from './useSession'

/** Vero per l'account di Roberto dentro shared: i dati del telefono non entrano nel salone di Laura. */
export function useCloudOnlyData(uid: string): boolean {
  const { gate } = useSession()
  if (!uid || gate.kind !== 'in' || gate.account.uid !== uid) return false
  return usesOnlyCloudData(gate.account.email, gate.account.salonId)
}
