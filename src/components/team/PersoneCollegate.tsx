import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { useFrasi } from '../../i18n/LinguaContext'
import { USER_TEXT } from '../../theme/text'
import { rosterLabel, type SalonMember } from '../../lib/salonRoster'
import { roleLabel } from '../../lib/salonAccess'
import { ConfermaRevoca } from './ConfermaRevoca'

/** Con il piano Salone spento: chi è ancora collegato al salone del titolare, da togliere. */
export function PersoneCollegate({ salonId }: { salonId: string }) {
  const frasi = useFrasi()
  const [membri, setMembri] = useState<SalonMember[]>([])
  const [daTogliere, setDaTogliere] = useState<SalonMember | null>(null)

  useEffect(() => {
    if (!salonId) return
    let alive = true
    let stop = () => {}
    void import('../../data/firebase/client')
      .then(async (mod) => {
        const fermo = await mod.watchSalonAccess(salonId, (next) => {
          if (!alive) return
          setMembri(next.elencoNegato === true ? [] : next.members.filter((m) => m.status === 'attivo' && (m.role === 'socio' || m.role === 'collaboratore')))
        })
        if (alive) stop = fermo
        else fermo()
      })
      .catch(() => undefined)
    return () => {
      alive = false
      stop()
    }
  }, [salonId])

  if (membri.length === 0) return null
  return (
    <>
      <Card>
        <h2 style={{ margin: 0, padding: '8px 12px 0', fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{frasi.teamCollegati}</h2>
        <p style={{ margin: 0, padding: '2px 12px 6px', color: 'var(--tx2)', fontSize: 13 }}>{frasi.teamCollegatiDettaglio}</p>
        {membri.map((membro) => (
          <div key={membro.uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 9px', borderTop: '1px solid var(--line)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere', ...USER_TEXT }}>{rosterLabel(membro)}</span>
              <span style={{ display: 'block', color: 'var(--tx2)', fontSize: 13 }}>{roleLabel(membro.role as 'socio' | 'collaboratore')}</span>
            </span>
            <button type="button" aria-label={frasi.teamTogliA.replace('{{nome}}', rosterLabel(membro))} onClick={() => setDaTogliere(membro)} style={{ height: 26, padding: 0, border: 0, background: 'transparent', color: 'var(--bad)', font: 'inherit', fontSize: 12, fontWeight: 650 }}>
              {frasi.teamTogli}
            </button>
          </div>
        ))}
      </Card>
      <ConfermaRevoca membro={daTogliere} onChiudi={() => setDaTogliere(null)} />
    </>
  )
}
