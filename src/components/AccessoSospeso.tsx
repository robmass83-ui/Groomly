import { useEffect, useState, type ReactElement } from 'react'
import { useLocalData } from '../hooks/useLocalData'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { accessoSospeso } from '../lib/accessoSospeso'
import type { SalonAccess } from '../lib/salonRoster'
import { Button } from './ui/Button'

export function StaffLock({ children }: { children: ReactElement }) {
  const session = useSession()
  const local = useLocalData()
  const { settings } = useSettings()
  const role = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const salonId = session.gate.kind === 'in' ? session.gate.account.salonId : ''
  const staff = role === 'collaboratore' || role === 'socio'
  const [access, setAccess] = useState<SalonAccess | null>(null)

  useEffect(() => {
    if (!staff || !salonId) return
    let stop = () => {}
    let alive = true
    void import('../data/firebase/client').then(async (mod) => {
      if (!alive) return
      stop = await mod.watchSalonAccess(salonId, (next) => {
        if (alive) setAccess(next)
      }, uid)
    })
    return () => {
      alive = false
      stop()
    }
  }, [staff, salonId, uid])

  if (!staff || local) return children
  if (!access) {
    return <p style={{ margin: 24, color: 'var(--tx2)' }}>Carico l'agenda…</p>
  }
  if (!accessoSospeso(role, access, uid)) return children
  const nome = settings.business.salonName.trim() || settings.business.name.trim() || 'salone'
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 24, background: 'var(--bg)', color: 'var(--tx)' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Il tuo accesso a {nome} è sospeso</p>
      <p style={{ margin: 0, color: 'var(--tx2)' }}>Il titolare ha spento il piano. I dati non sono persi.</p>
      <Button type="button" onClick={() => session.logout()}>Esci</Button>
    </div>
  )
}
