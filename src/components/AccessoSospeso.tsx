import { useEffect, useRef, useState, type ReactElement } from 'react'
import { AttesaRiga } from './ui/Zampette'
import { useLocalData } from '../hooks/useLocalData'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import { accessoSospeso } from '../lib/accessoSospeso'
import type { SalonAccess } from '../lib/salonRoster'
import { Button } from './ui/Button'

export function StaffLock({ children }: { children: ReactElement }) {
  const frasi = useFrasi()
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

  const sospeso = accessoSospeso(role, access, uid)
  const tolto = !!access && !access.members.some((member) => member.uid === uid && member.status === 'attivo')
  const [rilettura, setRilettura] = useState<'no' | 'in corso' | 'finita'>('no')
  const riletto = useRef('')

  useEffect(() => {
    if (!staff || local || !salonId || !tolto || riletto.current === salonId) return
    riletto.current = salonId
    setRilettura('in corso')
    void import('../data/firebase/client')
      .then((mod) => mod.reloadSignedInAccount())
      .then((account) => {
        if (account && account.salonId !== salonId) {
          void import('../data/local/cambioSalone').then((m) => m.dopoCambioSalone(uid))
          return
        }
        setRilettura('finita')
      })
      .catch(() => setRilettura('finita'))
  }, [staff, local, salonId, uid, tolto])

  if (!staff || local) return children
  if (!access || rilettura === 'in corso' || (tolto && riletto.current !== salonId)) {
    return <AttesaRiga testo={frasi.homeCaricoAgenda} style={{ margin: 24 }} />
  }
  if (!sospeso) return children
  const nome = settings.business.salonName.trim() || settings.business.name.trim()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 24, background: 'var(--bg)', color: 'var(--tx)' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{nome ? frasi.sospesoTitolo.replace('{{nome}}', nome) : frasi.sospesoTitoloSalone}</p>
      <p style={{ margin: 0, color: 'var(--tx2)' }}>{frasi.sospesoDettaglio}</p>
      <Button type="button" onClick={() => session.logout()}>{frasi.authEsci}</Button>
    </div>
  )
}
