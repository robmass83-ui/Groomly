import { useSession } from './useSession'

/** Il ruolo di piattaforma: viene solo dal claim del token, mai dall'email. */
export function useRuolo(): { admin: boolean; caricato: boolean } {
  const session = useSession()
  return { admin: session.admin === true, caricato: session.ruoloCaricato === true }
}
