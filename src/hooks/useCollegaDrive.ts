import { useRef, useState } from 'react'
import { useToast } from '../components/layout/Toast'
import { useFrasi } from '../i18n/LinguaContext'
import { DriveAuth } from '../lib/driveAuth'
import { useSession } from './useSession'

export type EsitoCollega = 'collegato' | 'proposto' | 'no'

/**
 * Collegamento a Google Drive per il backup, condiviso da Impostazioni e tour.
 * `aggiornaDrive` è quello di `usePassiSalone` della pagina che lo usa.
 */
export function useCollegaDrive(aggiornaDrive: (email: string | null) => void) {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const frasi = useFrasi()
  const toast = useToast()
  // Account Google già usato all'accesso: si chiede conferma prima di usarlo per il backup.
  const [proposta, setProposta] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  function offline(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show(frasi.impConnessione, 'plain')
      return true
    }
    return false
  }

  async function occupato<T>(azione: () => Promise<T>, errore: (error: unknown) => T): Promise<T> {
    busyRef.current = true
    setBusy(true)
    try {
      return await azione()
    } catch (error) {
      return errore(error)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function erroreDrive(error: unknown) {
    if (error instanceof Error && error.message === 'telefono') toast.show(frasi.bakSoloTelefono, 'plain')
    else toast.show(frasi.bakCollegamentoKo, 'plain')
  }

  function riuscito(email: string | null | undefined) {
    setProposta(null)
    aggiornaDrive(email ?? frasi.bakDriveCollegato)
    toast.show(frasi.bakDriveCollegato, 'plain')
  }

  async function collega(): Promise<EsitoCollega> {
    if (!uid || busyRef.current) return 'no'
    if (offline()) return 'no'
    return occupato<EsitoCollega>(async () => {
      const account = await DriveAuth.collega({ uid })
      if (account.proposto && !account.collegato) {
        setProposta(account.email ?? '')
        return 'proposto'
      }
      if (!account.collegato) {
        toast.show(frasi.bakCollegamentoKo, 'plain')
        return 'no'
      }
      riuscito(account.email)
      return 'collegato'
    }, (error) => {
      if (!(error instanceof Error && error.message === 'annullato')) erroreDrive(error)
      return 'no'
    })
  }

  async function conferma(): Promise<boolean> {
    if (!uid || busyRef.current) return false
    return occupato(async () => {
      const account = await DriveAuth.conferma({ uid })
      if (!account.collegato) {
        toast.show(frasi.bakCollegamentoKo, 'plain')
        return false
      }
      riuscito(account.email)
      return true
    }, (error) => {
      erroreDrive(error)
      return false
    })
  }

  async function scollega(): Promise<boolean> {
    if (busyRef.current) return false
    if (offline()) return false
    return occupato(async () => {
      await DriveAuth.scollega()
      aggiornaDrive(null)
      setProposta(null)
      toast.show(frasi.bakScollegato, 'plain')
      return true
    }, (error) => {
      erroreDrive(error)
      return false
    })
  }

  return { busy, busyRef, proposta, annullaProposta: () => setProposta(null), collega, conferma, scollega }
}
