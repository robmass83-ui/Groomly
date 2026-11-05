import { useState } from 'react'
import { useProfiloMetriche } from '../../hooks/useProfiloMetriche'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import { haDocumentiInVigore, puoRispondere } from '../../lib/metriche'
import { useToast } from '../layout/Toast'
import { Row } from '../ui/Card'
import { Toggle } from '../ui/Toggle'

export function StatisticheRiga() {
  const frasi = useFrasi()
  const toast = useToast()
  const session = useSession()
  const profilo = useProfiloMetriche()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const [scelta, setScelta] = useState<boolean | null>(null)
  if (!account || !profilo || !puoRispondere(profilo) || !haDocumentiInVigore(account.termini)) return null
  const acceso = scelta ?? account.consensoMetriche?.attivo === true

  async function cambia(valore: boolean) {
    if (!account) return
    setScelta(valore)
    try {
      const mod = await import('../../data/firebase/client')
      const consensoMetriche = await mod.callImpostaConsensoMetriche(valore, 'account')
      session.replaceAccount({ ...account, consensoMetriche })
    } catch {
      setScelta(!valore)
      toast.show(frasi.authSalvataggio, 'plain')
    }
  }

  return (
    <Row style={{ minHeight: 52 }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span>{frasi.statRiga}</span>
        <small style={{ color: 'var(--tx3)' }}>{frasi.metricheDettaglio}</small>
      </span>
      <Toggle checked={acceso} label={frasi.statRiga} onChange={(valore) => { void cambia(valore) }} />
    </Row>
  )
}
