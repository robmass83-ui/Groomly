import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useBeta } from '../components/beta/BetaProvider'
import type { AvvisoSistema } from '../lib/avvisiSistema'
import { useAvvisiSistema } from './useAvvisiSistema'
import { useSession } from './useSession'

export interface AvvisiDaLeggere {
  n: number
  /** Il più recente di Groomly ancora da leggere; quelli della beta contano solo nel numero. */
  ultimo: AvvisoSistema | null
}

const NESSUNO: AvvisiDaLeggere = { n: 0, ultimo: null }
const AvvisiDaLeggereContext = createContext<AvvisiDaLeggere>(NESSUNO)

export function useAvvisiDaLeggere(): AvvisiDaLeggere {
  return useContext(AvvisiDaLeggereContext)
}

// Un solo ascolto per tutta l'app: il pallino in testata sta su ogni pagina e ogni pagina ha la sua ShellFrame.
export function AvvisiDaLeggereProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { avvisi, lettiFino, pronti } = useAvvisiSistema(uid)
  const beta = useBeta().nonLetti
  const valore = useMemo<AvvisiDaLeggere>(() => {
    // Prima del segno di lettura sembrerebbero tutti nuovi: il pallino non deve lampeggiare.
    const nuovi = pronti ? avvisi.filter((avviso) => avviso.creato > lettiFino).sort((a, b) => b.creato - a.creato) : []
    return { n: nuovi.length + beta, ultimo: nuovi[0] ?? null }
  }, [avvisi, lettiFino, pronti, beta])
  return <AvvisiDaLeggereContext.Provider value={valore}>{children}</AvvisiDaLeggereContext.Provider>
}
