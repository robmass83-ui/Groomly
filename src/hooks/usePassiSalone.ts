import { useCallback, useEffect, useRef, useState } from 'react'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { backupImpostato } from '../lib/backupImpostato'
import { passiCompletamento, type PassoSalone } from '../lib/completaSalone'
import { DriveAuth } from '../lib/driveAuth'
import { orariCompilati } from '../lib/orari'
import { fiscalNoticeVisible } from '../lib/profile'
import { useFrasi } from '../i18n/LinguaContext'
import { useServices } from './useServices'
import { useSession } from './useSession'
import { useSettings } from './useSettings'

export interface PassoSaloneStato {
  id: PassoSalone
  fatto: boolean
}

/** I passi per preparare il salone e se sono già fatti: lo usano le Impostazioni e il tour. */
export function usePassiSalone(): {
  passi: PassoSaloneStato[]
  pronto: boolean
  driveEmail: string | null
  aggiornaDrive: (email: string | null) => void
} {
  const session = useSession()
  const frasi = useFrasi()
  const { settings, ready } = useSettings()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const { services } = useServices(uid ?? '')
  const [driveEmail, setDriveEmail] = useState<string | null>(null)
  const driveLettura = useRef(0)

  useEffect(() => {
    if (!uid) return
    const id = ++driveLettura.current
    void (async () => {
      try {
        const account = await DriveAuth.leggi({ uid })
        if (driveLettura.current === id) {
          setDriveEmail(account.collegato ? account.email ?? frasi.bakDriveCollegato : null)
        }
      } catch {
        if (driveLettura.current === id) setDriveEmail(null)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  // Un collegamento o scollegamento fatto a mano vale più di una lettura ancora in corso.
  const aggiornaDrive = useCallback((email: string | null) => {
    driveLettura.current += 1
    setDriveEmail(email)
  }, [])

  const activeCount = uid ? services.filter((service) => service.active).length : 0
  // Online l'elenco servizi arriva dal cloud: finché è vuoto non si sa se mancano o non sono ancora arrivati.
  const serviziCaricati = !firebaseEnabled() || readsLocal() || services.length > 0

  const passi = passiCompletamento({
    logo: Boolean(settings.priceSheet?.intestazione.logo),
    indirizzo: settings.business.address.trim().length > 0,
    orari: orariCompilati(settings.orari),
    listino: activeCount > 0,
    backup: backupImpostato(settings) || Boolean(driveEmail),
    email: session.emailVerified,
    fiscale: !fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode),
  })

  return { passi, pronto: ready && serviziCaricati, driveEmail, aggiornaDrive }
}
