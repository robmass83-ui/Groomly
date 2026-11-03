import { useEffect, useState } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { leggiFiltroPersona, ricordaFiltroPersona } from '../lib/filtroPersona'
import { isSharedEmail, SHARED_SALON_ID } from '../lib/salonPath'
import { pickerMembers, type SalonAccess, type SalonMember } from '../lib/salonRoster'
import { useSession } from './useSession'

const NESSUNO: SalonAccess = { enabled: false, members: [], openInviteExpiries: [] }

/** Le persone del salone a cui si può assegnare una visita; `attivo` solo con il Salone acceso e almeno una persona. */
export function usePersoneSalone(): { persone: SalonMember[]; attivo: boolean; salonId: string; ownerUid: string } {
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const salonId = !account ? '' : (account.salonId || (isSharedEmail(account.email) ? SHARED_SALON_ID : account.uid))
  const ownerUid = account ? (account.salonId || account.uid) : ''
  const [access, setAccess] = useState<SalonAccess>(NESSUNO)

  useEffect(() => {
    if (!firebaseEnabled() || salonId === '') return
    let cancelled = false
    let stopAccess = () => {}
    void import('../data/firebase/client').then(async (mod) => {
      try {
        const stop = await mod.watchSalonAccess(salonId, (next) => {
          if (!cancelled) setAccess(next)
        })
        if (cancelled) stop()
        else stopAccess = stop
      } catch {
        if (!cancelled) setAccess(NESSUNO)
      }
    }).catch(() => {
      if (!cancelled) setAccess(NESSUNO)
    })
    return () => {
      cancelled = true
      stopAccess()
    }
  }, [salonId])

  const persone = pickerMembers(access)
  return { persone, attivo: persone.length > 0, salonId, ownerUid }
}

/** Persona scelta nel filtro di Calendario e Incassi: solo titolare e socio, solo col Salone attivo; una persona non più nel salone vale «Tutti». */
export function useFiltroPersona(): { persone: SalonMember[]; attivo: boolean; ownerUid: string; mostra: boolean; persona: string | null; scegli: (uid: string | null) => void } {
  const session = useSession()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const { persone, attivo, salonId, ownerUid } = usePersoneSalone()
  const [scelta, setScelta] = useState<{ salonId: string; uid: string | null } | null>(null)
  const mostra = attivo && ruolo !== 'collaboratore'
  const ricordata = scelta?.salonId === salonId ? scelta.uid : leggiFiltroPersona(salonId)
  const persona = mostra && ricordata !== null && persone.some((item) => item.uid === ricordata) ? ricordata : null
  function scegli(uid: string | null) {
    ricordaFiltroPersona(salonId, uid)
    setScelta({ salonId, uid })
  }
  return { persone, attivo, ownerUid, mostra, persona, scegli }
}
