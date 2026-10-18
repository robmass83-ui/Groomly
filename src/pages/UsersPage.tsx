import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { listSalonDirectory } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { accountSummary, salonSummary, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { ShellFrame } from './ShellFrame'

export function UsersPage() {
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!operator) return
    let active = true
    void listSalonDirectory()
      .then((result) => {
        if (active) setDirectory(result)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [operator])

  if (!operator) return <Navigate to="/impostazioni" replace />

  return (
    <ShellFrame>
      <Header title="Utenti" backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {error ? <p style={{ margin: 0 }}>Connessione assente</p> : null}
        {!error && !directory ? <p style={{ margin: 0 }}>Caricamento…</p> : null}
        {directory ? (
          <>
            <Card style={{ padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, fontSize: 17, fontWeight: 700 }}>
              <div>{accountSummary(directory.accountCount)}</div>
              <div>{salonSummary(directory.salonCount)}</div>
            </Card>
            {directory.entries.length === 0 ? <p style={{ margin: 0 }}>Nessuna toelettatura</p> : null}
            {directory.entries.map((entry) => (
              <Card key={entry.uid}>
                <Row style={{ borderTop: 'none', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600 }}>{entry.ownerName}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{entry.salonName}</div>
                </Row>
              </Card>
            ))}
          </>
        ) : null}
      </div>
    </ShellFrame>
  )
}
