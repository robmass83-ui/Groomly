import { firebaseEnabled } from '../data/firebase/enabled'
import type { LocalAccount } from '../data/local/auth'

/** La domanda serve solo a chi non ha ancora risposto, e la risposta la registra il server. */
export function chiediPromo(account: LocalAccount | null): boolean {
  return firebaseEnabled() && account !== null && !account.emailPromo
}
