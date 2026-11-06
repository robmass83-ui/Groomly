import { useMemo } from 'react'
import { confrontoTanica, incassiMese, lavaggiRecenti, sottoStima, stimaProdotto, type Confronto, type Stima } from '../lib/stimeMagazzino'
import type { Prodotto } from '../lib/prodotti'
import { useAppointments } from './useAppointments'
import { useDogs } from './useDogs'
import { usePlus } from './usePlus'
import { useServices } from './useServices'

const NESSUNO: ReadonlySet<string> = new Set()

/** Con il piano spento non legge nulla: niente visite, niente stime. */
export function useStimeMagazzino(uid: string, prodotti: Prodotto[]): {
  accesso: boolean
  apri: () => void
  sotto: ReadonlySet<string>
  stima: (prodotto: Prodotto) => Stima | null
  confronto: (prodotto: Prodotto) => Confronto | null
  incassi: number
} {
  const { accesso, apri } = usePlus('stimeMagazzino')
  const dati = accesso ? uid : ''
  const { appointments } = useAppointments(dati)
  const { dogs } = useDogs(dati)
  const { services } = useServices(dati)
  const lavaggi = useMemo(() => lavaggiRecenti(appointments, dogs, services, new Date()), [appointments, dogs, services])
  const incassi = useMemo(() => incassiMese(appointments, new Date()), [appointments])
  return {
    accesso,
    apri,
    sotto: accesso ? sottoStima(prodotti, lavaggi) : NESSUNO,
    stima: (prodotto) => (accesso ? stimaProdotto(prodotto, lavaggi) : null),
    confronto: (prodotto) => (accesso ? confrontoTanica(prodotto, stimaProdotto(prodotto, lavaggi)) : null),
    incassi,
  }
}
