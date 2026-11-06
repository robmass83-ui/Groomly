import { useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import type { ConsensoMetriche } from '../../lib/versioneLegale'
import { SIZES } from '../../theme/sizes'
import { Button } from '../ui/Button'
import { AttesaZampe } from '../ui/Zampette'

export function DomandaStatistiche({ fonte, onFatto }: { fonte: Exclude<ConsensoMetriche['fonte'], 'account'>; onFatto: () => void }) {
  const session = useSession()
  const frasi = useFrasi()
  const [occupato, setOccupato] = useState(false)
  const account = session.gate.kind === 'in' ? session.gate.account : null

  async function rispondi(attivo: boolean) {
    if (occupato || !account) return
    setOccupato(true)
    try {
      const mod = await import('../../data/firebase/client')
      const consensoMetriche = await mod.callImpostaConsensoMetriche(attivo, fonte)
      session.replaceAccount({ ...account, consensoMetriche })
    } catch {
      // Senza risposta salvata la domanda torna al prossimo avvio: nel frattempo non si raccoglie nulla.
    }
    onFatto()
  }

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--tx)', padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SIZES.sectionGap }}>
      <AttesaZampe testo={occupato ? frasi.authSalvataggioPunti : null} />
      <h1 style={{ margin: 0, fontSize: 24 }}>{frasi.statTitolo}</h1>
      <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.statTesto}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button variant="secondary" onClick={() => { void rispondi(true) }} disabled={occupato}>{frasi.statSi}</Button>
        <Button variant="secondary" onClick={() => { void rispondi(false) }} disabled={occupato}>{frasi.statNo}</Button>
      </div>
    </main>
  )
}
